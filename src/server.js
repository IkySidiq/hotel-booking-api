import Hapi from '@hapi/hapi';
import Jwt from '@hapi/jwt';
import Inert from '@hapi/inert';
import path from 'path';
import cron from 'node-cron';
import { ClientError } from './exceptions/ClientError.js';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import dotenv from 'dotenv';
dotenv.config();
import { Pool, types } from 'pg';
types.setTypeParser(1082, (val) => val);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
import { rooms } from './api/rooms/index.js';

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

// Hotel-profile
import { HotelProfileService } from './services/postgre/HotelProfileService.js';
import { HotelProfileValidator } from './validators/hotel-profile/index.js';
import { hotelProfile } from './api/hotel-profile/index.js';

// Cache
import { CacheService } from './services/postgre/CacheService.js';

// Storage
import { StorageService } from './services/storageService/StorageService.js';

// TrransactionsService
import { TransactionsService } from './services/postgre/TransactionsService.js';

// Midtrans
import { MidtransService } from './services/postgre/MidtransService.js';

const init = async() => {
  const cacheService = new CacheService();
  const usersService = new UsersService(pool);
  const authenticationsService = new AuthenticationsService(pool);
  const roomsService = new RoomsService(pool);
  const roomPicturesService = new RoomPicturesService(pool);
  const roomAvailabilityService = new RoomsAvailabilityService(pool);
  const midtransService = new MidtransService(pool);
  const transactionsService = new TransactionsService(pool);
  const bookingsService = new BookingsService(pool, roomAvailabilityService, usersService, roomsService, midtransService, transactionsService);
  const reviewsService = new ReviewsService(pool, bookingsService);
  const hotelProfileService = new HotelProfileService(pool);
  const storageService = new StorageService(path.resolve(__dirname, 'api/room-pictures/pictures'));

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
        usersService,
        storageService
      }
    },
    {
      plugin: roomAvailability,
      options: {
        service: roomAvailabilityService,
        validator: RoomAvailabilityValidator,
        usersService,
      }
    },
    {
      plugin: bookings,
      options: {
        service: bookingsService,
        validator: BookingsValidator,
        usersService,
        midtransService
      }
    },
    {
      plugin: reviews,
      options: {
        service: reviewsService,
        validator: ReviewsValidator,
        bookingsService
      }
    },
    {
      plugin: hotelProfile,
      options: {
        service: hotelProfileService,
        validator: HotelProfileValidator,
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

  cron.schedule('0 * * * *', async () => {
    try {
      const result = await bookingsService.markNoShowBookings();
      console.log(`[${new Date().toISOString()}] ✅ Marked no-show for ${result.updated} bookings`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to mark no-show bookings:`, error);
    }
  });

  cron.schedule('0 0 1 1,4,7,10 *', async () => {
    try {
      await roomAvailabilityService.generateAvailability({ monthsAhead: 3 });
      console.log(`[${new Date().toISOString()}] ✅ Room availability generated for next 6 months`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to generate room availability:`, error);
    }
  });

  await server.start();
  console.log(`\n✅ Server berjalan pada ${server.info.uri}`);
};

init();