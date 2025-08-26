import { CreateTransactionPayloadSchema } from './schema.js';
import { InvariantError } from '../../exceptions/InvariantError.js';

export const TransactionValidator = {
  validateCreateTransactionPayload: (payload) => {
    const { error } = CreateTransactionPayloadSchema.validate(payload);

    if (error) {
      console.log('Kesalahan pada validate transaction payload');
      throw new InvariantError(error.message);
    }
  },
};
