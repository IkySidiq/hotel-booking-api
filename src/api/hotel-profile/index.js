import { HotelProfileHandler } from './handler.js';
import { routes } from './routes.js';

export const hotelProfile = {
  name: 'hotelProfile',
  version: '1.0.0',
  register: async (server, { service, validator }) => {
    const hotelProfileHandler = new HotelProfileHandler(service, validator);
    server.route(routes(hotelProfileHandler));
  },
};