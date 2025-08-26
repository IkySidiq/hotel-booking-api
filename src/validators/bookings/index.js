import { InvariantError } from '../../exceptions/InvariantError.js';
import {
  AddBookingPayloadSchema,
  GetBookingsPayloadSchema,
  BookingIdParamSchema,
} from './schema.js';

const BookingsValidator = {
  validateAddBookingPayload: (payload) => {
    const validationResult = AddBookingPayloadSchema.validate(payload);

    if (validationResult.error) {
      console.log('Kesalahan pada validate add booking payload');
      throw new InvariantError(validationResult.error.message);
    }
  },

  validateGetBookingsPayload: (payload) => {
    const validationResult = GetBookingsPayloadSchema.validate(payload);

    if (validationResult.error) {
      console.log('Kesalahan pada validate get bookings payload');
      throw new InvariantError(validationResult.error.message);
    }
  },

  validateBookingIdParam: (params) => {
    const validationResult = BookingIdParamSchema.validate(params);

    if (validationResult.error) {
      console.log('Kesalahan pada validate bookingId param');
      throw new InvariantError(validationResult.error.message);
    }
  },
};

export { BookingsValidator };
