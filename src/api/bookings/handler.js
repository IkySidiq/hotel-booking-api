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

  async getPendingBookingsHandler(request, h) {
    const { userId } = request.auth.credentials;
    const bookings = await this._bookingsService.getPendingBookingsByUserId({ userId });

    // bikin snap token baru utk tiap booking kalau mau selalu fresh
    const updatedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const { transactionToken } = await this._midtransService.createTransaction({
          orderId: booking.bookingId,
          grossAmount: booking.totalPrice,
          itemDetails: booking.itemDetails,
          customerDetails: booking.customerDetails,
        });

        // update token di DB
        await this._bookingsService.updateSnapToken(booking.bookingId, transactionToken);

        return {
          bookingId: booking.booking_id,
          transactionToken, //* Snap midtrans
        };
      })
    );

    return {
      status: 'success',
      data: updatedBookings,
    };
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

  async getBookingbyIdHandler(request, h) {
    try {
      const { id: userId } = request.auth.credentials;
      await this._usersService.verifyUser({ userId });

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
