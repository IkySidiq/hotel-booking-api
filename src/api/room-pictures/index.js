import { RoomPicturesHandler } from './handler.js';
import { routes } from './routes.js';

export const roomPictures = {
  name: 'room-pictures',
  version: '1.0.0',
  register: async (server, { service, validator, usersService, storageService }) => {
    const roomPicturesHandler = new RoomPicturesHandler(service, validator, usersService, storageService);
    server.route(routes(roomPicturesHandler));
  },
};