import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { InvariantError } from '../../exceptions/InvariantError.js';
import { AuthenticationError } from '../../exceptions/AuthenticationError.js';
import { AuthorizationError } from '../../exceptions/AuthorizationError.js';
import { NotFoundError } from '../../exceptions/NotFoundError.js';
import { logger } from '../../utils/logger.js';

export class UsersService {
  constructor(pool, cacheService) {
    this._pool = pool;
    this._cacheService = cacheService
  }

  async addUserService({ fullname, email, contactNumber, password }) {
    const userId = `user-${nanoid(16)}`;
    const activeLogId = `log-${nanoid(16)}`;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const client = await this._pool.connect();
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      await client.query('BEGIN');

      const query = {
        text: `
          INSERT INTO users (id, fullname, email, contact_number, password_hash, created_at, updated_at, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `,
        values: [userId, fullname, email, contactNumber, passwordHash, createdAt, updatedAt, true],
      };

      const result = await client.query(query);
      if (!result.rows.length) {
        throw new InvariantError('Gagal menambahkan data pengguna');
      }

      const targetId = result.rows[0].id;

      const activeLogsQuery = {
        text: `
          INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `,
        values: [activeLogId, targetId, 'create', 'users', targetId, createdAt],
      };

      const resultOfActiveLogQuery = await client.query(activeLogsQuery);
      if (!resultOfActiveLogQuery.rows.length) {
        throw new InvariantError('Gagal mencatat log aktivitas');
      }

      await client.query('COMMIT');

      // Hapus cache semua users karena ada data baru
      await this._cacheService.deletePrefix('users:all');

      return { id: targetId, logId: resultOfActiveLogQuery.rows[0].id };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllUsers(page = 1, limit = 10) {
    const cacheKey = `users:all:page=${page}&limit=${limit}`;
    try {
      const cached = await this._cacheService.get(cacheKey);
      logger.info(`[getAllUsers] Cache hit for key: ${cacheKey}`);
      return JSON.parse(cached);
    } catch {
      logger.info(`[getAllUsers] Cache miss for key: ${cacheKey}`);
    }

    try {
      const offset = (page - 1) * limit;
      const conditions = ['is_active = true'];
      const values = [];
      const paramCount = values.length;

      values.push(limit);
      values.push(offset);

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = {
        text: `
          SELECT id, fullname, email, contact_number
          FROM users
          ${whereClause}
          ORDER BY fullname ASC
          LIMIT $${paramCount + 1}
          OFFSET $${paramCount + 2}
        `,
        values,
      };

      const result = await this._pool.query(query);
      const data = result.rows;

      const countQuery = {
        text: `SELECT COUNT(*) FROM users ${whereClause}`,
        values: values.slice(0, paramCount),
      };
      const countResult = await this._pool.query(countQuery);
      const totalItems = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      const responseData = { data, page, limit, totalItems, totalPages };

      // simpan ke cache
      await this._cacheService.set(cacheKey, JSON.stringify(responseData), 1800); // 30 menit
      logger.info(`[getAllUsers] Cache set for key: ${cacheKey}`);

      return responseData;
    } catch (error) {
      throw new Error('Gagal mengambil data pengguna');
    }
  }

  async getUserbyId({ targetId }) {
    const cacheKey = `users:id:${targetId}`;
    try {
      const cached = await this._cacheService.get(cacheKey);
      logger.info(`[getUserbyId] Cache hit for key: ${cacheKey}`);
      return JSON.parse(cached);
    } catch {
      logger.info(`[getUserbyId] Cache miss for key: ${cacheKey}`);
    }

    try {
      const query = {
        text: `SELECT id, fullname, email, contact_number as "contactNumber", role, last_login, created_at, updated_at
               FROM users WHERE id = $1`,
        values: [targetId],
      };

      const result = await this._pool.query(query);
      if (!result.rows.length) {
        throw new NotFoundError('User tidak ditemukan');
      }

      const user = result.rows[0];
      await this._cacheService.set(cacheKey, JSON.stringify(user), 1800);
      return user;
    } catch (error) {
      throw new Error('Gagal mengambil data pengguna');
    }
  }

  async editUser({ targetId, userId, fullname, email, contactNumber, password }) {
    const activeLogId = `log-${nanoid(16)}`;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const client = await this._pool.connect();
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      await client.query('BEGIN');

      const query = {
        text: 'UPDATE users SET fullname = $1, email = $2, contact_number = $3, password_hash = $4, updated_at = $5 WHERE id = $6 RETURNING id',
        values: [fullname, email, contactNumber, passwordHash, updatedAt, targetId],
      };

      const result = await client.query(query);
      if (!result.rows.length) throw new InvariantError('Data tidak ditemukan. Gagal untuk mengedit');

      const resultTargetId = result.rows[0].id;
      const activeLogsQuery = {
        text: `
          INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `,
        values: [activeLogId, userId, 'edit', 'users', resultTargetId, createdAt],
      };

      const resultOfLogQuery = await client.query(activeLogsQuery);
      if (!resultOfLogQuery.rows.length) throw new InvariantError('Gagal mencatat log aktivitas');

      await client.query('COMMIT');

      // Hapus cache user ini dan daftar semua users
      await this._cacheService.delete(`users:id:${targetId}`);
      await this._cacheService.deletePrefix('users:all');

      return { id: resultTargetId, logId: resultOfLogQuery.rows[0].id };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error('Gagal mengedit data pengguna');
    } finally {
      client.release();
    }
  }

