import { NotFoundError } from '../../exceptions/InvariantError';
import { logger } from '../../utils/logger.js';

export class NotificationsService{
  constructor(pool) {
    this._pool = pool;
  }

  async getNotifications({ userId }) {
    try {
      const query = {
        text: 'SELECT id, type, message, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
        values: [userId],
      };

      const result = await this._pool.query(query);

      if (!result.rows.length) {
        logger.warn(`[getNotifications] Tidak ada notifikasi untuk userId=${userId}`);
        throw new NotFoundError('Data tidak ditemukan');
      }

      const unreadCountResult = await this._pool.query(
        'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
        [userId]
      );

      const unreadCount = unreadCountResult.rows.length
        ? parseInt(unreadCountResult.rows[0].count, 10)
        : 0;

      logger.info(`[getNotifications] Mengambil notifikasi userId=${userId}, total=${result.rows.length}, unread=${unreadCount}`);

      return {
        data: result.rows,
        unreadCount,
      };
    } catch (error) {
      logger.error(`[getNotifications] Error mengambil notifikasi userId=${userId}: ${error.message}`);
      throw error;
    }
  }

  async markAsRead({ userId, notificationIds }) {
    try {
      if (!notificationIds || !notificationIds.length) {
        logger.info(`[markAsRead] Tidak ada notifikasi untuk di-update userId=${userId}`);
        return { updated: 0 };
      }

      const query = {
        text: `UPDATE notifications 
               SET is_read = TRUE 
               WHERE user_id = $1 AND id = ANY($2::text[])`,
        values: [userId, notificationIds],
      };

      const result = await this._pool.query(query);

      logger.info(`[markAsRead] Menandai ${result.rowCount} notifikasi sebagai dibaca userId=${userId}`);

      return { updated: result.rowCount };
    } catch (error) {
      logger.error(`[markAsRead] Error menandai notifikasi dibaca userId=${userId}: ${error.message}`);
      throw error;
    }
  }
}