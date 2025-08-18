import { CheckAvailabilityPayloadSchema } from "./schema.js";
import { InvariantError } from "../../exceptions/InvariantError.js";

export const RoomAvailabilityValidator = {
  validateCheckAvailabilityPayload: (payload) => {
    const validationResult = CheckAvailabilityPayloadSchema.validate(payload);

    if (validationResult.error) {
      console.log("Kesalahan pada validate check availability payload");
      throw new InvariantError(validationResult.error.message);
    }
  },
};
