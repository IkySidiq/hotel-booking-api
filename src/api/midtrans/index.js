import { MidtransHandler } from './handler.js';
import { routes } from './routes.js';

export const midtrans = {
  name: 'midtrans',
  version: '1.0.0',
  register: async (server, { service, validator, usersService }) => {
    const midtransHandler = new MidtransHandler(service, validator, usersService);
    server.route(routes(midtransHandler));
  },
};