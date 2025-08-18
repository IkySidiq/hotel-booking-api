import dotenv from 'dotenv';
dotenv.config();
import Hapi from '@hapi/hapi';
import Jwt from '@hapi/jwt';
import Inert from '@hapi/inert';
import { ClientError } from "./exceptions/ClientError.js";

//Users
import { UsersService } from './services/postgre/UsersService.js';
import { UserValidator } from './validators/users/index.js';
import { users } from './api/users/index.js';

//Auth
import { AuthenticationsService } from './services/postgre/AuthenticationsService.js';
import { AuthenticationsValidator } from './validators/authentications/index.js';
import { authentications } from './api/authentications/index.js';

// Tokenize
import { TokenManager } from './tokenize/TokenManager.js';

// Rooms
import { RoomsService } from './services/postgre/RoomsService.js';
import { RoomsValidator } from './validators/rooms/index.js';
import { rooms } from './api/users/index.js';

// Room-Pictures
import { RoomPicturesService } from './services/postgre/RoomPicturesService.js';
import { RoomPicturesValidator } from './validators/room-pictures/index.js';
import { roomPictures } from './api/room-pictures/index.js';

// Room-Availability
import { RoomsAvailabilityService } from './services/postgre/RoomsAvailabilityService.js';
import { RoomAvailabilityValidator } from './validators/room-availability/index.js';
import { roomAvailability } from './api/room-availability/index.js';

// Bookings
import { BookingsService } from './services/postgre/BookingsService.js';
import { BookingsValidator } from './validators/bookings/index.js';
import { bookings } from './api/bookings/index.js';

// Reviews
import { ReviewsService } from './services/postgre/ReviewsService.js';
import { ReviewsValidator } from './validators/reviews/index.js';
import { reviews } from './api/reviews/index.js';

const init = async() => {
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();
  const roomsService = new RoomsService();
  const roomPicturesService = new RoomPicturesService();
  const roomAvailabilityService = new RoomsAvailabilityService();
  const bookingsService = new BookingsService(roomAvailability);
  const reviewsService = new ReviewsService();

  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  });

  await server.register([Jwt, Inert]);

  server.auth.strategy('booking_hotel_jwt', 'jwt', {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id,
      },
    }),
  });

  await server.register([
    {
      plugin: users,
      options: {
        service: usersService,
        validator: UserValidator
      }
    },
    {
      plugin: authentications,
      options: {
        service: authenticationsService,
        validator: AuthenticationsValidator,
        tokenManager: TokenManager,
        usersService
      }
    },
    {
      plugin: rooms,
      options: {
        service: roomsService,
        validator: RoomsValidator,
        usersService
      }
    },
    {
      plugin: roomPictures,
      options: {
        service: roomPicturesService,
        validator: RoomPicturesValidator,
        usersService
      }
    },
    {
      plugin: roomAvailability,
      options: {
        service: roomAvailabilityService,
        validator: RoomAvailabilityValidator,
        usersService
      }
    },
    {
      plugin: bookings,
      options: {
        service: bookingsService,
        validator: BookingsValidator,
        usersService
      }
    },
    {
      plugin: reviews,
      options: {
        service: reviewsService,
        validator: ReviewsValidator,
        usersService
      }
    },
  ]);

    server.ext('onPreResponse', (request, h) => {
    const { response } = request;

    if (response instanceof Error) {
      if (response instanceof ClientError) {
        return h
          .response({
            status: 'fail',
            message: response.message,
          })
          .code(response.statusCode);
      }

      if (!response.isServer) {return h.continue;}

      console.error(response);
      return h
        .response({
          status: 'error',
          message: 'Maaf, terjadi kegagalan pada server kami.',
        })
        .code(500);
    }

    return h.continue;
  });

  await server.start();
  console.log(`\n✅ Server berjalan pada ${server.info.uri}`);
}

init();