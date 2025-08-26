import { NotFoundError } from '../../exceptions/InvariantError';

export class NotificationsService{
  constructor(pool) {
    this._pool = pool;
  }

  async getNotifications({ userId }) {
    const query = {
      text: 'SELECT id, type, message, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      values: [userId]
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw NotFoundError('Data tidak ditemukan');
    }

    const unreadCountResult = await this._pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    if (!unreadCountResult.rows.length) {
      throw NotFoundError('Data tidak ditemukan');
    }

    return {
      data: result.rows,
      unreadCount: parseInt(unreadCountResult.rows[0].count, 10)
    };
  }

  async markAsRead({ userId, notificationIds }) {
    if (!notificationIds || !notificationIds.length) return;

    const query = {
      text: `UPDATE notifications 
            SET is_read = TRUE 
            WHERE user_id = $1 AND id = ANY($2::text[])`,
      values: [userId, notificationIds]
    };

    const result = await this._pool.query(query);
    return { updated: result.rowCount }; // jumlah notifikasi yang berhasil di-update
  }
}