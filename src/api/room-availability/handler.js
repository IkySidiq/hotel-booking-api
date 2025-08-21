import autoBind from "auto-bind";

export class RoomAvailabilityHandler {
  constructor(service, validator, userService) {
    this._service = service;
    this._validator = validator;
    this._userService = userService;

    autoBind(this);
  }

  async checkAvailabilityHandler(request, h) {
    try {
      const { roomId, checkInDate, checkOutDate, numberOfRooms } = request.payload;

      this._validator.validateCheckAvailabilityPayload({ roomId, checkInDate, checkOutDate, numberOfRooms });

      const result = await this._service.checkAvailability({ roomId, checkInDate, checkOutDate, numberOfRooms });

      return {
        status: "success",
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }

  async generateAvailabilityHandler(request, h) {
    try {
      await this._service.generateAvailability({ monthsAhead: 6 });

      return h.response({
        status: "success",
        message: "Room availability generated for 6 months ahead",
      }).code(200);

    } catch (error) {
      console.error("Error generating availability:", error);
      return h.response({
        status: "fail",
        message: error.message,
      }).code(500);
    }
  }
}
