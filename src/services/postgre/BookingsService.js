import pg from "pg";
import { nanoid } from "nanoid";
import { InvariantError } from "../../exceptions/InvariantError.js";
import { NotFoundError } from "../../exceptions/NotFoundError.js";
import { mapDBToModel } from "../../utils/index.js";

const { Pool } = pg;

export class BookingsService {
  constructor(roomAvailabilityService) {
    this._pool = new Pool();
    this._roomAvailabilityService = roomAvailabilityService;
  }

  async addBooking({ userId, roomId, guestName, totalGuests, checkInDate, checkOutDate, specialRequest }) {
    const client = await this._pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Lock & cek stok
      const { totalPrice } = await this._roomAvailabilityService.lockAndCheck({
        roomId, checkInDate, checkOutDate, numberOfRooms: totalGuests, client
      });

      // 2. Insert booking pending
      const bookingId = "booking-" + nanoid(16);
      const now = dayjs().toISOString();
      await client.query(
        `INSERT INTO bookings (
          id, user_id, room_id, guest_name, total_guests, special_requests,
          check_in_date, check_out_date, total_price, status, payment_status,
          check_in_status, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [bookingId, userId, roomId, guestName, totalGuests, specialRequest, checkInDate, checkOutDate, totalPrice, 'pending', 'unpaid', 'not checked in', now, now]
      );

      // 3. Reduce stok kamar
      await this._roomAvailabilityService.reduceAvailability({ roomId, checkInDate, checkOutDate, numberOfRooms: totalGuests, client });

      await client.query("COMMIT");

      // 4. Buat transaksi Midtrans di luar DB
      const user = await this._usersService.getUserbyId({ userId });
      const room = await this._roomsService.getRoomById({ roomId });

      let transaction;
      try {
        transaction = await this._midtransService.createTransaction(
          bookingId,
          totalPrice,
          [{ id: room.id, name: `${room.roomType} (Guests: ${totalGuests})`, price: room.pricePerNight, quantity: 1 }],
          { firstName: user.fullname, email: user.email, phone: user.contactNumber }
        );
      } catch (midtransError) {
        // Rollback stok kamar
        await this._roomAvailabilityService.increaseAvailability({ roomId, checkInDate, checkOutDate, numberOfRooms: totalGuests, client });
        // Update status booking jadi failed
        await client.query(
          `UPDATE bookings SET status = 'failed', updated_at = $2 WHERE id = $1`,
          [bookingId, dayjs().toISOString()]
        );
        throw midtransError;
      }

      // 5. Simpan record transaksi
      const transactionRecord = await this._transactionsRecordService.createTransactionRecord({ bookingId, amount: totalPrice });

      return {
        booking: { bookingId, userId, roomId, guestName, totalGuests, checkInDate, checkOutDate, totalPrice, status: 'pending', paymentStatus: 'unpaid', checkInStatus: 'not checked in', createdAt: now, updatedAt: now },
        user,
        room,
        transaction,
        transactionRecord
      };

    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async getBookingsService({ 
    status, 
    paymentStatus,
    checkInStatus,  
    guestName, 
    checkInStart, 
    checkInEnd, 
    checkOutStart, 
    checkOutEnd, 
    page = 1, 
    limit = 50 
  }) {
    try {
      const offset = (page - 1) * limit;
      const conditions = [];
      const whereValues = [];

      if (status) {
        conditions.push(`bookings.status = $${whereValues.length + 1}`);
        whereValues.push(status);
      }

      if (paymentStatus) {
        conditions.push(`bookings.payment_status = $${whereValues.length + 1}`);
        whereValues.push(paymentStatus);
      }

      if (checkInStart && checkInEnd) {
        conditions.push(`bookings.check_in_date BETWEEN $${whereValues.length + 1} AND $${whereValues.length + 2}`);
        whereValues.push(checkInStart, checkInEnd);
      } else if (checkInStart) {
        conditions.push(`bookings.check_in_date >= $${whereValues.length + 1}`);
        whereValues.push(checkInStart);
      } else if (checkInEnd) {
        conditions.push(`bookings.check_in_date <= $${whereValues.length + 1}`);
        whereValues.push(checkInEnd);
      }

      if (checkOutStart && checkOutEnd) {
        conditions.push(`bookings.check_out_date BETWEEN $${whereValues.length + 1} AND $${whereValues.length + 2}`);
        whereValues.push(checkOutStart, checkOutEnd);
      } else if (checkOutStart) {
        conditions.push(`bookings.check_out_date >= $${whereValues.length + 1}`);
        whereValues.push(checkOutStart);
      } else if (checkOutEnd) {
        conditions.push(`bookings.check_out_date <= $${whereValues.length + 1}`);
        whereValues.push(checkOutEnd);
      }

      if (checkInStatus) {
        conditions.push(`bookings.check_in_status = $${whereValues.length + 1}`);
        whereValues.push(checkInStatus);
      }

      if (guestName) {
        conditions.push(`bookings.guest_name ILIKE $${whereValues.length + 1}`);
        whereValues.push(`%${guestName}%`);
      }

      const whereClause = conditions.length
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const paginationValues = [limit, offset];

      const query = {
        text: `
          SELECT 
            bookings.id,
            bookings.guest_name,
            bookings.number_of_guests,
            bookings.check_in_date,
            bookings.check_out_date,
            bookings.payment_status,
            rooms.id AS room_id,
            rooms.room_number,
            rooms.price_per_night
          FROM bookings
          JOIN rooms ON bookings.room_id = rooms.id
          ${whereClause}
          LIMIT $${whereValues.length + 1}
          OFFSET $${whereValues.length + 2}
        `,
        values: [...whereValues, ...paginationValues],
      };

      const result = await this._pool.query(query);
      const bookings = result.rows.map(mapDBToModel.bookingTable);

      const countQuery = {
        text: `
          SELECT COUNT(*) 
          FROM bookings
          JOIN rooms ON bookings.room_id = rooms.id
          ${whereClause}
        `,
        values: whereValues,
      };

      const countResult = await this._pool.query(countQuery);
      const totalItems = parseInt(countResult.rows[0]?.count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      return {
        data: bookings,
        page,
        limit,
        totalItems,
        totalPages,
      };
    } catch (error) {
      console.error("Database Error (getBookings()):", error);
      throw error("Gagal mengambil daftar booking");
    }
  }

  async updateBookingStatus(bookingId, status) {
    const client = await this._pool.connect();
    try {
      const updatedAt = dayjs().toISOString();
      const queryText = `
        UPDATE bookings
        SET status = $1, updated_at = $2
        WHERE id = $3
      `;
      const queryValues = [status, updatedAt, bookingId];
      await client.query(queryText, queryValues);
    } finally {
      client.release();
    }
  }

  async getBookingById({ targetId }) {
    try {
      const query = {
        text: `
          SELECT id, user_id, room_id, guest_name, number_of_guests, special_requests, check_in_date, check_out_date,
          total_price, status, payment_status, check_in_status, created_at, updated_at
          FROM bookings WHERE id = $1
          `,
        values: [targetId],
      };

      const result = await this._pool.query(query);

      if (!result.rows.length) {
        throw new NotFoundError("Detail booking tidak ditemukan");
      }

      return result.rows[0];
    } catch (error) {
      console.log("Database Error (getBookingById):", error);
      throw error;
    }
  }

  async cancelBookingService({ bookingId, userId }) {
    const client = await this._pool.connect();
    try {
      await client.query("BEGIN");

      // Ambil booking dari DB
      const result = await client.query(
        `SELECT room_id, check_in_date, check_out_date 
        FROM bookings 
        WHERE id = $1 AND user_id = $2`,
        [bookingId, userId]
      );

    const bookingRes = result.rows.map(mapDBToModel.bookingTable);

      if (!bookingRes.length) throw new NotFoundError("Booking tidak ditemukan atau bukan milik Anda");

      const { roomId, checkInDate, checkOutDate } = bookingRes.rows[0];

      // 1. Update status booking
      const updatedAt = new Date().toISOString();
      await client.query(
        `UPDATE bookings SET status='canceled', updated_at=$1 WHERE id=$2`,
        [updatedAt, bookingId]
      );

      // 2. Kembalikan availability
      await this._roomAvailabilityService.increaseAvailability({
        roomId,
        checkInDate,
        checkOutDate,
        numberOfRooms: 1
      });

      // 3. Log aktivitas
      await client.query(
        `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [`log-${nanoid(16)}`, userId, "cancel booking", "bookings", bookingId, updatedAt]
      );

      await client.query("COMMIT");
      return { bookingId };
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Database Error (cancelBookingService):", err);
      throw err;
    } finally {
      client.release();
    }
  }

  //* Otomatis pakai node-cron
  async markNoShowBookings() {
    const client = await this._pool.connect();
    try {
      await client.query("BEGIN");

      const now = new Date().toISOString();

      // 1. Pilih booking yang check-in date sudah lewat, masih pending, dan tamu belum check-in
      const result = await client.query(
        `SELECT id, user_id FROM bookings 
        WHERE check_in_date < $1
        AND status = 'pending'
        AND check_in_status = 'not checked in'`,
        [now]
      );

      const bookingsToUpdate = result.rows;

      if (bookingsToUpdate.length) {
        for (const booking of bookingsToUpdate) {
          // 2. Update status jadi no-show
          await client.query(
            `UPDATE bookings SET status = $1, updated_at = $2 WHERE id = $3`,
            ['No-Show', now, booking.id]
          );

          // 3. Catat log aktivitas
          await client.query(
            `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              `log-${nanoid(16)}`,
              booking.user_id,
              "auto mark no-show",
              "bookings",
              booking.id,
              now,
            ]
          );
        }
      }

      await client.query("COMMIT");
      return { updated: bookingsToUpdate.length };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Database Error (markNoShowBookings):", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async checkInBookingService({ bookingId, userId }) {
    const client = await this._pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Ambil booking dan validasi
      const result = await client.query(
        `SELECT status, check_in_status FROM bookings WHERE id = $1`,
        [bookingId]
      );

      const bookingResult = result.rows.map(mapDBToModel.bookingTable)

      if (!bookingResult.length) {
        throw new NotFoundError("Booking tidak ditemukan");
      }

      const booking = bookingResult[0];

      // 2. Cek aturan bisnis
      if (booking.status !== "confirmed") {
        throw new InvariantError("Booking belum dikonfirmasi, tidak bisa check-in");
      }

      if (booking.checkInStatus === "checked in") {
        throw new InvariantError("Booking sudah check-in");
      }

      if (booking.checkInStatus === "checked out") {
        throw new InvariantError("Booking sudah selesai, tidak bisa check-in");
      }

      // 3. Update check_in_status menjadi checked in
      const updatedAt = new Date().toISOString();
      const logId = `log-${nanoid(16)}`
      await client.query(
        `UPDATE bookings
        SET check_in_status = $1, updated_at = $2
        WHERE id = $3`,
        [`checked in`, updatedAt, bookingId]
      );

      // 4. Log aktivitas
      await client.query(
        `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at) 
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [logId, userId, "check-in booking", "bookings", bookingId, updatedAt]
      );

      await client.query("COMMIT");
      return { bookingId, check_in_status: "checked in" };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Database Error (checkInBookingService):", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async checkOutBookingService({ bookingId, userId }) {
    const client = await this._pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Ambil booking dan validasi
      const result = await client.query(
        `SELECT status, check_in_status FROM bookings WHERE id = $1`,
        [bookingId]
      );

      const bookingResult = result.rows.map(mapDBToModel.bookingTable);

      if (!bookingResult.rows.length) {
        throw new NotFoundError("Booking tidak ditemukan");
      }

      const booking = bookingResult.rows[0];

      // 2. Cek aturan bisnis
      if (booking.status !== "confirmed") {
        throw new InvariantError("Booking belum dikonfirmasi, tidak bisa check-out");
      }

      if (booking.checkInStatus === "not checked in") {
        throw new InvariantError("Booking belum check-in, tidak bisa check-out");
      }

      if (booking.checkInStatus === "checked out") {
        throw new InvariantError("Booking sudah selesai, tidak bisa check-out lagi");
      }

      // 3. Update check_in_status menjadi checked out
      const updatedAt = new Date().toISOString();
      const logId = `log-${nanoid(16)}`
      await client.query(
        `UPDATE bookings
        SET check_in_status = $1, status = 'completed', updated_at = $1
        WHERE id = $2`,
        ['checked out', updatedAt, bookingId]
      );

      // 4. Log aktivitas
      await client.query(
        `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [logId, userId, "check-out booking", "bookings", bookingId, updatedAt]
      );

      await client.query("COMMIT");

      return { bookingId, check_in_status: "checked out" };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Database Error (checkOutBookingService):", error);
      throw error;
    } finally {
      client.release();
    }
  }
}