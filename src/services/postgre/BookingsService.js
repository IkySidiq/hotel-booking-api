import dayjs from 'dayjs';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import { InvariantError } from '../../exceptions/InvariantError.js';
import { NotFoundError } from '../../exceptions/NotFoundError.js';
import { mapDBToModel } from '../../utils/index.js';
import { generateBookingInvoice } from '../../utils/invoiceGenerator.js';

export class BookingsService {
  constructor(pool, roomAvailabilityService, usersService, roomsService, midtransService, transactionsRecordService) {
    this._pool = pool;
    this._roomAvailabilityService = roomAvailabilityService;
    this._usersService = usersService; 
    this._roomsService = roomsService; 
    this._midtransService = midtransService;
    this._transactionsRecordService = transactionsRecordService;
  }

  async addBooking({ userId, roomId, guestName, totalGuests, checkInDate, checkOutDate, specialRequest }) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock & cek stok
      const { totalPrice, totalNights, pricePerNight } = await this._roomAvailabilityService.lockAndCheck({
        roomId,
        checkInDate,
        checkOutDate,
        numberOfRooms: 1,
        client,
      });
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
        name: room.roomType
      };

      // 3. Insert booking pending lengkap dengan JSON
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
          bookingId,
          userId,
          roomId,
          guestName,
          totalGuests,
          specialRequest,
          formattedCheckIn,
          formattedCheckOut,
          totalPrice,
          'pending_payment',
          now,
          now,
          customerDetails,
          itemDetails
        ]
      };
      
      const result = await this._pool.query(query);
      const resultMap = result.rows.map(mapDBToModel.bookingTable);

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
        [`log-${nanoid(16)}`, userId, 'cancel booking', 'bookings', bookingId, dayjs().toISOString()]
      );

      if (!queryLog.rows.length) {
        throw new InvariantError('Log gagal dicatat');
      }

      await client.query('COMMIT');

      // 5. Buat transaksi Midtrans di luar DB
      let transactionToken;
      try {
        const result = await this._midtransService.createTransaction({
          orderId: bookingId,
          grossAmount: totalPrice,
          customerDetails,
        });

        transactionToken = result;
      } catch (midtransError) {
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
          text: 'UPDATE bookings SET status = $1, updated_at = $2 WHERE id = $3',
          values: ['failed', dayjs().toISOString(), bookingId]
        };

        const result = await client.query(queryUpdate);

        if (!result.rows.length) {
          throw new InvariantError('Booking gagal');
        }

        throw midtransError;
      }

       const insertSnapToken = {
        text: 'UPDATE bookings SET snap_token = $1 WHERE id = $2 AND status = $3 RETURNING id',
        values: [transactionToken, bookingId, 'pending_payment'],
      };

        const snapResult = await client.query(insertSnapToken);
        if (!snapResult.rows.length) {
          throw new NotFoundError('Snap token tidak ditemukan');
        }

      // 6. Simpan record transaksi
      await this._transactionsRecordService.createTransactionRecord({
        bookingId,
        amount: totalPrice,
      });

      return {
        id: bookingId,
        transactionToken,
      };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async getPendingBookingsByUser({ userId }) {
    const result = await this._pool.query(
      `SELECT id, total_price, snap_token
      FROM bookings
      WHERE user_id = $1 AND status = 'pending_payment' AND snap_token IS NOT NULL
      ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  async getBookingsService({ guestName, status, checkInDate, checkOutDate, checkInDateEnd, checkOutDateEnd, page = 1, limit = 50 }) {
    try {
      const offset = (page - 1) * limit;
      const conditions = [];
      const whereValues = [];

      if (status) {
        conditions.push(`bookings.status = $${whereValues.length + 1}`);
        whereValues.push(status);
      }

  if (checkInDate && checkInDateEnd) {
    // Ambil tanggal saja untuk filter range
    conditions.push(`DATE(bookings.check_in_date) BETWEEN $${whereValues.length + 1} AND $${whereValues.length + 2}`);
    whereValues.push(checkInDate, checkInDateEnd);
  } else if (checkInDate) {
    // Ambil tanggal saja untuk filter single date
    conditions.push(`DATE(bookings.check_in_date) = $${whereValues.length + 1}`);
    whereValues.push(checkInDate);
  } else if (checkInDateEnd) {
    // Ambil tanggal saja untuk filter sampai tanggal tertentu
    conditions.push(`DATE(bookings.check_in_date) <= $${whereValues.length + 1}`);
    whereValues.push(checkInDateEnd);
  }

  if (checkOutDate && checkOutDateEnd) {
    // Ambil tanggal saja untuk filter range
    conditions.push(`DATE(bookings.check_out_date) BETWEEN $${whereValues.length + 1} AND $${whereValues.length + 2}`);
    whereValues.push(checkOutDate, checkOutDateEnd);
  } else if (checkOutDate) {
    // Ambil tanggal saja untuk filter single date
    conditions.push(`DATE(bookings.check_out_date) = $${whereValues.length + 1}`);
    whereValues.push(checkOutDate);
  } else if (checkOutDateEnd) {
    // Ambil tanggal saja untuk filter sampai tanggal tertentu
    conditions.push(`DATE(bookings.check_out_date) <= $${whereValues.length + 1}`);
    whereValues.push(checkOutDateEnd);
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
        bookings,
        page,
        limit,
        totalItems,
        totalPages,
      };
    } catch (error) {
      console.error('Database Error (getBookings()):', error);
      throw error('Gagal mengambil daftar booking');
    }
  }

  //*  WEBHOOK WORKED
  async updateBookingStatus({ orderId, transactionStatus, fraudStatus }) {
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
      paymentStatus = transactionStatus; // cancel / deny / expire
    } else if (transactionStatus === 'pending') {
      paymentStatus = 'pending';
    } else {
      paymentStatus = 'unknown';
    }
    // Update tabel transaction_records
    const result = await this._pool.query(
      'UPDATE transactions_records SET payment_status = $1, updated_at = $2 WHERE booking_id = $3 RETURNING id',
      [paymentStatus, dayjs().toISOString(), orderId]
    );

    if(!result.rows.length) {
      throw new InvariantError('Transactions Records Gagal Update');
    }

    // Mapping ke tabel bookings
    let bookingStatus;
    if (paymentStatus === 'settlement' || paymentStatus === 'capture') {
      bookingStatus = 'confirmed'; // pembayaran sukses
    } else if (paymentStatus === 'pending') {
      bookingStatus = 'pending'; // menunggu pembayaran
    } else if (paymentStatus === 'cancel') {
      bookingStatus = 'cancelled'; // user cancel
    } else if (paymentStatus === 'expire' || paymentStatus === 'deny') {
      bookingStatus = 'failed'; // pembayaran gagal
    } else {
      bookingStatus = 'pending_payment'; // fallback
    }

    // Update tabel bookings
    const query = await this._pool.query(
      'UPDATE bookings SET status = $1, updated_at = $2, snap_token = $1 WHERE id = $3 RETURNING id',
      [bookingStatus, dayjs().toISOString(), orderId]
    );

    if (!query.rows.length) {
      throw new NotFoundError('Gagal update bookings');
    }

    return { paymentStatus, bookingStatus };
  }

  async getBookingById({ targetId }) {
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
      return resultMap[0];
  }

  async cancelBookingService({ bookingId, userId }) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');

      // Ambil booking dari DB termasuk status
      const result = await client.query(
        `SELECT id, room_id, check_in_date, check_out_date, status
        FROM bookings 
        WHERE id = $1 AND user_id = $2`,
        [bookingId, userId]
      );

      const bookingRes = result.rows.map(mapDBToModel.bookingTable);

      if (!bookingRes.length) throw new NotFoundError('Booking tidak ditemukan atau bukan milik Anda');

      const { roomId, checkInDate, checkOutDate, status } = bookingRes[0];

      // ✅ Cek status dulu
      if (status !== 'pending_payment') {
        throw new InvariantError('Booking tidak bisa dibatalkan karena sudah diproses');
      }

      // 1. Update status booking
      const updatedAt = new Date().toISOString();
      await client.query(
        'UPDATE bookings SET status = $1, updated_at = $2 WHERE id = $3',
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
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [`log-${nanoid(16)}`, userId, 'cancel booking', 'bookings', bookingId, updatedAt]
      );

      if (!queryLog.rows.length) {
        throw new InvariantError('Log gagal dicatat');
      }

      await client.query('COMMIT');
      return { id: bookingId };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Database Error (cancelBookingService):', err);
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
            'UPDATE bookings SET status = $1, updated_at = $2 WHERE id = $3',
            ['No-Show', now, booking.id]
          );

          // 3. Catat log aktivitas
          await client.query(
            `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              `log-${nanoid(16)}`,
              booking.user_id,
              'auto mark no-show',
              'bookings',
              booking.id,
              now,
            ]
          );
        }
      }

      await client.query('COMMIT');
      return { updated: bookingsToUpdate.length };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Database Error (markNoShowBookings):', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async checkInBookingService({ bookingId, userId }) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Ambil booking dan validasi
      const result = await client.query(
        'SELECT status FROM bookings WHERE id = $1',
        [bookingId]
      );

      if (!result.rows.length) {
        throw new NotFoundError('Booking tidak ditemukan');
      }

      const booking = result.rows[0].status;

      // 2. Cek aturan bisnis
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
          // OK, boleh check-in
          break;
        default:
          throw new InvariantError('Booking belum dikonfirmasi, tidak bisa check-in');
      }

      // 3. Update check_in_status menjadi checked in
      const updatedAt = new Date().toISOString();
      const logId = `log-${nanoid(16)}`;
      await client.query(
        `UPDATE bookings
        SET status = $1, updated_at = $2
        WHERE id = $3`,
        ['checked-in', updatedAt, bookingId]
      );

      // 4. Log aktivitas
      await client.query(
        `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at) 
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [logId, userId, 'check-in booking', 'bookings', bookingId, updatedAt]
      );

      await client.query('COMMIT');
      return { bookingId };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Database Error (checkInBookingService):', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async checkOutBookingService({ bookingId, userId }) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Ambil booking dan validasi
      const result = await client.query(
        'SELECT status FROM bookings WHERE id = $1',
        [bookingId]
      );

      if (!result.rows.length) {
        throw new NotFoundError('Booking tidak ditemukan');
      }

      const booking = result.rows[0].status;

      // 2. Cek aturan bisnis
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
          // ✅ ini valid, boleh lanjut check-out
          break;

        default:
          throw new InvariantError(`Status booking tidak dikenali: ${booking}`);
      }


      // 3. Update check_in_status menjadi checked out
      const updatedAt = new Date().toISOString();
      const logId = `log-${nanoid(16)}`;
      await client.query(
        `UPDATE bookings
        SET status = $1, updated_at = $2
        WHERE id = $3`,
        ['checked-out', updatedAt, bookingId]
      );

      // 4. Log aktivitas
      await client.query(
        `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [logId, userId, 'check-out booking', 'bookings', bookingId, updatedAt]
      );

      await client.query('COMMIT');

      return { bookingId };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Database Error (checkOutBookingService):', error);
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

      // Kembalikan booking pertama yang ditemukan atau null
      return result.rows[0] || null;
    } catch (error) {
      console.error('Database Error (getCompletedBookingForUserRoom):', error);
      throw error;
    }
  }

async generateInvoice({ bookingId, userId }) {
  console.log('LOGGER', userId)
  console.log('LOGGER', bookingId)
  const query = {
    text: `
      SELECT *
      FROM bookings
      WHERE id = $1 AND user_id = $2 AND status IN ('confirmed', 'checked-in', 'checked-out')
    `,
    values: [bookingId, userId],
  };

  const result = await this._pool.query(query);
  console.log('RESULT', result.rows)

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

  return filePath;
}
}