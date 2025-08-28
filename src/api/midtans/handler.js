export class WebhookHandler {
  constructor({ bookingService, midtransService }) {
    this._bookingService = bookingService;
    this._midtransService = midtransService;

    this.midtransNotificationHandler = this.midtransNotificationHandler.bind(this);
  }

  async midtransNotificationHandler(request, h) {
    try {
      const { order_id: orderId, transaction_status: transactionStatus, fraud_status: fraudStatus } = request.payload;

      // 1. Verifikasi signature key
      const isValid = this._midtransService.verifySignature({ orderId, transactionStatus, fraudStatus });
      if (!isValid) {
        return h.response({ status: 'error', message: 'Invalid signature' }).code(400);
      }

      // 2. Update status booking berdasarkan notification
      await this._bookingService.updateBookingStatus(orderId, transactionStatus, fraudStatus);

      return h.response('OK').code(200);
    } catch (err) {
      console.error(err);
      return h.response({ status: 'error', message: 'Internal server error' }).code(500);
    }
  }
}
