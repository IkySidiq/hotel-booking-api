import { nanoid } from "nanoid";
import { InvariantError } from "../../exceptions/InvariantError.js";
import { NotFoundError } from "../../exceptions/NotFoundError.js";
import { AuthorizationError } from "../../exceptions/AuthorizationError.js";
const { Pool } = pg;
import pg from "pg";

export class ReviewsService {
  constructor(bookingsService) {
    this._pool = new Pool();
    this._bookingsService = bookingsService
  }

  // Tambah review baru
async addReview({ roomId, userId, rating, comment }) {
  if (rating < 1 || rating > 5) {
    throw new InvariantError("Rating harus antara 1 sampai 5");
  }
  if (!comment || comment.trim().length === 0) {
    throw new InvariantError("Komentar tidak boleh kosong");
  }

  // Cek apakah user sudah pernah kasih review untuk room ini
  const check = await this._pool.query(
    `SELECT id FROM reviews WHERE room_id = $1 AND user_id = $2`,
    [roomId, userId]
  );
  if (check.rowCount > 0) {
    throw new InvariantError("Anda sudah memberikan review untuk kamar ini");
  }

  // Ambil booking completed terakhir user untuk room ini
  const booking = await this._bookingsService.getCompletedBookingForUserRoom(userId, roomId);
  if (!booking) {
    throw new InvariantError("Anda belum melakukan booking untuk kamar ini");
  }
  const bookingId = booking.id;

  const id = `review-${nanoid(16)}`;
  const createdAt = new Date().toISOString();

  const result = await this._pool.query(
    `INSERT INTO reviews (id, room_id, user_id, booking_id, rating, comment, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [id, roomId, userId, bookingId, rating, comment, createdAt]
  );

  if (!result.rows.length) {
    throw new InvariantError("Gagal menambahkan review");
  }

  return result.rows[0].id;
}

  // Ambil semua review berdasarkan roomId
  async getReviewsByRoomId(roomId) {
    const result = await this._pool.query(
      `SELECT reviews.id, reviews.rating, reviews.comment, reviews.created_at, users.username
       FROM reviews
       JOIN users ON reviews.user_id = users.id
       WHERE reviews.room_id = $1
       ORDER BY reviews.created_at DESC`,
      [roomId]
    );
    return result.rows;
  }

  // Ambil satu review berdasarkan id
  async getReviewById(id) {
    const result = await this._pool.query(
      `SELECT reviews.id, reviews.rating, reviews.comment, reviews.created_at, users.username
       FROM reviews
       JOIN users ON reviews.user_id = users.id
       WHERE reviews.id = $1`,
      [id]
    );
    if (!result.rows.length) {
      throw new NotFoundError("Review tidak ditemukan");
    }
    return result.rows[0];
  }

  // Edit review
  async editReview({ id, userId, rating, comment }) {
    if (rating < 1 || rating > 5) {
      throw new InvariantError("Rating harus antara 1 sampai 5");
    }
    if (!comment || comment.trim().length === 0) {
      throw new InvariantError("Komentar tidak boleh kosong");
    }

    const check = await this._pool.query(
      `SELECT user_id FROM reviews WHERE id = $1`,
      [id]
    );
    if (!check.rows.length) {
      throw new NotFoundError("Review tidak ditemukan");
    }
    if (check.rows[0].user_id !== userId) {
      throw new AuthorizationError("Anda tidak berhak mengedit review ini");
    }

    const result = await this._pool.query(
      `UPDATE reviews 
       SET rating = $1, comment = $2, updated_at = $3
       WHERE id = $4 
       RETURNING id`,
      [rating, comment, new Date().toISOString(), id]
    );

    return result.rows[0].id;
  }

  // Hapus review
  async deleteReview({ id, userId, isAdmin = false }) {
    const check = await this._pool.query(
      `SELECT user_id FROM reviews WHERE id = $1`,
      [id]
    );
    if (!check.rows.length) {
      throw new NotFoundError("Review tidak ditemukan");
    }

    if (check.rows[0].user_id !== userId && !isAdmin) {
      throw new AuthorizationError("Anda tidak berhak menghapus review ini");
    }

    await this._pool.query(`DELETE FROM reviews WHERE id = $1`, [id]);
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
