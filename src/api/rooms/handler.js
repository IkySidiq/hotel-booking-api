import autoBind from 'auto-bind';

export class RoomsHandler {
  constructor(service, validator, userService) {
    this._service = service;
    this._validator = validator;
    this._userService = userService;

    autoBind(this);
  }

  async postRoomHandler(request, h) {
      const { roomType, pricePerNight, capacity, totalRooms, description } = request.payload;
      const pricePerNightNum = Number(pricePerNight);
      const capacityNum = Number(capacity);
      const totalRoomsNum = Number(totalRooms);

      this._validator.validateRoomPayload({ roomType, pricePerNightNum, capacityNum, totalRoomsNum, description });

      const { id: userId } = request.auth.credentials;
      await this._userService.verifyUser({ userId }); 
      

      const roomId = await this._service.addRoom({ userId, roomType, pricePerNightNum, capacityNum, totalRoomsNum, description });

      return h.response({
        status: 'success',
        data: roomId
      }).code(201);
  }

  async getRoomsHandler(request) {
      const { roomType, minPrice, maxPrice, capacity } = request.query;

      const { id: userId } = request.auth.credentials;
      console.log(userId);
      await this._userService.verifyUser({ userId });

      const { data, page, limit, totalItems, totalPages, } = await this._service.getRooms({ roomType, minPrice, maxPrice, capacity });

      return {
        status: 'success',
        data,
        page,
        limit,
        totalItems,
        totalPages
      };
  }

  async getRoomByIdHandler(request) {
      const { id: roomId } = request.params;

      const { id: userId } = request.auth.credentials;
      await this._userService.verifyUser({ userId });

      const room = await this._service.getRoomById({ roomId });

      return {
        status: 'success',
        data: room
      };
  }

  async putRoomHandler(request) {
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
        status: 'success',
        data: { roomId }
      };
  }

  async deleteRoomHandler(request) {
      const { id: roomId } = request.params;

      const { id: userId } = request.auth.credentials;
      await this._userService.verifyUser({ userId });

      const { roomId: deletedRoomId } = await this._service.deleteRoom({ roomId });

      return {
        status: 'success',
        data: { id: deletedRoomId }
      };
  }
}
