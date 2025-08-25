import { nanoid } from "nanoid";
import { InvariantError } from "../../exceptions/InvariantError.js";
import { NotFoundError } from "../../exceptions/NotFoundError.js";

export class HotelProfileService {
  constructor(pool) {
    this._pool = pool;
  }

  // =====================
  // GET PROFILE HOTEL
  // =====================
  async getProfile() {
    try {
      const result = await this._pool.query(
        `SELECT id, name, address, city, description, contact_number, email, rating, created_at, updated_at
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

  // =====================
  // POST PROFILE HOTEL (Singleton)
  // =====================
  async addProfile({ name, address, city, description, contactNumber, email, rating }) {
    const client = await this._pool.connect();
    try {
      await client.query("BEGIN");
      console.log(name, address, city, description, contactNumber, email, rating)
      // Cek apakah sudah ada profile
      const checkResult = await client.query(`SELECT COUNT(*) FROM hotel_profile`);
      const exists = parseInt(checkResult.rows[0].count, 10) > 0;

      if (exists) {
        throw new InvariantError("Profil hotel sudah ada, tidak bisa menambahkan lagi");
      }

      const now = new Date().toISOString();
      const id = `hotel-${nanoid(12)}`;

      const query = `
        INSERT INTO hotel_profile
        (id, name, address, city, description, contact_number, email, rating, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
        RETURNING id
      `;
      const values = [id, name, address, city, description, contactNumber, email, rating, now];

      const result = await client.query(query, values);

      if (!result.rows.length) {
        throw new InvariantError("Gagal menambahkan profil hotel");
      }

      await client.query("COMMIT");
      return result.rows[0].id;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Database Error (addProfile):", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // =====================
  // UPDATE PROFILE HOTEL
  // =====================
  async updateProfile({ name, address, city, description, contactNumber, email, rating }) {
    const client = await this._pool.connect();
    try {
      await client.query("BEGIN");

      const now = new Date().toISOString();

      // Ambil id profile
      const checkResult = await client.query(`SELECT id FROM hotel_profile LIMIT 1`);
      if (!checkResult.rows.length) {
        throw new NotFoundError("Profil hotel belum tersedia, gunakan POST untuk menambahkan");
      }
      const id = checkResult.rows[0].id;

      const query = `
        UPDATE hotel_profile
        SET name = $1,
            address = $2,
            city = $3,
            description = $4,
            contact_number = $5,
            email = $6,
            rating = $7,
            updated_at = $8
        WHERE id = $9
        RETURNING id
      `;
      const values = [name, address, city, description, contactNumber, email, rating, now, id];

      const result = await client.query(query, values);

      if (!result.rows.length) {
        throw new InvariantError("Gagal memperbarui profil hotel");
      }

      await client.query("COMMIT");
      return result.rows[0].id;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Database Error (updateProfile):", error);
      throw error;
    } finally {
      client.release();
    }
  }
}
