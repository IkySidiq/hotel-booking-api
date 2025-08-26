import Joi from 'joi';

export const UserPayloadSchema = Joi.object({
  fullname: Joi.string().required(),
  email: Joi.string().required(),
  contactNumber: Joi.string().required(),
  password: Joi.string().required(),
});