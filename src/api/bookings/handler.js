import autoBind from 'auto-bind';
import { ProducerService } from '../../services/postgre/ProducerService.js';

export class BookingsHandler {
  constructor(service, validator, userService, roomsService, midtransService, transactionRecordsService) {
    this._service = service;
    this._validator = validator;
    this._usersService = userService;
    this._midtransService = midtransService;
    this._roomsService = roomsService;
    this._transactionsRecordService = transactionRecordsService;

    autoBind(this);
  }

  async postBookingHandler(request, h) {
      const { roomId, guestName, totalGuests, checkInDate, checkOutDate, specialRequest } = request.payload;
      this._validator.validateAddBookingPayload({ roomId, guestName, totalGuests, checkInDate, checkOutDate, specialRequest });

      const { id: userId } = request.auth.credentials;

      const { id, transactionToken } = await this._service.addBooking({
        userId,
        roomId,
        guestName,
        totalGuests,
        checkInDate,
        checkOutDate,
        specialRequest
      });

      return h.response({
        status: 'success',
        data: {
          id,
          transactionToken, //* Snap midtrans
        }
      }).code(201);
  }

  //*WORKED. Untuk meng-query daftar data yang belum menyelesaikan pembayaran
  async getPendingBookingsHandler(request, h) {
    const { id: userId } = request.auth.credentials;
      const bookings = await this._service.getPendingBookingsByUser({ userId });

      return h.response({
        status: 'success',
        data: bookings, 
      }).code(200);
  }

  //* WORKED. Untuk meng-query snap token
  async getSnapTokenHandler(request, h) {
    const { bookingId: targetId } = request.params;

      const booking = await this._service.getBookingById({ targetId });

      if (!booking) {
        return h.response({ status: 'fail', message: 'Booking tidak ditemukan' }).code(404);
      }

      if (!booking.snapToken) {
        return h.response({ 
          status: 'fail', 
          message: 'Booking belum memiliki Snap token' 
        }).code(404);
      }

      return h.response({
        status: 'success',
        data: { snapToken: booking.snapToken },
      }).code(200);
  }

  async getBookingsHandler(request) {
      const { guestName, status, checkInDate, checkOutDate, checkInDateEnd, checkOutDateEnd, specialRequest, totalGuests } = request.query;
      this._validator.validateGetBookingsPayload({ guestName, status, checkInDate, checkOutDate, checkInDateEnd, checkOutDateEnd, specialRequest, totalGuests });

      const { id: userId } = request.auth.credentials;
      await this._usersService.verifyUser({ userId });
      const { bookings, page, limit, totalItems, totalPages } = await this._service.getBookingsService({ guestName, status, checkInDate, checkOutDate, checkInDateEnd, checkOutDateEnd, specialRequest, totalGuests });

      return {
        status: 'success',
        data: bookings,
        page,
        limit,
        totalItems,
        totalPages,
        totalGuests
      };
  }

  async getBookingbyIdHandler(request) {
      const { id: userId } = request.auth.credentials;
      await this._usersService.verifyUser({ userId });

      const { targetId } = request.params;
      const booking = await this._service.getBookingById({ targetId });

      return {
        status: 'success',
        data: booking,
      };
  }

  async cancelBookingHandler(request) {
      const { id: userId } = request.auth.credentials;

      const { bookingId } = request.params;

      const result = await this._service.cancelBookingService({ bookingId, userId });

      return {
        status: 'success',
        data: result,
      };
  }

  async midtransNotificationHandler(request, h) {
    try {
      const { transaction_status: transactionStatus, order_id: orderId, fraud_status: fraudStatus } = request.payload;
      console.log(transactionStatus, fraudStatus, orderId)

      const result = await this._service.updateBookingStatus({ transactionStatus, orderId, fraudStatus });

      return h.response({
        status: 'success',
        message: 'Notification processed',
        data: result,
      }).code(200);

    } catch (error) {
      console.error(error);
      return h.response({
        status: 'fail',
        message: error.message,
      }).code(500);
    }
  }

  async checkInBookingHandler(request) {
      const { id: userId } = request.auth.credentials;
      await this._usersService.verifyUser({ userId });

      const { bookingId } = request.params;

      const result = await this._service.checkInBookingService({ bookingId, userId });

      return {
        status: 'success',
        data: result,
      };
  }

  async checkOutBookingHandler(request) {
      const { id: userId } = request.auth.credentials;
      await this._usersService.verifyUser({ userId });

      const { bookingId } = request.params;

      const result = await this._service.checkOutBookingService({ bookingId, userId });

      return {
        status: 'success',
        data: result,
      };
  }

  async getBookingInvoiceHandler(request, h) {
    try {
      const { bookingId } = request.params;
      const { id: userId } = request.auth.credentials;

      // validasi booking dulu
      await this._service.getBookingByIdAndUser({ bookingId, userId });

      // push ke queue RabbitMQ
      await ProducerService.sendMessage('export:invoice', { bookingId, jobId: bookingId });

      return h.response({
        status: 'success',
        message: `Invoice untuk booking ${bookingId} sedang diproses`,
      });
    } catch (err) {
      console.error(err);
      return h.response({
        status: 'error',
        message: err.message
      }).code(500);
    }
  }

  async patchCancel(request) {
    const { id: userId } = request.auth.credentials;
    const { bookingId } = request.params;
    
    const id = await this._service.editCancel(userId, bookingId)

    return {
      id
    }
  }
}
