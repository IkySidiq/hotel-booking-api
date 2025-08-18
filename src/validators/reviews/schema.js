import Joi from "joi";

export const ReviewPayloadSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().allow("").optional(),
  bookId: Joi.string().optional(), // wajib kalau create, opsional kalau update
});
