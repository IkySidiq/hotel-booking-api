import dayjs from "dayjs";

export class TransactionsService {
  constructor(pool) {
    this._pool = pool;
  }

  async createTransactionRecord({ bookingId, amount }) {
    const id = `trx-${nanoid(16)}`;
    const transactionCode = `TRX-${dayjs().format("YYYYMMDD-HHmmss")}-${Math.floor(Math.random() * 1000)}`;
    const createdAt = dayjs().toISOString();


    const query = {
      text: `
        INSERT INTO transactions_records
        (id, booking_id, transaction_code, amount, status, payment_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
      values: [
        id,
        bookingId,
        transactionCode,
        amount,
        'pending',
        'unpaid',
        createdAt,
        createdAt
      ]
    };

    const result = await this._pool.query(query);
    return result.rows[0];
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
