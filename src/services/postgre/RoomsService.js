import { nanoid } from 'nanoid';
import { InvariantError } from '../../exceptions/InvariantError.js';
import { NotFoundError } from '../../exceptions/NotFoundError.js';
import { mapDBToModel } from '../../utils/index.js';
import logger from '../../utils/logger.js';

export class RoomsService {
  constructor(pool, cacheService) {
    this._pool = pool;
    this._pool = cacheService;
  }

  async addRoom({ userId, roomType, pricePerNightNum, capacityNum, totalRoomsNum, description }) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      const now = new Date().toISOString();

      const checkQuery = await client.query(
        'SELECT id FROM rooms WHERE room_type = $1',
        [roomType]
      );

      if (checkQuery.rows.length) {
        logger.warn(`[addRoom] Room type already exists: ${roomType}`);
        throw new InvariantError(`Tipe kamar '${roomType}' sudah ada`);
      }

      const roomId = `room-${nanoid(16)}`;
      const insertQuery = {
        text: `INSERT INTO rooms 
          (id, room_type, price_per_night, capacity, total_rooms, description, created_at, updated_at, is_active, is_complete)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id`,
        values: [roomId, roomType, pricePerNightNum, capacityNum, totalRoomsNum, description, now, now, true, false],
      };

      const result = await client.query(insertQuery);
      if (!result.rows.length) {
        logger.error('[addRoom] Failed to insert room');
        throw new InvariantError('Gagal menambahkan kamar');
      }

