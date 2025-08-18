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
}
