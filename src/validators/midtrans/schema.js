import Joi from 'joi';

export const CreateTransactionPayloadSchema = Joi.object({
  orderId: Joi.string().max(50).required(),
  grossAmount: Joi.number().integer().positive().required(),
});
