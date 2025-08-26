import Joi from 'joi';

export const RoomPayloadSchema = Joi.object({
  roomType: Joi.string().required(),
  pricePerNightNum: Joi.number().positive().required(),
  capacityNum: Joi.number().integer().positive().required(),
  totalRoomsNum: Joi.number().integer().positive().required(),
  description: Joi.string().allow('').optional(),
});
