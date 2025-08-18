import pg from "pg";
import { nanoid } from "nanoid";
import { InvariantError } from "../../exceptions/InvariantError.js";
import { NotFoundError } from "../../exceptions/NotFoundError.js";

const { Pool } = pg;

export class HotelProfileService {
  constructor() {
    this._pool = new Pool();
  }

  // 1. Ambil data hotel
  async getProfile() {
    try {
      const result = await this._pool.query(
        `SELECT name, address, city, description, contact_number, email, rating, created_at, updated_at
         FROM hotel_profile
         LIMIT 1`
      );

      if (!result.rows.length) {
        throw new NotFoundError("Data profil hotel belum tersedia");
      }

      return result.rows[0];
    } catch (error) {
      console.error("Database Error (getProfile):", error);
      throw error;
    }
  }

  // 2. Update data hotel (singleton)
  async updateProfile({ name, address, city, description, contactNumber, email, rating }) {
    const client = await this._pool.connect();
    try {
      await client.query("BEGIN");

      const now = new Date().toISOString();

      // Cek apakah profile sudah ada
      const checkResult = await client.query(`SELECT COUNT(*) FROM hotel_profile`);
      const exists = parseInt(checkResult.rows[0].count, 10) > 0;

      let query, values;

      if (exists) {
        // Update
        query = `
          UPDATE hotel_profile
          SET name = $1,
              address = $2,
              city = $3,
              description = $4,
              contact_number = $5,
              email = $6,
              rating = $7,
              updated_at = $8
        `;
        values = [name, address, city, description, contactNumber, email, rating, now];
      } else {
        // Insert pertama kali
        query = `
          INSERT INTO hotel_profile
          (name, address, city, description, contact_number, email, rating, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
        `;
        values = [name, address, city, description, contactNumber, email, rating, now];
      }

      const result = await client.query(query, values);

      await client.query("COMMIT");
      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Database Error (updateProfile):", error);
      throw new InvariantError("Gagal memperbarui profil hotel");
    } finally {
      client.release();
    }
  }
}
