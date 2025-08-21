import { AuthenticationsHandler } from './handler.js';
import { routes } from './routes.js';

export const authentications = {
  name: 'authentications',
  version: '1.0.0',
  register: async (server, { service, usersService, tokenManager, validator }) => {
    const authenticationsHandler = new AuthenticationsHandler(
      service,
      usersService,
      tokenManager,
      validator
    );
    server.route(routes(authenticationsHandler));
  },
};
