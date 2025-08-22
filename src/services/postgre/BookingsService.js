import pg from "pg";
import dayjs from "dayjs";
import { nanoid } from "nanoid";
import { InvariantError } from "../../exceptions/InvariantError.js";
import { NotFoundError } from "../../exceptions/NotFoundError.js";
import { mapDBToModel } from "../../utils/index.js";
const { Pool } = pg;

export class BookingsService {
  constructor(roomAvailabilityService, usersService, roomsService, midtransService, transactionsRecordService) {
    this._pool = new Pool();
    this._roomAvailabilityService = roomAvailabilityService;
    this._usersService = usersService; 
    this._roomsService = roomsService; 
    this._midtransService = midtransService;
    this._transactionsRecordService = transactionsRecordService;
  }

  async addBooking({ userId, roomId, guestName, totalGuests, checkInDate, checkOutDate, specialRequest }) {
    const client = await this._pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Lock & cek stok
      const { totalPrice, totalNights, pricePerNight } = await this._roomAvailabilityService.lockAndCheck({
        roomId,
        checkInDate,
        checkOutDate,
        numberOfRooms: 1,
        client,
      });

      const user = await this._usersService.getUserbyId({ userId });
      const room = await this._roomsService.getRoomById({ roomId });

      const customerDetails = {
        firstName: user.fullname,
        email: user.email,
        phone: user.contactNumber,
      };

      const itemDetails = {
        id: roomId,
        price: pricePerNight,
        quantity: totalNights,
        name: room.roomType
      };

      // 3. Insert booking pending lengkap dengan JSON
      const bookingId = `booking-${nanoid(16)}`;
      const now = dayjs().toISOString();

      const query = {
        text: `INSERT INTO bookings (
          id, user_id, room_id, guest_name, total_guests, special_request,
          check_in_date, check_out_date, total_price, status,
          created_at, updated_at, customer_details, item_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
        values: [
          bookingId,
          userId,
          roomId,
          guestName,
          totalGuests,
          specialRequest,
          checkInDate,
          checkOutDate,
          totalPrice,
          'pending_payment',
          now,
          now,
          customerDetails,
          itemDetails
        ]
      }
      
      const result = await this._pool.query(query);
      console.log('BARU', result.rows)
      const resultMap = result.rows.map(mapDBToModel.bookingTable);
      console.log('BARU JUGA', resultMap)

      if (!resultMap.length) {
        throw new InvariantError('Booking gagal');
      }

      // 4. Reduce stok kamar
      await this._roomAvailabilityService.reduceAvailability({
        roomId,
        userId,
        checkInDate,
        checkOutDate,
        numberOfRooms: 1,
        client,
      });

      const queryLog = await client.query(
        `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [`log-${nanoid(16)}`, userId, "cancel booking", "bookings", bookingId, dayjs().toISOString()]
      );

      if (!queryLog.rows.length) {
        throw new InvariantError('Log gagal dicatat');
      }

      await client.query("COMMIT");

      // 5. Buat transaksi Midtrans di luar DB
      let transactionToken
      try {
        const result = await this._midtransService.createTransaction({
          orderId: bookingId,
          grossAmount: totalPrice,
          customerDetails,
        });

        transactionToken = result.transactionToken;
      } catch (midtransError) {
        console.log(midtransError, 'IYEU')
        // Rollback stok kamar & update status booking
        await this._roomAvailabilityService.increaseAvailability({
          roomId,
          userId,
          checkInDate,
          checkOutDate,
          numberOfRooms: 1,
          client,
        });

        const queryUpdate = {
          text: `UPDATE bookings SET status = $1, updated_at = $2 WHERE id = $3`,
          values: ["failed", dayjs().toISOString(), bookingId]
        }

        const result = await this._pool.query(queryUpdate);

        if (!result.rows.length) {
          throw new InvariantError('Booking gagal')
        }

        throw midtransError;
      }

      // 6. Simpan record transaksi
      const { transactionRecordId } = await this._transactionsRecordService.createTransactionRecord({
        bookingId,
        amount: totalPrice,
      });

      return {
        bookingId,
        transactionToken,
      };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async getPendingBookingByUserId({ userId }) {
    const result = await this._pool.query(
      `SELECT booking_id, total_price, item_details, customer_details FROM bookings WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC`,
      [userId]
    );

    const resultMap = result.rows.map(mapDBToModel.bookingTable);

    if (!resultMap.length) {
      throw NotFoundError('Tidak ada booking pending');
    }

    return resultMap[0];
  }

  async updateSnapToken(bookingId, snapToken) {
    const query = await this._pool.query(
      `UPDATE bookings SET snap_token = $1, updated_at = NOW() WHERE booking_id = $2 RETURNING id`,
      [snapToken, bookingId]
    );
    
    if (!query.rows.length) {
      throw InvariantError('Pembayaran gagal diproses');
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

  async updateBookingStatus(notification) {
    const { orderId, transactionStatus, fraudStatus } = notification;

    // Simpan status asli dari Midtrans
    let paymentStatus;
    if (transactionStatus === "capture" && fraudStatus === "accept") {
      paymentStatus = "capture";
    } else if (transactionStatus === "settlement") {
      paymentStatus = "settlement";
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire"
    ) {
      paymentStatus = transactionStatus; // cancel / deny / expire
    } else if (transactionStatus === "pending") {
      paymentStatus = "pending";
    } else {
      paymentStatus = "unknown";
    }

    // Update tabel transaction_records
    await this._pool.query(
      "UPDATE transaction_records SET payment_status = $1, updated_at = $2 WHERE id = $3",
      [paymentStatus, dayjs().toISOString(), orderId]
    );

    // Mapping ke tabel bookings
    let bookingStatus;
    if (paymentStatus === "settlement" || paymentStatus === "capture") {
      bookingStatus = "confirmed"; // pembayaran sukses
    } else if (paymentStatus === "pending") {
      bookingStatus = "pending_payment"; // menunggu pembayaran
    } else if (paymentStatus === "cancel") {
      bookingStatus = "cancelled"; // user cancel
    } else if (paymentStatus === "expire" || paymentStatus === "deny") {
      bookingStatus = "failed"; // pembayaran gagal
    } else {
      bookingStatus = "pending_payment"; // fallback
    }

    // Update tabel bookings
    await this._pool.query(
      "UPDATE bookings SET status = $1, updated_at = $2 WHERE id = $3",
      [bookingStatus, dayjs().toISOString(), orderId]
    );

    return { paymentStatus, bookingStatus };
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
        `UPDATE bookings SET status = $1, updated_at = $2 WHERE id = $3`,
        ['cancelled', updatedAt, bookingId]
      );

      // 2. Kembalikan availability
      await this._roomAvailabilityService.increaseAvailability({
        roomId,
        checkInDate,
        checkOutDate,
        numberOfRooms: 1,
        client
      });

      // 3. Log aktivitas
      const queryLog = await client.query(
        `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
        VALUES ($1, $2 ,$ 3, $4, $5, $6) RETURNING id`,
        [`log-${nanoid(16)}`, userId, "cancel booking", "bookings", bookingId, updatedAt]
      );

      if (!queryLog.rows.length) {
        throw new InvariantError('Log gagal dicatat');
      }

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

  async getCompletedBookingForUserRoom(userId, roomId) {
    try {
      const query = {
        text: `
          SELECT id
          FROM bookings
          WHERE user_id = $1
            AND room_id = $2
            AND status = 'check-out'
          ORDER BY updated_at DESC
          LIMIT 1
        `,
        values: [userId, roomId],
      };

      const result = await this._pool.query(query);

      // Kembalikan booking pertama yang ditemukan atau null
      return result.rows[0] || null;
    } catch (error) {
      console.error("Database Error (getCompletedBookingForUserRoom):", error);
      throw error;
    }
  }
}