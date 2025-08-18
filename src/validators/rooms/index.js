export const RoomsValidator = {
  validateRoomPayload: (payload) => {
    const validationResult = RoomPayloadSchema.validate(payload);

    if (validationResult.error) {
      console.log("Kesalahan pada validate room payload");
      throw new InvariantError(validationResult.error.message);
    }
  },
};