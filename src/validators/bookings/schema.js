import Joi from "joi";

export const AddBookingPayloadSchema = Joi.object({
  roomId: Joi.string().required(),
  guestName: Joi.string().required(),
  checkInDate: Joi.date().iso().required(),
  checkOutDate: Joi.date().iso().greater(Joi.ref("checkInDate")).required(),
  totalGuests: Joi.number().integer().positive().required(),
  specialRequest: Joi.string().allow("").optional(),
});

export const GetBookingsPayloadSchema = Joi.object({
  status: Joi.string().valid("pending", "confirmed", "cancelled", "checked_in", "checked_out").optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

export const BookingIdParamSchema = Joi.object({
  bookingId: Joi.string().required(),
});
