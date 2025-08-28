import dayjs from 'dayjs';
import path from 'path';
import fs from 'fs';
import { logger } from '../../utils/logger.js';
import { nanoid } from 'nanoid';
import { InvariantError } from '../../exceptions/InvariantError.js';
import { NotFoundError } from '../../exceptions/NotFoundError.js';
import { mapDBToModel } from '../../utils/index.js';

export class BookingsService {
  constructor(pool, roomAvailabilityService, usersService, roomsService, midtransService, transactionsRecordService, cacheService) {
    this._pool = pool;
    this._roomAvailabilityService = roomAvailabilityService;
    this._usersService = usersService; 
    this._roomsService = roomsService; 
    this._midtransService = midtransService;
    this._transactionsRecordService = transactionsRecordService;
    this._cacheService = cacheService;
  }

  async addBooking({ userId, roomId, guestName, totalGuests, checkInDate, checkOutDate, specialRequest }) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      logger.info(`[addBooking] Start booking process for user ${userId} and room ${roomId}`);

      // 1. Lock & cek stok
      const { totalPrice, totalNights, pricePerNight } = await this._roomAvailabilityService.lockAndCheck({
        roomId,
        checkInDate,
        checkOutDate,
        numberOfRooms: 1,
        client,
      });
      logger.info(`[addBooking] Room ${roomId} locked and checked, totalPrice: ${totalPrice}`);

