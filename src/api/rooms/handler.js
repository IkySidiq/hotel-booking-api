import autoBind from "auto-bind";

export class RoomsHandler {
  constructor(service, validator, userService) {
    this._service = service;
    this._validator = validator;
    this._userService = userService

    autoBind(this);
  }

  async postRoomHandler(request, h) {
    try {
      const { roomType, pricePerNight, capacity, totalRooms, description } = request.payload;
      const pricePerNightNum = Number(pricePerNight);
      const capacityNum = Number(capacity);
      const totalRoomsNum = Number(totalRooms);

      this._validator.validateRoomPayload({ roomType, pricePerNightNum, capacityNum, totalRoomsNum, description });

      const { id: userId } = request.auth.credentials;
      await this._userService.verifyUser({ userId }); 
      

      const { roomId } = await this._service.addRoom({ roomType, pricePerNightNum, capacityNum, totalRoomsNum, description });

      return h.response({
        status: "success",
        data: { roomId }
      }).code(201);
    } catch (error) {
      throw error;
    }
  }

  async getRoomsHandler(request) {
    try {
      const { roomType, minPrice, maxPrice, capacity, page = 1, limit = 50 } = request.query;

      const { id: userId } = request.auth.credentials;
      await this._userService.verifyUser({ userId });

      const data = await this._service.getRooms({ roomType, minPrice, maxPrice, capacity, page, limit });

      return {
        status: "success",
        data
      };
    } catch (error) {
      throw error;
    }
  }

  async getRoomByIdHandler(request) {
    try {
      const { id: roomId } = request.params;

      const { id: userId } = request.auth.credentials;
      await this._userService.verifyUser({ userId });

      const room = await this._service.getRoomById({ roomId });

      return {
        status: "success",
        data: room
      };
    } catch (error) {
      throw error;
    }
  }

  async putRoomHandler(request) {
    try {
      const { roomType, pricePerNight, capacity, totalRooms, description } = request.payload;
      const pricePerNightNum = Number(pricePerNight);
      const capacityNum = Number(capacity);
      const totalRoomsNum = Number(totalRooms);

      this._validator.validateRoomPayload({ roomType, pricePerNightNum, capacityNum, totalRoomsNum, description });
      
      const { id: targetId } = request.params;
      const { id: userId } = request.auth.credentials;

      await this._userService.verifyUser({ userId });

      const { roomId } = await this._service.editRoom({ targetId, roomType, pricePerNightNum, capacityNum, totalRoomsNum, description });

      return {
        status: "success",
        data: { roomId }
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteRoomHandler(request) {
    try {
      const { id: roomId } = request.params;

      const { id: userId } = request.auth.credentials;
      await this._userService.verifyUser({ userId });

      const { roomId: deletedRoomId } = await this._service.deleteRoom({ roomId });

      return {
        status: "success",
        data: { roomId: deletedRoomId }
      };
    } catch (error) {
      throw error;
    }
  }
}
