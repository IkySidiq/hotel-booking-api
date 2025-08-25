import autoBind from "auto-bind";

export class BookingsHandler {
  constructor(service, validator, userService, roomsService, midtransService, transactionRecordsService) {
    this._service = service;
    this._validator = validator;
    this._usersService = userService;
    this._midtransService = midtransService;
    this._roomsService = roomsService;
    this._transactionsRecordService = transactionRecordsService;

    autoBind(this)
  }

  async postBookingHandler(request, h) {
    try {
      const { roomId, guestName, totalGuests, checkInDate, checkOutDate, specialRequest } = request.payload;
      this._validator.validateAddBookingPayload({ roomId, guestName, totalGuests, checkInDate, checkOutDate, specialRequest });

      const { id: userId } = request.auth.credentials;

      const { bookingId, transactionToken } = await this._service.addBooking({
        userId,
        roomId,
        guestName,
        totalGuests,
        checkInDate,
        checkOutDate,
        specialRequest
      });

      return h.response({
        status: "success",
        data: {
          bookingId,
          transactionToken, //* Snap midtrans
        }
      }).code(201);
    } catch (error) {
      throw error;
    }
  }

  //*WORKED. Untuk meng-query daftar data yang belum menyelesaikan pembayaran
  async getPendingBookingsHandler(request, h) {
    const { id: userId } = request.auth.credentials;

    try {
      const bookings = await this._service.getPendingBookingsByUser({ userId });

      return h.response({
        status: "success",
        data: bookings, 
      }).code(200);

    } catch (error) {
      throw error;
    }
  }

  //* WORKED. Untuk meng-query snap token
  async getSnapTokenHandler(request, h) {
    const { bookingId: targetId } = request.params;

    try {
      const booking = await this._service.getBookingById({ targetId });

      if (!booking) {
        return h.response({ status: "fail", message: "Booking tidak ditemukan" }).code(404);
      }

      if (!booking.snapToken) {
        return h.response({ 
          status: "fail", 
          message: "Booking belum memiliki Snap token" 
        }).code(404);
      }

      return h.response({
        status: "success",
        data: { snapToken: booking.snapToken },
      }).code(200);

    } catch (error) {
      throw error;
    }
  }

  async getBookingsHandler(request, h) {
    try {
      const { guestName, status, checkInDate, checkOutDate, checkInDateEnd, checkOutDateEnd, specialRequest, totalGuests } = request.query;
      this._validator.validateGetBookingsPayload({ guestName, status, checkInDate, checkOutDate, checkInDateEnd, checkOutDateEnd, specialRequest, totalGuests });

      const { id: userId } = request.auth.credentials;
      await this._usersService.verifyUser({ userId });
      console.log(checkOutDate)
      const bookings = await this._service.getBookingsService({ guestName, status, checkInDate, checkOutDate, checkInDateEnd, checkOutDateEnd, specialRequest, totalGuests });

      return {
        status: "success",
        data: bookings,
      };
    } catch (error) {
      throw error;
    }
  }

  async getBookingbyIdHandler(request, h) {
    try {
      const { id: userId } = request.auth.credentials;
      await this._usersService.verifyUser({ userId });

      const { targetId } = request.params;
      const booking = await this._service.getBookingById({ targetId });

      return {
        status: "success",
        data: booking,
      };
    } catch (error) {
      throw error;
    }
  }

  async cancelBookingHandler(request, h) {
    try {
      const { id: userId } = request.auth.credentials;

      const { bookingId } = request.params;

      const result = await this._service.cancelBookingService({ bookingId, userId });

      return {
        status: "success",
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }

  async midtransNotificationHandler(request, h) {
    try {
      const { transaction_status: transactionStatus, order_id: orderId, fraud_status: fraudStatus } = request.payload;

      // update status booking pakai service
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

  async checkInBookingHandler(request, h) {
    try {
      const { id: userId } = request.auth.credentials;
      await this._usersService.verifyUser({ userId });

      const { bookingId } = request.params;

      const result = await this._service.checkInBookingService({ bookingId, userId });

      return {
        status: "success",
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }

  async checkOutBookingHandler(request, h) {
    try {
      const { id: userId } = request.auth.credentials;
      await this._usersService.verifyUser({ userId });

      const { bookingId } = request.params;

      const result = await this._service.checkOutBookingService({ bookingId, userId });

      return {
        status: "success",
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }
}
