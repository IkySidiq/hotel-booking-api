import dayjs from 'dayjs';
import { nanoid } from 'nanoid';
import logger from '../../utils/logger.js';

export class TransactionsService {
  constructor(pool) {
    this._pool = pool;
  }

  async createTransactionRecord({ bookingId, amount }) {
    try {
      const id = `trx-${nanoid(16)}`;
      const transactionId = `TRX-${dayjs().format('YYYYMMDD-HHmmss')}-${Math.floor(Math.random() * 1000)}`;
      const createdAt = dayjs().toISOString();

      const query = {
        text: `
          INSERT INTO transactions_records
          (id, booking_id, transaction_id, amount, payment_status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `,
        values: [id, bookingId, transactionId, amount, 'pending_payment', createdAt, createdAt],
      };

      const result = await this._pool.query(query);
      if (!result.rows.length) {
        logger.error(`[createTransactionRecord] Failed to insert transaction record bookingId=${bookingId}`);
        throw new Error('Gagal membuat catatan transaksi');
      }

      logger.info(`[createTransactionRecord] Transaction record created successfully bookingId=${bookingId} trxId=${id}`);
      return { transactionRecordId: result.rows[0].id };
    } catch (error) {
      logger.error(`[createTransactionRecord] Error bookingId=${bookingId}: ${error.message}`);
      throw error;
    }
  }

  async processPayment({ transactionCode, status }) {
    try {
      const updatedAt = new Date().toISOString();
      const paidAt = status === 'success' ? updatedAt : null;

      const result = await this._pool.query(
        `UPDATE transactions
         SET status=$1, paid_at=$2, updated_at=$3
         WHERE transaction_code=$4
         RETURNING *`,
        [status, paidAt, updatedAt, transactionCode]
      );

      if (!result.rows.length) {
        logger.warn(`[processPayment] Transaction not found transactionCode=${transactionCode}`);
        throw new Error('Transaksi tidak ditemukan');
      }

      logger.info(`[processPayment] Transaction updated transactionCode=${transactionCode} status=${status}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`[processPayment] Error transactionCode=${transactionCode}: ${error.message}`);
      throw error;
    }
  }

  async getTransactionByBookingId(bookingId) {
    try {
      const result = await this._pool.query(
        'SELECT * FROM transactions WHERE booking_id=$1 ORDER BY created_at DESC',
        [bookingId]
      );

      if (!result.rows.length) {
        logger.warn(`[getTransactionByBookingId] No transactions found bookingId=${bookingId}`);
      } else {
        logger.info(`[getTransactionByBookingId] Transactions fetched bookingId=${bookingId} count=${result.rows.length}`);
      }

      return result.rows;
    } catch (error) {
      logger.error(`[getTransactionByBookingId] Error bookingId=${bookingId}: ${error.message}`);
      throw error;
    }
  }

  async getTransactionDetail(transactionCode) {
    try {
      const result = await this._pool.query(
        'SELECT * FROM transactions WHERE transaction_code=$1',
        [transactionCode]
      );

      if (!result.rows.length) {
        logger.warn(`[getTransactionDetail] Transaction not found transactionCode=${transactionCode}`);
        return null;
      }

      logger.info(`[getTransactionDetail] Transaction fetched transactionCode=${transactionCode}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`[getTransactionDetail] Error transactionCode=${transactionCode}: ${error.message}`);
      throw error;
    }
  }
}
