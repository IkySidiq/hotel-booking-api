import dayjs from 'dayjs';
import { NotFoundError } from '../../exceptions/NotFoundError.js';
import { InvariantError } from '../../exceptions/InvariantError.js';
import { nanoid } from 'nanoid';

export class RoomsAvailabilityService {
  constructor(pool) {
    this._pool = pool;
  }

async lockAndCheck({ roomId, checkInDate, checkOutDate, numberOfRooms, client }) {
  const roomResult = await client.query(
    'SELECT price_per_night as "pricePerNight" FROM rooms WHERE id = $1',
    [roomId]
  );
  if (!roomResult.rows.length) throw new NotFoundError('Room not found');
  const pricePerNight = Number(roomResult.rows[0].pricePerNight);

  const query = {
    text: `
      SELECT date, available_rooms as "availableRoom"
      FROM room_availability
      WHERE room_id = $1 AND date BETWEEN $2 AND $3
      ORDER BY date ASC
      FOR UPDATE
    `,
    values: [roomId, checkInDate, checkOutDate]
  };
  const result = await client.query(query);

  if (!result.rows.length) throw new NotFoundError('Room yang anda pilih tidak ada');

  const days = this._getDatesBetween(checkInDate, checkOutDate);

  // Debug tiap row
  result.rows.forEach((r, i) => {
    console.log(
      `Row ke-${i + 1}: date=${r.date}, availableRoom=${r.availableRoom}, cukup?`,
      r.availableRoom >= numberOfRooms
    );
  });

  const isEnough = result.rows.every(r => r.availableRoom >= numberOfRooms);

  if (result.rows.length < days.length || !isEnough) {
    throw new InvariantError('Kamar tidak tersedia');
  }

  const totalNights = dayjs(checkOutDate).diff(dayjs(checkInDate), 'day');
  const totalPrice = pricePerNight * totalNights * numberOfRooms;

  return { totalPrice, totalNights, pricePerNight };
}


  async reduceAvailability({ roomId, userId, checkInDate, checkOutDate, numberOfRooms, client }) {
    const now = dayjs().toISOString();
    const dates = this._getDatesBetween(checkInDate, checkOutDate);

    for (const date of dates) {
      const result = await client.query(
        `UPDATE room_availability
         SET available_rooms = available_rooms - $1, updated_at = $2
         WHERE room_id = $3 AND date = $4 AND available_rooms >= $1
         RETURNING id`,
        [numberOfRooms, now, roomId, date]
      );

      if (!result.rows.length) {
        throw new InvariantError(`Kamar tidak tersedia pada tanggal ${date}`);
      }

    const queryLog = await client.query(
      `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [`log-${nanoid(16)}`, userId, 'reduce availability', 'room_availability', result.rows[0].id, dayjs().toISOString()]
    );

    if (!queryLog.rows.length) {
      throw new InvariantError('Log gagal dicatat');
    }
    }
  }

  async increaseAvailability({ roomId, userId, checkInDate, checkOutDate, numberOfRooms, client }) {
    const now = dayjs().toISOString();
    const dates = this._getDatesBetween(checkInDate, checkOutDate);

    for (const date of dates) {
      const result = await client.query(
        `UPDATE room_availability
        SET available_rooms = available_rooms + $1, updated_at = $2
        WHERE room_id = $3 AND date = $4
        RETURNING id`,
        [numberOfRooms, now, roomId, date]
      );

      if (!result.rows.length) {
        throw new InvariantError(`Gagal menambah availability pada tanggal ${date}`);
      }

      const queryLog = await client.query(
        `INSERT INTO active_logs (id, user_id, action, target_table, target_id, performed_at)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          `log-${nanoid(16)}`,
          userId,
          'increase availability',
          'room_availability',
          result.rows[0].id,
          now,
        ]
      );

      if (!queryLog.rows.length) {
        throw new InvariantError('Log gagal dicatat');
      }
    }
  }

  //* Untuk men-generate data di table room_availability menggunakan node-cron
  async generateAvailability({ monthsAhead = 3 }) {
    const query = {
      text: 'SELECT id, total_rooms FROM rooms',
      values: []
    };

    const result = await this._pool.query(query);

    const today = dayjs();
    const endDate = today.add(monthsAhead, 'month');

    for (const room of result.rows) {
      let currentDate = today;

      while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
        const id = `RA-${nanoid(16)}`;
        const dateStr = currentDate.format('YYYY-MM-DD');

        //* 1. Cek apakah data availability untuk room & date ini sudah ada
        const check = await this._pool.query(
          `SELECT 1 FROM room_availability 
           WHERE room_id = $1 AND date = $2 LIMIT 1`,
          [room.id, dateStr]
        );

        //* 2. Kalau belum ada → insert stok awal. Kalau stok sudah ada, maka skip agar tidak tertimpa
        if (check.rowCount === 0) {
          await this._pool.query(
            `INSERT INTO room_availability (id, room_id, date, available_rooms)
             VALUES ($1, $2, $3, $4)`,
            [id, room.id, dateStr, room.total_rooms]
          );
        }

        currentDate = currentDate.add(1, 'day');
      }
    }

    console.log(`Availability generated until ${endDate.format('YYYY-MM-DD')}`);
  }

_getDatesBetween(start, end) {
  const dates = [];
  let current = dayjs(start);
  const stop = dayjs(end);

  while (current.isBefore(stop) || current.isSame(stop, 'day')) { // include check-out
    dates.push(current.format('YYYY-MM-DD'));
    current = current.add(1, 'day');
  }

  return dates;
}
}