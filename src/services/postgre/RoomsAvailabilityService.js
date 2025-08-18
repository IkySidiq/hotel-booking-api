import pg from "pg";
import { NotFoundError } from "../../exceptions/NotFoundError.js";
import { mapDBToModel } from "../../utils/index.js";

const { Pool } = pg;

export class RoomsAvailabilityService {
  constructor() {
    this._pool = new Pool();
  }

  async lockAndCheck({ roomId, checkInDate, checkOutDate, numberOfRooms, client }) {
    const roomResult = await client.query(
      'SELECT price_per_night FROM rooms WHERE id = $1',
      [roomId]
    );
    if (!roomResult.rows.length) throw new NotFoundError("Room not found");
    const pricePerNight = roomResult.rows[0].price_per_night;

    const query = `
      SELECT date, available_room
      FROM room_availability
      WHERE room_id = $1 AND date BETWEEN $2 AND $3
      ORDER BY date ASC
      FOR UPDATE
    `;
    const result = await client.query(query, [roomId, checkInDate, checkOutDate]);
    const rooms = result.rows.map(r => ({ date: r.date, availableRoom: r.available_room }));

    if (!rooms.length) throw new NotFoundError("Room yang anda pilih tidak ada");

    const days = this._getDatesBetween(checkInDate, checkOutDate);
    if (rooms.length < days.length || !rooms.every(r => r.availableRoom >= numberOfRooms)) {
      throw new InvariantError("Kamar tidak tersedia");
    }

    const totalNights = dayjs(checkOutDate).diff(dayjs(checkInDate), 'day');
    const totalPrice = pricePerNight * totalNights * numberOfRooms;

    return { totalPrice };
  }

  async reduceAvailability({ roomId, checkInDate, checkOutDate, numberOfRooms, client }) {
    const now = dayjs().toISOString();
    const dates = this._getDatesBetween(checkInDate, checkOutDate);

    for (const date of dates) {
      const result = await client.query(
        `UPDATE room_availability
         SET available_room = available_room - $1, updated_at = $2
         WHERE room_id = $3 AND date = $4 AND available_room >= $1
         RETURNING *`,
        [numberOfRooms, now, roomId, date]
      );

      if (!result.rows.length) {
        throw new InvariantError(`Kamar tidak tersedia pada tanggal ${date}`);
      }
    }
  }

  async increaseAvailability({ roomId, checkInDate, checkOutDate, numberOfRooms, client }) {
    const now = dayjs().toISOString();
    const dates = this._getDatesBetween(checkInDate, checkOutDate);

    for (const date of dates) {
      await client.query(
        `UPDATE room_availability
        SET available_room = available_room + $1, updated_at = $2
        WHERE room_id = $3 AND date = $4`,
        [numberOfRooms, now, roomId, date]
      );
    }
  }

  _getDatesBetween(start, end) {
    const dates = [];
    let current = dayjs(start);
    const last = dayjs(end);
    while (current.isBefore(last)) {
      dates.push(current.format("YYYY-MM-DD"));
      current = current.add(1, "day");
    }
    return dates;
  }

  async increaseAvailability({ roomId, checkInDate, checkOutDate, numberOfRooms = 1 }) {
    const client = await this._pool.connect();
    try {
      await client.query("BEGIN");
      const dates = this._getDatesBetween(checkInDate, checkOutDate);

      for (const date of dates) {
        await client.query(
          `UPDATE room_availability
           SET available_room = available_room + $1, updated_at = $2
           WHERE room_id = $3 AND date = $4`,
          [numberOfRooms, new Date().toISOString(), roomId, date]
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  //* Untuk men-generate data di table room_availability menggunakan node-cron
  async generateAvailability({ monthsAhead = 6 }) {
    const query = {
      text: `SELECT id, total_rooms FROM rooms`,
      values: []
    }

    const result = await this._pool.query(query);

    const today = dayjs();
    const endDate = today.add(monthsAhead, "month");

    for (const room of result.rows) {
      let currentDate = today;

      while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, "day")) {
        const dateStr = currentDate.format("YYYY-MM-DD");

        //* 1. Cek apakah data availability untuk room & date ini sudah ada
        const check = await this._pool.query(
          `SELECT 1 FROM room_availability 
           WHERE room_id = $1 AND date = $2 LIMIT 1`,
          [room.id, dateStr]
        );

        //* 2. Kalau belum ada → insert stok awal. Kalau stok sudah ada, maka skip agar tidak tertimpa
        if (check.rowCount === 0) {
          await this._pool.query(
            `INSERT INTO room_availability (room_id, date, available_room)
             VALUES ($1, $2, $3)`,
            [room.id, dateStr, room.total_rooms]
          );
        }

        currentDate = currentDate.add(1, "day");
      }
    }

    console.log(`Availability generated until ${endDate.format("YYYY-MM-DD")}`);
  }

  _getDatesBetween(start, end) {
    const dates = [];
    let current = dayjs(start);
    const stop = dayjs(end);

    while (current.isBefore(stop)) {
      dates.push(current.format("YYYY-MM-DD"));
      current = current.add(1, "day");
    }

    return dates;
  }
}