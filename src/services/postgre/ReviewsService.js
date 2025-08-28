import { nanoid } from 'nanoid';
import { InvariantError } from '../../exceptions/InvariantError.js';
import { NotFoundError } from '../../exceptions/NotFoundError.js';
import { AuthorizationError } from '../../exceptions/AuthorizationError.js';
import { logger } from '../../utils/logger.js';

export class ReviewsService {
  constructor(pool, bookingsService) {
    this._pool = pool;
    this._bookingsService = bookingsService;
  }

  // Tambah review baru
  async addReview({ roomId, userId, rating, comment }) {
    try {
      if (rating < 1 || rating > 5) {
        logger.warn(`User ${userId} memberikan rating invalid: ${rating}`);
        throw new InvariantError('Rating harus antara 1 sampai 5');
      }
      if (!comment || comment.trim().length === 0) {
        logger.warn(`User ${userId} mengirim komentar kosong`);
        throw new InvariantError('Komentar tidak boleh kosong');
      }

      const check = await this._pool.query(
        'SELECT id FROM reviews WHERE room_id = $1 AND user_id = $2',
        [roomId, userId]
      );
      if (check.rowCount > 0) {
        logger.warn(`User ${userId} sudah memberikan review untuk room ${roomId}`);
        throw new InvariantError('Anda sudah memberikan review untuk kamar ini');
      }

      const booking = await this._bookingsService.getCompletedBookingForUserRoom(userId, roomId);
      if (!booking) {
        logger.warn(`User ${userId} belum pernah booking room ${roomId}`);
        throw new InvariantError('Anda belum melakukan booking untuk kamar ini');
      }

      const id = `review-${nanoid(16)}`;
      const createdAt = new Date().toISOString();

      const result = await this._pool.query(
        `INSERT INTO reviews (id, room_id, user_id, booking_id, rating, comment, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [id, roomId, userId, booking.id, rating, comment, createdAt]
      );

      if (!result.rows.length) {
        logger.error(`Gagal menambahkan review user ${userId} untuk room ${roomId}`);
        throw new InvariantError('Gagal menambahkan review');
      }

      logger.info(`User ${userId} berhasil menambahkan review ${id} untuk room ${roomId}`);
      return result.rows[0].id;
    } catch (err) {
      logger.error(`Error addReview user ${userId}: ${err.message}`);
      throw err;
    }
  }

  // Ambil semua review berdasarkan roomId
  async getReviewsByRoomId({ roomId, page = 1, limit = 10 }) {
    try {
      const offset = (page - 1) * limit;

      const query = {
        text: `
          SELECT 
            reviews.id,
            reviews.rating,
            reviews.comment,
            reviews.created_at,
            users.fullname
          FROM reviews
          JOIN users ON reviews.user_id = users.id
          WHERE reviews.room_id = $1
          ORDER BY reviews.created_at DESC
          LIMIT $2
          OFFSET $3
        `,
        values: [roomId, limit, offset],
      };

      const result = await this._pool.query(query);

      const countQuery = {
        text: 'SELECT COUNT(*) FROM reviews WHERE room_id = $1',
        values: [roomId],
      };
      const countResult = await this._pool.query(countQuery);
      const totalItems = parseInt(countResult.rows[0]?.count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      logger.info(`Ambil ${result.rows.length} review untuk room ${roomId} halaman ${page}`);
      return {
        data: result.rows,
        page,
        limit,
        totalItems,
        totalPages,
      };
    } catch (err) {
      logger.error(`Database Error (getReviewsByRoomId) room ${roomId}: ${err.message}`);
      throw err;
    }
  }

  async getReviewById(id) {
    try {
      const result = await this._pool.query(
        `SELECT reviews.id, reviews.rating, reviews.comment, reviews.created_at, users.fullname
        FROM reviews
        JOIN users ON reviews.user_id = users.id
        WHERE reviews.id = $1`,
        [id]
      );

      if (!result.rows.length) {
        logger.warn(`[getReviewById] Review dengan id ${id} tidak ditemukan`);
        throw new NotFoundError('Review tidak ditemukan');
      }

      logger.info(`[getReviewById] Review ${id} berhasil diambil`);
      return result.rows[0];
    } catch (err) {
      logger.error(`[getReviewById] Gagal mengambil review ${id}: ${err.message}`);
      throw err;
    }
  }

  async editReview({ id, userId, rating, comment }) {
    try {
      if (rating < 1 || rating > 5) {
        throw new InvariantError('Rating harus antara 1 sampai 5');
      }
      if (!comment || comment.trim().length === 0) {
        throw new InvariantError('Komentar tidak boleh kosong');
      }

      const check = await this._pool.query('SELECT user_id FROM reviews WHERE id = $1', [id]);
      if (!check.rows.length) {
        logger.warn(`[editReview] Review ${id} tidak ditemukan`);
        throw new NotFoundError('Review tidak ditemukan');
      }
      if (check.rows[0].user_id !== userId) {
        logger.warn(`[editReview] User ${userId} mencoba mengedit review ${id} milik orang lain`);
        throw new AuthorizationError('Anda tidak berhak mengedit review ini');
      }

      const result = await this._pool.query(
        `UPDATE reviews 
        SET rating = $1, comment = $2, updated_at = $3
        WHERE id = $4 
        RETURNING id`,
        [rating, comment, new Date().toISOString(), id]
      );

      logger.info(`[editReview] Review ${id} berhasil diubah oleh user ${userId}`);
      return result.rows[0].id;
    } catch (err) {
      logger.error(`[editReview] Gagal mengedit review ${id}: ${err.message}`);
      throw err;
    }
  }

  async deleteReview({ id, userId, isAdmin = false }) {
    try {
      const check = await this._pool.query('SELECT user_id FROM reviews WHERE id = $1', [id]);
      if (!check.rows.length) {
        logger.warn(`[deleteReview] Review ${id} tidak ditemukan`);
        throw new NotFoundError('Review tidak ditemukan');
      }

      if (check.rows[0].user_id !== userId && !isAdmin) {
        logger.warn(`[deleteReview] User ${userId} tidak berhak menghapus review ${id}`);
        throw new AuthorizationError('Anda tidak berhak menghapus review ini');
      }

      const result = await this._pool.query(
        'DELETE FROM reviews WHERE id = $1 RETURNING id',
        [id]
      );

      logger.info(`[deleteReview] Review ${id} berhasil dihapus oleh user ${userId}`);
      return result.rows[0].id;
    } catch (err) {
      logger.error(`[deleteReview] Gagal menghapus review ${id}: ${err.message}`);
      throw err;
    }
  }

  async checkExistingReview({ userId, roomId }) {
    try {
      const result = await this._pool.query(
        `SELECT id 
        FROM reviews 
        WHERE user_id = $1 AND room_id = $2`,
        [userId, roomId]
      );

      logger.info(`[checkExistingReview] Cek review user ${userId} untuk room ${roomId}`);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
      logger.error(`[checkExistingReview] Gagal cek review user ${userId} room ${roomId}: ${err.message}`);
      throw err;
    }
  }

    // Cek apakah user sudah pernah memberi review untuk room tertentu
  async checkExistingReview({ userId, roomId }) {
    const result = await this._pool.query(
      `SELECT id 
      FROM reviews 
      WHERE user_id = $1 AND room_id = $2`,
      [userId, roomId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }
}
