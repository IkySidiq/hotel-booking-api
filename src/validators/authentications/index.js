import { postAuthenticationPayloadSchema, putAuthenticationPayloadSchema, deleteAuthenticationPayloadSchema } from '../authentications/schema.js';

import { InvariantError } from '../../exceptions/InvariantError.js';

export const AuthenticationsValidator = {
    validatePostAuthenticationPayload: (payload) => {
        const validationResult = postAuthenticationPayloadSchema.validate(payload);

        if (validationResult.error) {
            throw new InvariantError(validationResult.error.message);
        }
    },

    putAuthenticationPayload: (payload) => {
        const validationResult = putAuthenticationPayloadSchema.validate(payload);

        if(validationResult.error) {
            throw new InvariantError(validationResult.error.message);
        }
    },

    deleteAuthenticationPayload: (payload) => {
        const validationResult = deleteAuthenticationPayloadSchema.validate(payload);

        if (validationResult.error) {
            throw new InvariantError(validationResult.error.message)
        }
    }
}