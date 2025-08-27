import fetch from 'node-fetch'; // pastikan node >= 18, kalau versi lama install node-fetch
import logger from '../../utils/logger.js';

export class MidtransService {
  constructor() {
    this._serverKey = process.env.MIDTRANS_SERVER_KEY;
    this._baseUrl = process.env.MIDTRANS_SANDBOX_URL;
  }

  async createTransaction({ orderId, grossAmount, customerDetails }) {
    const auth = Buffer.from(`${this._serverKey}:`).toString('base64');

    const payload = {
      transaction_details: { order_id: orderId, gross_amount: grossAmount },
      customer_details: customerDetails,
    };

    try {
      const response = await fetch(this._baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.warn(`[createTransaction] Midtrans response not OK: ${JSON.stringify(errorData)}`);
        throw new Error(errorData?.message || 'Gagal membuat transaksi Midtrans');
      }

      const data = await response.json(); // {token, redirectUrl}
      logger.info(`[createTransaction] Transaksi berhasil dibuat: orderId=${orderId}, redirectUrl=${data.redirect_url}`);
      return data.token;

    } catch (error) {
      logger.error(`[createTransaction] Error membuat transaksi Midtrans: ${error.message}`);
      throw error;
    }
  }

  verifySignature(notification) {
    try {
      const { order_id, status_code, gross_amount, signature_key } = notification;
      const payload = order_id + status_code + gross_amount + this._serverKey;
      const hash = crypto.createHash('sha512').update(payload).digest('hex');

      const isValid = hash === signature_key;
      logger.info(`[verifySignature] OrderId=${order_id} signature valid=${isValid}`);
      return isValid;
    } catch (error) {
      logger.error(`[verifySignature] Error verifikasi signature: ${error.message}`);
      return false;
    }
  }
}
