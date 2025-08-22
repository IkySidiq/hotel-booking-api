import { HotelProfilePayloadSchema } from "./schema.js";
import { InvariantError } from "../../exceptions/InvariantError.js";

export const HotelProfileValidator = {
  validateHotelProfilePayload: (payload) => {
    const validationResult = HotelProfilePayloadSchema.validate(payload);

    if (validationResult.error) {
      console.log("Kesalahan pada validate hotel profile payload");
      throw new InvariantError(validationResult.error.message);
    }
  },
};
