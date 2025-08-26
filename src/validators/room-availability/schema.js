import Joi from 'joi';

export const CheckAvailabilityPayloadSchema = Joi.object({
  roomId: Joi.string().required(),
  checkInDate: Joi.date().iso().required(),
  checkOutDate: Joi.date().iso().greater(Joi.ref('checkInDate')).required(),
  numberOfRooms: Joi.number().integer().min(1).required(),
});
