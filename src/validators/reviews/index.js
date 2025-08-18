import { ReviewPayloadSchema } from "./schema.js";
import { InvariantError } from "../../exceptions/InvariantError.js";

export const ReviewsValidator = {
  validateReviewPayload: (payload) => {
    const validationResult = ReviewPayloadSchema.validate(payload);

    if (validationResult.error) {
      console.log("Kesalahan pada validate review payload");
      throw new InvariantError(validationResult.error.message);
    }
  },
};