  async deleteUser({ userId, targetId }) {
    const activeLogId = `log-${nanoid(16)}`;
    const now = new Date().toISOString();
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');

      const query = {
        text: `UPDATE users
               SET is_active = FALSE, updated_at = $1
               WHERE id = $2 AND is_active = TRUE
               RETURNING id`,
        values: [now, targetId],
      };

      const result = await client.query(query);
      if (!result.rows.length) throw new InvariantError('Data tidak ditemukan atau sudah dihapus');

      const resultTargetId = result.rows[0].id;
      const activeLogsQuery = {
        text: `
          INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `,
        values: [activeLogId, userId, 'soft-delete', 'users', resultTargetId, now],
      };

      const resultOfLogQuery = await client.query(activeLogsQuery);
      if (!resultOfLogQuery.rows.length) throw new InvariantError('Gagal mencatat log aktivitas');

      await client.query('COMMIT');

      // Hapus cache user ini dan daftar semua users
      await this._cacheService.delete(`users:id:${targetId}`);
      await this._cacheService.deletePrefix('users:all');

      return { id: resultTargetId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error('Gagal menghapus data pengguna');
    } finally {
      client.release();
    }
  }

  async verifyUserCredential({ email, password }) {
    try {
      const query = {
        text: 'SELECT id, password_hash FROM users WHERE email = $1',
        values: [email],
      };
      
      const result = await this._pool.query(query);
      if (!result.rows.length) {
        logger.warn(`[verifyUserCredential] Invalid credentials email=${email}`);
        throw new AuthenticationError('Kredensial yang anda berikan salah');
      }

      const { id, password_hash: hashedPassword } = result.rows[0];
      const match = await bcrypt.compare(password, hashedPassword);
    
      if (!match) {
        logger.warn(`[verifyUserCredential] Invalid credentials email=${email}`);
        throw new AuthenticationError('Kredensial yang anda berikan salah');
      }

      await this.updateLastLogin(id);
      logger.info(`[verifyUserCredential] User logged in successfully id=${id} email=${email}`);
      return id;
    } catch (error) {
      logger.error(`[verifyUserCredential] Error verifying credentials email=${email}: ${error.message}`);
      throw error;
    }
  }

  async updateLastLogin(userId) {
    try {
      const now = new Date().toISOString();
      const query = { text: 'UPDATE users SET last_login = $1 WHERE id = $2', values: [now, userId] };
      await this._pool.query(query);
      logger.info(`[updateLastLogin] Updated last login for userId=${userId}`);
    } catch (error) {
      logger.error(`[updateLastLogin] Error updating last login userId=${userId}: ${error.message}`);
    }
  }

  async verifyUser({ userId }) {
    try {
      const query = { text: 'SELECT role FROM users WHERE id = $1', values: [userId] };
      const result = await this._pool.query(query);

      if (!result.rows.length) {
        logger.warn(`[verifyUser] User not found id=${userId}`);
        throw new NotFoundError('Data tidak ditemukan');
      }

      if (result.rows[0].role !== 'admin') {
        logger.warn(`[verifyUser] Unauthorized access attempt userId=${userId}`);
        throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
      }

      logger.info(`[verifyUser] User authorized id=${userId}`);
    } catch (error) {
      logger.error(`[verifyUser] Error verifying userId=${userId}: ${error.message}`);
      throw error;
    }
  }

  async putRole(userId) {
    console.log('MGOK', userId)
    const query = {
      text: `
        UPDATE users SET role = $1 WHERE id = $2 RETURNING id
      `,
      values: ['admin', userId]
    }

    const result = await this._pool.query(query)

    return result.rows[0].id;
  }
}