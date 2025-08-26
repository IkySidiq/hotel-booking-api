import { 
  PostRoomPicturePayloadSchema, 
  RoomIdParamSchema, 
  PictureIdParamSchema 
} from './schema.js';
import { InvariantError } from '../../exceptions/InvariantError.js';

export const RoomPicturesValidator = {
  validatePostRoomPicturePayload: (payload) => {
    const validationResult = PostRoomPicturePayloadSchema.validate(payload);

    if (validationResult.error) {
      console.log('Kesalahan pada validate post room picture payload');
      throw new InvariantError(validationResult.error.message);
    }
  },

  validateRoomIdParam: (params) => {
    const validationResult = RoomIdParamSchema.validate(params);

    if (validationResult.error) {
      console.log('Kesalahan pada validate roomId param');
      throw new InvariantError(validationResult.error.message);
    }
  },

  validatePictureIdParam: (params) => {
    const validationResult = PictureIdParamSchema.validate(params);

    if (validationResult.error) {
      console.log('Kesalahan pada validate pictureId param');
      throw new InvariantError(validationResult.error.message);
    }
  },
};