      const queryLog = await client.query(
        `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [`log-${nanoid(16)}`, userId, 'add room', 'rooms', roomId, now]
      );

      if (!queryLog.rows.length) {
        logger.warn('[addRoom] Failed to insert log');
        throw new InvariantError('Log gagal dicatat');
      }

      await client.query('COMMIT');
      await this._cacheService.delete('rooms:all');

      logger.info(`[addRoom] Room added successfully: ${roomId}`);
      return { id: roomId };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[addRoom] Error: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async getRooms({ roomType, minPrice, maxPrice, capacity }, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      const conditions = [];
      const values = [];

      if (roomType) {
        conditions.push(`room_type ILIKE $${values.length + 1}`);
        values.push(`%${roomType}%`);
      }
      if (minPrice !== undefined) {
        conditions.push(`price_per_night >= $${values.length + 1}`);
        values.push(minPrice);
      }
      if (maxPrice !== undefined) {
        conditions.push(`price_per_night <= $${values.length + 1}`);
        values.push(maxPrice);
      }
      if (capacity !== undefined) {
        conditions.push(`capacity >= $${values.length + 1}`);
        values.push(capacity);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const cacheKey = `rooms:${JSON.stringify({ roomType, minPrice, maxPrice, capacity, page, limit })}`;

      try {
        const cacheResult = await this._cacheService.get(cacheKey);
        logger.info('[getRooms] Cache hit');
        return { source: 'cache', ...JSON.parse(cacheResult) };
      } catch {
        logger.info('[getRooms] Cache miss, querying DB');
      }

      const query = {
        text: `
          SELECT 
            rooms.id,
            rooms.room_type,
            rooms.price_per_night,
            rooms.capacity,
            rooms.total_rooms,
            rooms.description,
            rooms.created_at,
            rooms.updated_at,
            room_pictures.path AS primary_picture
          FROM rooms
          LEFT JOIN room_pictures
            ON room_pictures.room_id = rooms.id AND room_pictures.is_primary = TRUE
          ${whereClause}
          LIMIT $${values.length + 1} OFFSET $${values.length + 2}
        `,
        values: [...values, limit, offset],
      };

      const result = await this._pool.query(query);
      const resultMap = result.rows.map(mapDBToModel.roomsTable);

      const countQuery = { text: `SELECT COUNT(*) FROM rooms ${whereClause}`, values };
      const countResult = await this._pool.query(countQuery);
      const totalItems = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      const responseData = { data: resultMap, page, limit, totalItems, totalPages };
      await this._cacheService.set(cacheKey, JSON.stringify(responseData), 1800);

      logger.info('[getRooms] Data fetched from DB');
      return { source: 'db', ...responseData };
    } catch (error) {
      logger.error(`[getRooms] Error: ${error.message}`);
      throw new Error('Gagal mengambil daftar kamar');
    }
  }

  async getRoomById({ roomId }) {
    try {
      const cacheKey = `room:${roomId}`;

      try {
        const cacheResult = await this._cacheService.get(cacheKey);
        logger.info(`[getRoomById] Cache hit roomId=${roomId}`);
        return { source: "cache", ...JSON.parse(cacheResult) };
      } catch {
        logger.info(`[getRoomById] Cache miss roomId=${roomId}`);
      }

      const query = { text: `SELECT id, room_type, price_per_night, capacity, total_rooms, description, created_at, updated_at FROM rooms WHERE id = $1`, values: [roomId] };
      const result = await this._pool.query(query);
      const resultMap = result.rows.map(mapDBToModel.roomsTable);

      if (!resultMap.length) {
        logger.warn(`[getRoomById] Room not found roomId=${roomId}`);
        throw new NotFoundError("Kamar tidak ditemukan");
      }

      const room = resultMap[0];
      const queryPic = { text: `SELECT id, room_id, path, created_at, updated_at FROM room_pictures WHERE room_id = $1 ORDER BY created_at ASC`, values: [roomId] };
      const resultPic = await this._pool.query(queryPic);
      const resultPicMap = resultPic.rows.map(mapDBToModel.roomPicturesTable);

      if (!resultPicMap.length) {
        logger.warn(`[getRoomById] Pictures not found roomId=${roomId}`);
        throw new InvariantError("Foto tidak ditemukan");
      }

      room.pictures = resultPicMap;
      await this._cacheService.set(cacheKey, JSON.stringify(room), 1800);

      logger.info(`[getRoomById] Room fetched successfully roomId=${roomId}`);
      return { source: "db", ...room };
    } catch (error) {
      logger.error(`[getRoomById] Error roomId=${roomId}: ${error.message}`);
      throw error;
    }
  }

  async editRoom({ targetId, roomType, pricePerNightNum, capacityNum, totalRoomsNum, description }) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      const now = new Date().toISOString();

      const query = {
        text: `UPDATE rooms
              SET room_type = $1,
                  price_per_night = $2,
                  capacity = $3,
                  total_rooms = $4,
                  description = $5,
                  updated_at = $6
              WHERE id = $7
              RETURNING id`,
        values: [roomType, pricePerNightNum, capacityNum, totalRoomsNum, description, now, targetId],
      };

      const result = await client.query(query);
      if (!result.rows.length) {
        logger.warn(`[editRoom] Room not found or update failed roomId=${targetId}`);
        throw new NotFoundError('Kamar tidak ditemukan atau gagal diperbarui');
      }

      await client.query('COMMIT');
      await this._cacheService.deletePrefix("rooms:");
      await this._cacheService.delete(`room:${targetId}`);

      logger.info(`[editRoom] Room updated successfully roomId=${targetId}`);
      return { roomId: result.rows[0].id };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[editRoom] Error roomId=${targetId}: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteRoom({ roomId }) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      const now = new Date().toISOString();

      const query = {
        text: `UPDATE rooms SET is_active = FALSE, updated_at = $1 WHERE id = $2 AND is_active = TRUE RETURNING id`,
        values: [now, roomId],
      };

      const result = await client.query(query);
      if (!result.rows.length) {
        logger.warn(`[deleteRoom] Room not found or already inactive roomId=${roomId}`);
        throw new NotFoundError('Kamar tidak ditemukan atau sudah dihapus');
      }

      await client.query('COMMIT');
      await this._cacheService.deletePrefix("rooms:");
      await this._cacheService.delete(`room:${roomId}`);

      logger.info(`[deleteRoom] Room deleted successfully roomId=${roomId}`);
      return { roomId: result.rows[0].id };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[deleteRoom] Error roomId=${roomId}: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }
}
