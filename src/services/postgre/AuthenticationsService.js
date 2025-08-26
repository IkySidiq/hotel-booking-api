import { nanoid } from 'nanoid';
import { InvariantError } from '../../exceptions/InvariantError.js';

export class AuthenticationsService{
  constructor(pool) {
    this._pool = pool;
  }

  async addRefreshToken({ refreshToken }) {
    const id = `auth-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO authentications (id, refresh_token) VALUES ($1, $2) RETURNING id',
      values: [id, refreshToken]
    };

    const result = await this._pool.query(query);
    if (!result.rows[0]?.id) {
      throw new InvariantError('Gagal menyimpan refresh token');
    }

    return result.rows[0].id;
  }

  async verifyRefreshToken(token) {
    const query = {
      text: 'SELECT token FROM authentications WHERE token = $1',
      values: [token],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new InvariantError('Refresh token tidak valid');
    }
  }

  async deleteRefreshToken(token) {
    const query = {
      text: 'DELETE FROM authentications WHERE token = $1',
      values: [token],
    };

    await this._pool.query(query);
  }
}