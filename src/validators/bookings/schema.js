import Joi from 'joi';

export const AddBookingPayloadSchema = Joi.object({
  roomId: Joi.string().required(),
  guestName: Joi.string().required(),
  checkInDate: Joi.date().iso().required(),
  checkOutDate: Joi.date().iso().greater(Joi.ref('checkInDate')).required(),
  totalGuests: Joi.number().integer().positive().required(),
  specialRequest: Joi.string().allow('').optional(),
});

export const GetBookingsPayloadSchema = Joi.object({
  guestName: Joi.string().optional(),   // search by nama tamu
  checkInDate: Joi.date().iso().optional(),  // filter tunggal check-in
  checkInDateEnd: Joi.date().iso().optional(),
  checkOutDateEnd: Joi.date().iso().optional(),
  checkOutDate: Joi.date().iso().optional(), // filter tunggal check-out
  specialRequest: Joi.string().optional(),   // kalau mau filter by request khusus
  totalGuests: Joi.number().integer().min(1).optional(), // filter jumlah tamu
  status: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),        // pagination
  limit: Joi.number().integer().min(1).max(100).default(50),
});

export const BookingIdParamSchema = Joi.object({
  bookingId: Joi.string().required(),
});
