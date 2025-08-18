import { ReviewsHandler } from './handler.js';
import { routes } from './routes.js';

export const reviews = {
  name: 'reviews',
  version: '1.0.0',
  register: async (server, { service, validator, usersService }) => {
    const reviewsHandler = new ReviewsHandler(service, validator, usersService);
    server.route(routes(reviewsHandler));
  },
};