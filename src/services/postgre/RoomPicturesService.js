import { nanoid } from 'nanoid';
import { InvariantError } from '../../exceptions/InvariantError.js';
import { NotFoundError } from '../../exceptions/NotFoundError.js';
import logger from '../../utils/logger.js';

export class RoomPicturesService {
  constructor(pool) {
    this._pool = pool;
  }

  // 1. Tambah foto kamar
  async addPicture({ roomId, path, isPrimary = false }) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');

      const picId = `pic-${nanoid(16)}`;
      const now = new Date().toISOString();

      // jika is_primary = true, unset primary lama
      if (isPrimary) {
        await client.query(
          'UPDATE room_pictures SET is_primary = FALSE WHERE room_id = $1',
          [roomId]
        );
      }

      // insert foto baru
      const query = {
        text: `INSERT INTO room_pictures
          (id, room_id, path, is_primary, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6)
          RETURNING id`,
        values: [picId, roomId, path, isPrimary, now, now],
      };
      const result = await client.query(query);
      if (!result.rows.length) {
        logger.warn(`[addPicture] Gagal menambahkan foto roomId=${roomId}`);
        throw new InvariantError('Gagal menambahkan foto');
      }

      // update is_complete di rooms
      await client.query(
        'UPDATE rooms SET is_complete = TRUE, updated_at = $1 WHERE id = $2',
        [now, roomId]
      );

      await client.query('COMMIT');
      logger.info(`[addPicture] Foto berhasil ditambahkan roomId=${roomId}, pictureId=${result.rows[0].id}`);
      return { pictureId: result.rows[0].id };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[addPicture] Error menambahkan foto roomId=${roomId}: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  // 2. Ambil semua foto kamar
  async getPictures({ roomId }) {
    try {
      const result = await this._pool.query(
        `SELECT id, path, is_primary, created_at, updated_at
         FROM room_pictures
         WHERE room_id = $1
         ORDER BY created_at ASC`,
        [roomId]
      );

      logger.info(`[getPictures] Mengambil ${result.rows.length} foto untuk roomId=${roomId}`);
      return result.rows;
    } catch (error) {
      logger.error(`[getPictures] Error mengambil foto roomId=${roomId}: ${error.message}`);
      throw error;
    }
  }

  // 3. Hapus foto kamar
  async deletePicture({ pictureId }) {
    try {
      const result = await this._pool.query(
        'DELETE FROM room_pictures WHERE id = $1 RETURNING id',
        [pictureId]
      );

      if (!result.rows.length) {
        logger.warn(`[deletePicture] Foto tidak ditemukan pictureId=${pictureId}`);
        throw new NotFoundError('Foto tidak ditemukan atau gagal dihapus');
      }

      logger.info(`[deletePicture] Foto berhasil dihapus pictureId=${pictureId}`);
      return { id: result.rows[0].id };
    } catch (error) {
      logger.error(`[deletePicture] Error menghapus foto pictureId=${pictureId}: ${error.message}`);
      throw error;
    }
  }

  async deleteAllPictures({ roomId }) {
    try {
      const result = await this._pool.query(
        'DELETE FROM room_pictures WHERE room_id = $1 RETURNING id',
        [roomId]
      );

      if (!result.rows.length) {
        logger.warn(`[deleteAllPictures] Tidak ada foto ditemukan untuk roomId=${roomId}`);
        throw new NotFoundError('Tidak ada foto ditemukan untuk kamar ini');
      }

      logger.info(`[deleteAllPictures] Menghapus semua foto roomId=${roomId}, total=${result.rows.length}`);
      return { ids: result.rows.map((row) => row.id) };
    } catch (error) {
      logger.error(`[deleteAllPictures] Error menghapus foto roomId=${roomId}: ${error.message}`);
      throw error;
    }
  }

  // 4. Set primary picture
  async setPrimaryPicture({ pictureId }) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');

      const picResult = await client.query(
        'SELECT room_id FROM room_pictures WHERE id = $1',
        [pictureId]
      );
      if (!picResult.rows.length) {
        logger.warn(`[setPrimaryPicture] Foto tidak ditemukan pictureId=${pictureId}`);
        throw new NotFoundError('Foto tidak ditemukan');
      }

      const roomId = picResult.rows[0].room_id;

      // unset primary lama
      await client.query(
        'UPDATE room_pictures SET is_primary = FALSE WHERE room_id = $1',
        [roomId]
      );

      // set foto baru
      const now = new Date().toISOString();
      const updateResult = await client.query(
        'UPDATE room_pictures SET is_primary = $1, updated_at = $2 WHERE id = $3 RETURNING id',
        [true, now, pictureId]
      );

      if (!updateResult.rows.length) {
        logger.warn(`[setPrimaryPicture] Gagal set foto primary pictureId=${pictureId}`);
        throw new InvariantError('Gagal set foto primary');
      }

      await client.query('COMMIT');
      logger.info(`[setPrimaryPicture] Foto berhasil dijadikan primary pictureId=${pictureId}, roomId=${roomId}`);
      return { pictureId: updateResult.rows[0].id };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[setPrimaryPicture] Error set primary pictureId=${pictureId}: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }
}
