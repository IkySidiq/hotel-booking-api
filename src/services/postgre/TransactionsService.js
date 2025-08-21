import dayjs from "dayjs";
import pg from "pg";
const { Pool } = pg;
import { nanoid } from "nanoid";

export class TransactionsService {
  constructor() {
    this._pool = new Pool();
  }

  async createTransactionRecord({ bookingId, amount }) {
    const id = `trx-${nanoid(16)}`;
    const transactionCode = `TRX-${dayjs().format("YYYYMMDD-HHmmss")}-${Math.floor(Math.random() * 1000)}`;
    const createdAt = dayjs().toISOString();


    const query = {
      text: `
        INSERT INTO transactions_records
        (id, booking_id, transaction_code, amount, payment_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
      values: [
        id,
        bookingId,
        transactionCode,
        amount,
        'settlement', //! PR HARUSNYA INI DI AMBIL DARI HASIL TRANSAKSI MIDTRANS
        createdAt,
        createdAt
      ]
    };

    const result = await this._pool.query(query);
    return {
      transactionRecordId: result.rows[0].id
    }
  }

  async processPayment({ transactionCode, status }) {
    const updatedAt = new Date().toISOString();
    const paidAt = status === 'success' ? updatedAt : null;

    const result = await this._pool.query(
      `UPDATE transactions
       SET status=$1, paid_at=$2, updated_at=$3
       WHERE transaction_code=$4
       RETURNING *`,
      [status, paidAt, updatedAt, transactionCode]
    );

    if (!result.rows.length) throw new Error('Transaksi tidak ditemukan');
    return result.rows[0];
  }

  async getTransactionByBookingId(bookingId) {
    const result = await this._pool.query(
      `SELECT * FROM transactions WHERE booking_id=$1 ORDER BY created_at DESC`,
      [bookingId]
    );
    return result.rows;
  }

  async getTransactionDetail(transactionCode) {
    const result = await this._pool.query(
      `SELECT * FROM transactions WHERE transaction_code=$1`,
      [transactionCode]
    );
    return result.rows[0];
  }
}
