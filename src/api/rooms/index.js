import { RoomsHandler } from './handler.js';
import { routes } from './routes.js';

export const rooms = {
  name: 'rooms',
  version: '1.0.0',
  register: async (server, { service, validator, usersService }) => {
    const roomsHandler = new RoomsHandler(service, validator, usersService);
    server.route(routes(roomsHandler));
  },
};