      const user = await this._usersService.getUserbyId({ targetId: userId });
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
        name: room.roomType,
      };

      // 3. Insert booking
      const bookingId = `booking-${nanoid(16)}`;
      const formattedCheckIn = dayjs(checkInDate).format('YYYY-MM-DD');
      const formattedCheckOut = dayjs(checkOutDate).format('YYYY-MM-DD');
      const now = dayjs().toISOString();

      const query = {
        text: `INSERT INTO bookings (
          id, user_id, room_id, guest_name, total_guests, special_request,
          check_in_date, check_out_date, total_price, status,
          created_at, updated_at, customer_details, item_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
        values: [
          bookingId, userId, roomId, guestName, totalGuests, specialRequest,
          formattedCheckIn, formattedCheckOut, totalPrice, 'pending_payment',
          now, now, customerDetails, itemDetails
        ]
      };

      const result = await this._pool.query(query);
      const resultMap = result.rows.map(mapDBToModel.bookingTable);

      if (!resultMap.length) {
        throw new InvariantError('Booking gagal');
      }
      logger.info(`[addBooking] Booking inserted with ID ${bookingId}`);

      // 4. Reduce stok kamar
      await this._roomAvailabilityService.reduceAvailability({
        roomId,
        userId,
        checkInDate,
        checkOutDate,
        numberOfRooms: 1,
        client,
      });
      logger.info(`[addBooking] Reduced availability for room ${roomId}`);

      // Catat log
      const queryLog = await client.query(
        `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [`log-${nanoid(16)}`, userId, 'add booking', 'bookings', bookingId, now]
      );

      if (!queryLog.rows.length) {
        throw new InvariantError('Log gagal dicatat');
      }
      logger.info(`[addBooking] Active log created for booking ${bookingId}`);

      await client.query('COMMIT');

      // 5. Buat transaksi Midtrans
      let transactionToken;
      try {
        const midtransResult = await this._midtransService.createTransaction({
          orderId: bookingId,
          grossAmount: totalPrice,
          customerDetails,
        });

        transactionToken = midtransResult;
        logger.info(`[addBooking] Midtrans transaction created for booking ${bookingId}`);
      } catch (midtransError) {
        logger.error(`[addBooking] Midtrans transaction failed: ${midtransError.message}`);

        // rollback stok
        await this._roomAvailabilityService.increaseAvailability({
          roomId,
          userId,
          checkInDate,
          checkOutDate,
          numberOfRooms: 1,
          client,
        });

        await client.query(
          'UPDATE bookings SET status = $1, updated_at = $2 WHERE id = $3',
          ['failed', dayjs().toISOString(), bookingId]
        );

        throw midtransError;
      }

      // Update snap token
      const insertSnapToken = {
        text: 'UPDATE bookings SET snap_token = $1 WHERE id = $2 AND status = $3 RETURNING id',
        values: [transactionToken, bookingId, 'pending_payment'],
      };

      const snapResult = await client.query(insertSnapToken);
      if (!snapResult.rows.length) {
        throw new NotFoundError('Snap token tidak ditemukan');
      }
      logger.info(`[addBooking] Snap token updated for booking ${bookingId}`);

      // 6. Simpan record transaksi
      await this._transactionsRecordService.createTransactionRecord({
        bookingId,
        amount: totalPrice,
      });
      logger.info(`[addBooking] Transaction record created for booking ${bookingId}`);

      // Hapus cache user booking
      await this._cacheService.deletePrefix(`bookings:user:${userId}:`);

      return { id: bookingId, transactionToken };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error(`[addBooking] Booking process failed: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  async getPendingBookingsByUser({ userId }) {
    try {
      const result = await this._pool.query(
        `SELECT id, total_price, snap_token
         FROM bookings
         WHERE user_id = $1 AND status = 'pending_payment' AND snap_token IS NOT NULL
         ORDER BY created_at DESC`,
        [userId]
      );
      logger.info(`[getPendingBookingsByUser] Fetched pending bookings for user ${userId}, count=${result.rows.length}`);
      return result.rows;
    } catch (error) {
      logger.error(`[getPendingBookingsByUser] Failed: ${error.message}`);
      throw error;
    }
  }

  async getBookingsService({ guestName, status, checkInDate, checkOutDate, checkInDateEnd, checkOutDateEnd, page = 1, limit = 50 }) {
    // Buat key cache unik berdasarkan semua filter dan pagination
    const cacheKey = `bookings:service:${JSON.stringify({ guestName, status, checkInDate, checkOutDate, checkInDateEnd, checkOutDateEnd, page, limit })}`;
    
    // Cek cache dulu
    try {
      const cached = await this._cacheService.get(cacheKey);
      logger.info(`[getBookingsService] Cache hit for key: ${cacheKey}`);
      return JSON.parse(cached);
    } catch {
      // cache miss
      logger.info(`[getBookingsService] Cache miss for key: ${cacheKey}`);
    }

    try {
      const offset = (page - 1) * limit;
      const conditions = [];
      const whereValues = [];

      if (status) {
        conditions.push(`bookings.status = $${whereValues.length + 1}`);
        whereValues.push(status);
      }

      if (checkInDate && checkInDateEnd) {
        conditions.push(`DATE(bookings.check_in_date) BETWEEN $${whereValues.length + 1} AND $${whereValues.length + 2}`);
        whereValues.push(checkInDate, checkInDateEnd);
      } else if (checkInDate) {
        conditions.push(`DATE(bookings.check_in_date) = $${whereValues.length + 1}`);
        whereValues.push(checkInDate);
      } else if (checkInDateEnd) {
        conditions.push(`DATE(bookings.check_in_date) <= $${whereValues.length + 1}`);
        whereValues.push(checkInDateEnd);
      }

      if (checkOutDate && checkOutDateEnd) {
        conditions.push(`DATE(bookings.check_out_date) BETWEEN $${whereValues.length + 1} AND $${whereValues.length + 2}`);
        whereValues.push(checkOutDate, checkOutDateEnd);
      } else if (checkOutDate) {
        conditions.push(`DATE(bookings.check_out_date) = $${whereValues.length + 1}`);
        whereValues.push(checkOutDate);
      } else if (checkOutDateEnd) {
        conditions.push(`DATE(bookings.check_out_date) <= $${whereValues.length + 1}`);
        whereValues.push(checkOutDateEnd);
      }

      if (guestName) {
        conditions.push(`bookings.guest_name ILIKE $${whereValues.length + 1}`);
        whereValues.push(`%${guestName}%`);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const paginationValues = [limit, offset];

      const query = {
        text: `
          SELECT 
            bookings.id,
            bookings.guest_name,
            bookings.total_guests,
            bookings.check_in_date,
            bookings.check_out_date,
            rooms.id AS room_id,
            rooms.room_type,
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
      logger.info(`[getBookingsService] Fetched bookings, count=${bookings.length}`);

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

      const responseData = { bookings, page, limit, totalItems, totalPages };

      // Simpan ke cache
      await this._cacheService.set(cacheKey, JSON.stringify(responseData), 1800); // 30 menit
      logger.info(`[getBookingsService] Cache set for key: ${cacheKey}`);

      return responseData;
    } catch (error) {
      logger.error(`[getBookingsService] Failed: ${error.message}`);
      throw new Error('Gagal mengambil daftar booking');
    }
  }

  //*  WEBHOOK WORKED
  async updateBookingStatus({ orderId, transactionStatus, fraudStatus }) {
    try {
      let paymentStatus;
      if (transactionStatus === 'capture' && fraudStatus === 'accept') {
        paymentStatus = 'capture';
      } else if (transactionStatus === 'settlement') {
        paymentStatus = 'settlement';
      } else if (
        transactionStatus === 'cancel' ||
        transactionStatus === 'deny' ||
        transactionStatus === 'expire'
      ) {
        paymentStatus = transactionStatus;
      } else if (transactionStatus === 'pending') {
        paymentStatus = 'pending';
      } else {
        paymentStatus = 'unknown';
      }

      const result = await this._pool.query(
        'UPDATE transactions_records SET payment_status = $1, updated_at = $2 WHERE booking_id = $3 RETURNING id',
        [paymentStatus, dayjs().toISOString(), orderId]
      );

      if(!result.rows.length) {
        throw new InvariantError('Transactions Records Gagal Update');
      }

      let bookingStatus;
      if (paymentStatus === 'settlement' || paymentStatus === 'capture') {
        bookingStatus = 'confirmed';
      } else if (paymentStatus === 'pending') {
        bookingStatus = 'pending';
      } else if (paymentStatus === 'cancel') {
        bookingStatus = 'cancelled';
      } else if (paymentStatus === 'expire' || paymentStatus === 'deny') {
        bookingStatus = 'failed';
      } else {
        bookingStatus = 'pending_payment';
      }

      const query = await this._pool.query(
        'UPDATE bookings SET status = $1, updated_at = $2, snap_token = $3 WHERE id = $4 RETURNING id',
        [bookingStatus, dayjs().toISOString(), bookingStatus, orderId]
      );

      if (!query.rows.length) {
        throw new NotFoundError('Gagal update bookings');
      }

      logger.info(`[updateBookingStatus] Booking updated: orderId=${orderId}, paymentStatus=${paymentStatus}, bookingStatus=${bookingStatus}`);
      return { paymentStatus, bookingStatus };
    } catch (err) {
      logger.error(`[updateBookingStatus] Failed for orderId=${orderId}: ${err.message}`);
      throw err;
    }
  }

  async getBookingById({ targetId }) {
    const cacheKey = `booking:${targetId}`;
    try {
      const cached = await this._cacheService.get(cacheKey);
      return JSON.parse(cached);
    } catch {
      // cache miss
    }

    try {
      const query = {
        text: `
          SELECT id, user_id, room_id, guest_name, total_guests, special_request, check_in_date, check_out_date,
          total_price, status, snap_token, created_at, updated_at
          FROM bookings WHERE id = $1
        `,
        values: [targetId],
      };

      const result = await this._pool.query(query);
      const resultMap = result.rows.map(mapDBToModel.bookingTable);

      if (!resultMap.length) {
        throw new NotFoundError('Detail booking tidak ditemukan');
      }

      await this._cacheService.set(cacheKey, JSON.stringify(resultMap[0]), 1800);
      logger.info(`[getBookingById] Booking fetched: targetId=${targetId}`);
      return resultMap[0];
    } catch (err) {
      logger.error(`[getBookingById] Failed for targetId=${targetId}: ${err.message}`);
      throw err;
    }
  }

  async cancelBookingService({ bookingId, userId }) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT id, room_id, check_in_date, check_out_date, status
        FROM bookings 
        WHERE id = $1 AND user_id = $2`,
        [bookingId, userId]
      );

      const bookingRes = result.rows.map(mapDBToModel.bookingTable);

      if (!bookingRes.length) throw new NotFoundError('Booking tidak ditemukan atau bukan milik Anda');

      const { roomId, checkInDate, checkOutDate, status } = bookingRes[0];

      if (status !== 'pending_payment') {
        throw new InvariantError('Booking tidak bisa dibatalkan karena sudah diproses');
      }

      const updatedAt = new Date().toISOString();
      await client.query(
        'UPDATE bookings SET status = $1, updated_at = $2 WHERE id = $3',
        ['cancelled', updatedAt, bookingId]
      );

      await this._roomAvailabilityService.increaseAvailability({
        roomId,
        checkInDate,
        checkOutDate,
        numberOfRooms: 1,
        client
      });

      const queryLog = await client.query(
        `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [`log-${nanoid(16)}`, userId, 'cancel booking', 'bookings', bookingId, updatedAt]
      );

      if (!queryLog.rows.length) {
        throw new InvariantError('Log gagal dicatat');
      }

      await client.query('COMMIT');
      logger.info(`[cancelBookingService] Booking cancelled: bookingId=${bookingId}, userId=${userId}`);
      return { id: bookingId };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(`[cancelBookingService] Failed for bookingId=${bookingId}, userId=${userId}: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

    //* Otomatis pakai node-cron
  async markNoShowBookings() {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');

      const now = new Date().toISOString();

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
          await client.query(
            'UPDATE bookings SET status = $1, updated_at = $2 WHERE id = $3',
            ['No-Show', now, booking.id]
          );

          await client.query(
            `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [`log-${nanoid(16)}`, booking.user_id, 'auto mark no-show', 'bookings', booking.id, now]
          );
        }
      }

      await client.query('COMMIT');
      logger.info(`[markNoShowBookings] Auto-marked ${bookingsToUpdate.length} bookings as No-Show`);
      return { updated: bookingsToUpdate.length };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[markNoShowBookings] Failed: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async checkInBookingService({ bookingId, userId }) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'SELECT status FROM bookings WHERE id = $1',
        [bookingId]
      );

      if (!result.rows.length) {
        throw new NotFoundError('Booking tidak ditemukan');
      }

      const booking = result.rows[0].status;

      switch (booking) {
        case 'checked out':
          throw new InvariantError('Booking sudah selesai, tidak bisa check-in');
        case 'pending_payment':
          throw new InvariantError('Check-in ditolak, silahkan selesaikan pembayaran');
        case 'cancelled':
          throw new InvariantError('Booking dibatalkan, tidak bisa check-in');
        case 'no-show':
          throw new InvariantError('Waktu check-in sudah terlewat, tidak bisa check-in');
        case 'confirmed':
          break;
        default:
          throw new InvariantError('Booking belum dikonfirmasi, tidak bisa check-in');
      }

      const updatedAt = new Date().toISOString();
      const logId = `log-${nanoid(16)}`;
      await client.query(
        `UPDATE bookings SET status = $1, updated_at = $2 WHERE id = $3`,
        ['checked-in', updatedAt, bookingId]
      );

      await client.query(
        `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [logId, userId, 'check-in booking', 'bookings', bookingId, updatedAt]
      );

      await client.query('COMMIT');
      logger.info(`[checkInBookingService] Booking checked-in: bookingId=${bookingId}, userId=${userId}`);
      return { bookingId };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[checkInBookingService] Failed for bookingId=${bookingId}, userId=${userId}: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async checkOutBookingService({ bookingId, userId }) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'SELECT status FROM bookings WHERE id = $1',
        [bookingId]
      );

      if (!result.rows.length) {
        throw new NotFoundError('Booking tidak ditemukan');
      }

      const booking = result.rows[0].status;

      switch (booking) {
        case 'pending_payment':
          throw new InvariantError('Booking belum dibayar, tidak bisa check-out');
        case 'confirmed':
          throw new InvariantError('Booking belum check-in, tidak bisa check-out');
        case 'cancelled':
          throw new InvariantError('Booking sudah dibatalkan, tidak bisa check-out');
        case 'no-show':
          throw new InvariantError('Booking sudah no-show, tidak bisa check-out');
        case 'failed':
          throw new InvariantError('Booking gagal, tidak bisa check-out');
        case 'checked-out':
          throw new InvariantError('Booking sudah selesai, tidak bisa check-out lagi');
        case 'checked-in':
          break;
        default:
          throw new InvariantError(`Status booking tidak dikenali: ${booking}`);
      }

      const updatedAt = new Date().toISOString();
      const logId = `log-${nanoid(16)}`;
      await client.query(
        `UPDATE bookings SET status = $1, updated_at = $2 WHERE id = $3`,
        ['checked-out', updatedAt, bookingId]
      );

      await client.query(
        `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [logId, userId, 'check-out booking', 'bookings', bookingId, updatedAt]
      );

      await client.query('COMMIT');
      logger.info(`[checkOutBookingService] Booking checked-out: bookingId=${bookingId}, userId=${userId}`);
      return { bookingId };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[checkOutBookingService] Failed for bookingId=${bookingId}, userId=${userId}: ${error.message}`);
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
            AND status = 'checked-out'
          ORDER BY updated_at DESC
          LIMIT 1
        `,
        values: [userId, roomId],
      };

      const result = await this._pool.query(query);
      const booking = result.rows[0] || null;

      logger.info(`[getCompletedBookingForUserRoom] Fetched completed booking: userId=${userId}, roomId=${roomId}, bookingId=${booking?.id || 'none'}`);
      return booking;
    } catch (error) {
      logger.error(`[getCompletedBookingForUserRoom] Failed for userId=${userId}, roomId=${roomId}: ${error.message}`);
      throw error;
    }
  }

  async generateInvoice({ bookingId, userId }) {
    try {
      const query = {
        text: `
          SELECT *
          FROM bookings
          WHERE id = $1 AND user_id = $2 AND status IN ('confirmed', 'checked-in', 'checked-out')
        `,
        values: [bookingId, userId],
      };

      const result = await this._pool.query(query);
      if (!result.rows.length) {
        throw new NotFoundError('Booking tidak ditemukan atau belum dibayar');
      }

      const booking = mapDBToModel.bookingTable(result.rows[0]);

      const invoicesDir = path.resolve('./invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const filePath = path.resolve(`./invoices/${bookingId}.pdf`);

      await generateBookingInvoice({
        bookingId: booking.id,
        guestName: booking.guestName,
        email: booking.customerDetails.email,
        phone: booking.customerDetails.phone,
        roomType: booking.itemDetails.name,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        totalGuests: booking.totalGuests,
        numberOfRooms: 1,
        pricePerNight: booking.itemDetails.price,
        totalNights: booking.itemDetails.quantity,
        totalPrice: booking.totalPrice
      }, filePath);  

      logger.info(`[generateInvoice] Invoice generated: bookingId=${bookingId}, userId=${userId}, filePath=${filePath}`);
      return filePath;
    } catch (error) {
      logger.error(`[generateInvoice] Failed for bookingId=${bookingId}, userId=${userId}: ${error.message}`);
      throw error;
    }
  }

  async editCancel(userId, bookingId) {
    const query = {
      text: `
      UPDATE bookings SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING id
      `,
      values: ['pending_payment', bookingId, userId]
    }

    const result = await this._pool.query(query)

    return result.rows[0].id;
  }

  async getBookingByIdAndUser({ bookingId, userId }) {
    const query = {
      text: `
        SELECT *
        FROM bookings
        WHERE id = $1 AND user_id = $2
      `,
      values: [bookingId, userId],
    };

    const result = await this._pool.query(query);

    const resultMap = result.rows.map(mapDBToModel.bookingTable);

    if (!resultMap.length) {
      throw new Error('Booking tidak ditemukan untuk user ini');
    }

    return result.rows[0]; // atau map sesuai kebutuhan
  }
}