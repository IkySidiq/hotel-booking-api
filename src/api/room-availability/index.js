import { RoomAvailabilityHandler } from './handler.js';
import { routes } from './routes.js';

export const roomAvailability = {
  name: 'room-availability',
  version: '1.0.0',
  register: async (server, { service, validator, usersService }) => {
    const roomAvailabilityHandler = new RoomAvailabilityHandler(service, validator, usersService);
    server.route(routes(roomAvailabilityHandler));
  },
};