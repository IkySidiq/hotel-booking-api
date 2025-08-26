import fetch from 'node-fetch'; // pastikan node >= 18, kalau versi lama install node-fetch

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
        throw new Error(errorData?.message || 'Gagal membuat transaksi Midtrans');
      }

      const data = await response.json(); //* Pada dokumentasi midrans, ini isinya ada {token, redirectUrl}
      console.log(data.redirect_url);
      return data.token;
 
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  verifySignature(notification) {
    const { order_id, status_code, gross_amount, signature_key } = notification;
    const payload = order_id + status_code + gross_amount + this._serverKey;
    const hash = crypto.createHash('sha512').update(payload).digest('hex');
    return hash === signature_key;
  }
}
