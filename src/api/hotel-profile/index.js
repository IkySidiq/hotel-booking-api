import { HotelProfileHandler } from './handler.js';
import { routes } from './routes.js';

export const hotelProfile = {
  name: 'hotelProfile',
  version: '1.0.0',
  register: async (server, { service, validator, usersService }) => {
    const hotelProfileHandler = new HotelProfileHandler(service, validator, usersService);
    server.route(routes(hotelProfileHandler));
  },
};