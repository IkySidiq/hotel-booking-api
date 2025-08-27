import { nanoid } from 'nanoid';
import { InvariantError } from '../../exceptions/InvariantError.js';
import { logger } from '../../utils/logger.js';

export class AuthenticationsService {
  constructor(pool) {
    this._pool = pool;
  }

  async addRefreshToken({ refreshToken }) {
    const id = `auth-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO authentications (id, refresh_token) VALUES ($1, $2) RETURNING id',
      values: [id, refreshToken]
    };

    try {
      const result = await this._pool.query(query);
      if (!result.rows[0]?.id) {
        logger.error('[AuthenticationsService] Failed to store refresh token');
        throw new InvariantError('Gagal menyimpan refresh token');
      }
      logger.info(`[AuthenticationsService] Refresh token added with id ${result.rows[0].id}`);
      return result.rows[0].id;
    } catch (error) {
      logger.error(`[AuthenticationsService] addRefreshToken error: ${error.message}`);
      throw error;
    }
  }

  async verifyRefreshToken(token) {
    const query = {
      text: 'SELECT refresh_token FROM authentications WHERE refresh_token = $1',
      values: [token],
    };

    try {
      const result = await this._pool.query(query);
      if (!result.rows.length) {
        logger.warn(`[AuthenticationsService] Invalid refresh token: ${token}`);
        throw new InvariantError('Refresh token tidak valid');
      }
      logger.info(`[AuthenticationsService] Refresh token verified successfully`);
    } catch (error) {
      logger.error(`[AuthenticationsService] verifyRefreshToken error: ${error.message}`);
      throw error;
    }
  }

  async deleteRefreshToken(token) {
    const query = {
      text: 'DELETE FROM authentications WHERE refresh_token = $1',
      values: [token],
    };

    try {
      const result = await this._pool.query(query);
      if (result.rowCount > 0) {
        logger.info(`[AuthenticationsService] Refresh token deleted: ${token}`);
      } else {
        logger.warn(`[AuthenticationsService] Refresh token not found for deletion: ${token}`);
      }
    } catch (error) {
      logger.error(`[AuthenticationsService] deleteRefreshToken error: ${error.message}`);
      throw error;
    }
  }
}