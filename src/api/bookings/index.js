import { BookingsHandler } from './handler.js';
import { routes } from './routes.js';

export const bookings = {
  name: 'bookings',
  version: '1.0.0',
  register: async (server, { service, validator, usersService, midtransService }) => {
    const bookingsHandler = new BookingsHandler(service, validator, usersService, midtransService);
    server.route(routes(bookingsHandler));
  },
};