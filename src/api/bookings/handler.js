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


  async addBookingHandler(request, h) {
    try {
      // 1. Validasi payload
      const { roomId, guestName, totalGuests, checkInDate, checkOutDate, specialRequest } = request.payload;
      this._validator.validateAddBookingPayload({ roomId, guestName, totalGuests, checkInDate, checkOutDate, specialRequest });

      const { id: userId } = request.auth.credentials;

      // 2. Panggil service untuk menambahkan booking
      const { booking, user, room, transaction, transactionRecord } = await this._bookingService.addBooking({
        userId,
        roomId,
        guestName,
        totalGuests,
        checkInDate,
        checkOutDate,
        specialRequest
      });

      // 3. Kirim response sukses
      return h.response({
        status: "success",
        data: {
          booking,
          user,
          room,
          transactionHistoryId: transactionRecord.id,
          snapToken: transaction.snap_token
        }
      }).code(201);

    } catch (error) {
      // Biarkan error diteruskan ke onPreResponse
      throw error;
    }
  }

  async getBookingsHandler(request, h) {
    try {
      this._validator.validateGetBookingsPayload(request.query);

      const { id: userId } = request.auth.credentials;
      await this._userService.verifyUser({ userId });

      const bookings = await this._service.getBookingsService(request.query);

      return {
        status: "success",
        data: bookings,
      };
    } catch (error) {
      throw error;
    }
  }

  async getBookingByIdHandler(request, h) {
    try {
      const { id: userId } = request.auth.credentials;
      await this._userService.verifyUser({ userId });

      const { bookingId } = request.params;
      const booking = await this._service.getBookingById({ targetId: bookingId });

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
      await this._userService.verifyUser({ userId });

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

  async checkInBookingHandler(request, h) {
    try {
      const { id: userId } = request.auth.credentials;
      await this._userService.verifyUser({ userId });

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
      await this._userService.verifyUser({ userId });

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
