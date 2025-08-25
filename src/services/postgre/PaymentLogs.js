import { NotFoundError } from '../exceptions/InvariantError.js';

export class PaymentLogsService {
  constructor(pool) {
    this._pool = pool;
  }

  async logPaymentEvent({ transactionId, eventType, payload }) {
    const id = `paylog-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();

    const query = {
      text: `
        INSERT INTO payment_logs (id, transaction_id, event_type, payload, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      values: [id, transactionId, eventType, payload, createdAt],
    };

    const result = await this._pool.query(query);
    return result.rows[0].id;
  }

  async getPaymentLogsByTransaction(transactionId) {
    const query = {
      text: `
        SELECT id, transaction_id, event_type, payload, created_at
        FROM payment_logs
        WHERE transaction_id = $1
        ORDER BY created_at ASC
      `,
      values: [transactionId],
    };

    const result = await this._pool.query(query);
    return result.rows;
  }

  async getPaymentLogById(id) {
    const query = {
      text: `
        SELECT id, transaction_id, event_type, payload, created_at
        FROM payment_logs
        WHERE id = $1
      `,
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError('Payment log tidak ditemukan');
    }

    return result.rows[0];
  }
}
