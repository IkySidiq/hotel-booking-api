import Joi from "joi";

export const HotelProfilePayloadSchema = Joi.object({
  name: Joi.string().max(100).required(),
  address: Joi.string().required(),
  city: Joi.string().required(),
  description: Joi.string().required(),
  contactNumber: Joi.string().max(20).required(),
  email: Joi.string().email().required(),
  rating: Joi.number().precision(1).min(0).max(5).optional(),
});
