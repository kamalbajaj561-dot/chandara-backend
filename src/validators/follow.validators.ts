import Joi from 'joi';
import { AppError } from '../middleware/errorHandler';

export const validateListFollows = (data: any) => {
  const schema = Joi.object({
    limit: Joi.number().min(1).max(100).optional().default(20),
    offset: Joi.number().min(0).optional().default(0),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail: any) => {
      const field = detail.path.join('.');
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(detail.message);
    });

    throw new AppError('Validation failed', 400, undefined, errors);
  }

  return value;
};
