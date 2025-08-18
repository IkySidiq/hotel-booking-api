export class MidtransHandler {
  constructor(service) {
    this._service = service;
  }

  async createTransactionHandler(request, h) {
    try {
      const { orderId } = request.payload;
      const grossAmount = Number(request.payload.grossAmount);

      this._validator.validateCreateTransactionPayload(request.payload);
      const transaction = await this._service.createTransaction(orderId, grossAmount);

      return h.response({
        status: "success",
        data: transaction,
      }).code(201);
    } catch (error) {
      throw error;
    }
  }
}
