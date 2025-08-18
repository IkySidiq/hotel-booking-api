import { Pool } from "pg";
import { nanoid } from "nanoid";
import { NotFoundError } from "../exceptions/NotFoundError.js";

export class PaymentMethodsService {
  constructor() {
    this._pool = new Pool();
  }

  async addPaymentMethod({ name, providerCode, isActive }) {
    const id = `paym-${nanoid(16)}`;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const query = {
      text: `INSERT INTO payment_methods
             (id, name, provider_code, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, name, provider_code, is_active`,
      values: [id, name, providerCode, isActive, createdAt, updatedAt],
    };

    const result = await this._pool.query(query);
    return result.rows[0];
  }

  async getPaymentMethods({ onlyActive = false } = {}) {
    let text = `SELECT id, name, provider_code, is_active
                FROM payment_methods`;
    if (onlyActive) text += ` WHERE is_active = true`;
    text += ` ORDER BY name ASC`;

    const result = await this._pool.query(text);
    return result.rows;
  }

  async getPaymentMethodById(id) {
    const query = {
      text: `SELECT id, name, provider_code, is_active
             FROM payment_methods WHERE id = $1`,
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Metode pembayaran tidak ditemukan");
    }
    return result.rows[0];
  }

  async updatePaymentMethod({ id, name, providerCode, isActive }) {
    const updatedAt = new Date().toISOString();
    const query = {
      text: `UPDATE payment_methods
             SET name = $1, provider_code = $2, is_active = $3, updated_at = $4
             WHERE id = $5 RETURNING id`,
      values: [name, providerCode, isActive, updatedAt, id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Metode pembayaran tidak ditemukan");
    }
    return { id };
  }

  async deletePaymentMethod(id) {
    const query = {
      text: `DELETE FROM payment_methods WHERE id = $1 RETURNING id`,
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Metode pembayaran tidak ditemukan");
    }
    return { id };
  }
}
