import QRCode from "qrcode";
import pg from "pg";
import { nanoid } from "nanoid";
import { InvariantError } from "../../exceptions/InvariantError.js";
import { NotFoundError } from "../../exceptions/NotFoundError.js";
const { Pool } = pg;

export class PaymentsService{
  constructor() {
    this._pool = new Pool();
  }

  async getBookingQris({ bookingId, userId }) {
    const client = await this._pool.connect();

    try {
      const result = await client.query(
        `SELECT id, total_price, status, payment_status FROM bookings WHERE id = $1 AND user_id = $2`,
        [bookingId, userId]
      );

      if (!result.rows.length) throw new NotFoundError("Booking tidak ditemukan");

      const booking = result.rows[0];
      if (booking.payment_status !== "unpaid" || booking.status !== "pending") {
        throw new InvariantError("Booking sudah dibayar atau tidak bisa dibayar");
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 menit

      // simpan expiry di DB
      await client.query(
        `UPDATE bookings SET qris_expires_at = $1 WHERE id = $2`,
        [expiresAt.toISOString(), bookingId]
      );

      // generate QR code dummy
      const qrisData = `https://dummy-payment.example.com/pay/${booking.id}?amount=${booking.total_price}`;
      const qrCodeImage = await QRCode.toDataURL(qrisData);

      return { bookingId, amount: booking.total_price, qrCodeImage, expiresAt };
    } finally {
      client.release();
    }
  }

  async confirmPaymentWebhook({ bookingId, userId }) {
    const client = await this._pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Ambil booking
      const bookingResult = await client.query(
        `SELECT status, payment_status, qris_expires_at, total_price FROM bookings WHERE id = $1 AND user_id = $2`,
        [bookingId, userId]
      );

      if (!bookingResult.rows.length) throw new NotFoundError("Booking tidak ditemukan");

      const booking = bookingResult.rows[0];

      // 2. Validasi pembayaran
      if (booking.payment_status === "paid") throw new InvariantError("Booking sudah dibayar");
      if (booking.status !== "pending") throw new InvariantError("Booking tidak dapat dibayar pada status ini");

      const now = new Date();
      if (!booking.qris_expires_at || now > new Date(booking.qris_expires_at)) {
        // Jika QRIS kadaluwarsa, buat notifikasi gagal
        const failedNotifId = `notif-${nanoid(16)}`;
        await client.query(
          `INSERT INTO notifications (id, user_id, type, message, created_at)
          VALUES ($1, $2, $3, $4, $5)`,
          [
            failedNotifId,
            userId,
            "payment_failed",
            `QRIS untuk booking ${bookingId} sudah kadaluwarsa. Silakan buat ulang booking.`,
            now.toISOString()
          ]
        );
        throw new InvariantError("QRIS sudah kadaluwarsa, silakan buat booking ulang");
      }

      const updatedAt = now.toISOString();

      // 3. Update status booking jadi paid & confirmed
      await client.query(
        `UPDATE bookings SET payment_status = 'paid', status = 'confirmed', updated_at = $1 WHERE id = $2`,
        [updatedAt, bookingId]
      );

      // 4. Catat log aktivitas
      await client.query(
        `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [`log-${nanoid(16)}`, userId, "pay booking via webhook", "bookings", bookingId, updatedAt]
      );

      // 5. Catat notifikasi pembayaran sukses
      const notifId = `notif-${nanoid(16)}`;
      await client.query(
        `INSERT INTO notifications (id, user_id, type, message, created_at)
        VALUES ($1, $2, $3, $4, $5)`,
        [
          notifId,
          userId,
          "payment_success",
          `Pembayaran booking ${bookingId} sebesar Rp${booking.total_price} berhasil.`,
          updatedAt
        ]
      );

      await client.query("COMMIT");

      return { bookingId, payment_status: "paid", status: "confirmed" };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Database Error (confirmPaymentWebhook):", error);
      throw error;
    } finally {
      client.release();
    }
  }
}