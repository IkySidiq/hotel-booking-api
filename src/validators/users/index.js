import { InvariantError } from '../../exceptions/InvariantError.js';
import { UserPayloadSchema } from './schema.js';
 
export const UserValidator = {
  validateUserPayload: (payload) => {
    const validationResult = UserPayloadSchema.validate(payload);
 
    if (validationResult.error) {
      console.log('Kesalahan pada validate user payload');
      throw new InvariantError(validationResult.error.message);
    }
  },
};