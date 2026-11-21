import Joi from 'joi';
import { AppError } from '../middleware/errorHandler';

export const validateSendMessage = (data: any) => {
  const schema = Joi.object({
    message: Joi.string().min(1).max(500).required().messages({
      'string.empty': 'Message cannot be empty',
      'string.min': 'Message must be at least 1 character',
      'string.max': 'Message cannot exceed 500 characters',
      'any.required': 'Message is required',
    }),
    messageType: Joi.string().valid('text', 'emoji', 'image', 'system').default('text').messages({
      'any.only': 'Message type must be one of: text, emoji, image, system',
    }),
    replyTo: Joi.string().optional().messages({
      'string.base': 'ReplyTo must be a string',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateEditMessage = (data: any) => {
  const schema = Joi.object({
    message: Joi.string().min(1).max(500).required().messages({
      'string.empty': 'Message cannot be empty',
      'string.min': 'Message must be at least 1 character',
      'string.max': 'Message cannot exceed 500 characters',
      'any.required': 'Message is required',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateDeleteMessage = (data: any) => {
  const schema = Joi.object({}).optional();

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateAddReaction = (data: any) => {
  const schema = Joi.object({
    emoji: Joi.string().required().messages({
      'string.empty': 'Emoji cannot be empty',
      'any.required': 'Emoji is required',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateRemoveReaction = (data: any) => {
  const schema = Joi.object({
    emoji: Joi.string().required().messages({
      'string.empty': 'Emoji cannot be empty',
      'any.required': 'Emoji is required',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validatePinMessage = (data: any) => {
  const schema = Joi.object({}).optional();

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateReportMessage = (data: any) => {
  const schema = Joi.object({
    messageId: Joi.string().required().messages({
      'string.empty': 'Message ID cannot be empty',
      'any.required': 'Message ID is required',
    }),
    reason: Joi.string().min(3).max(100).required().messages({
      'string.empty': 'Reason cannot be empty',
      'string.min': 'Reason must be at least 3 characters',
      'string.max': 'Reason cannot exceed 100 characters',
      'any.required': 'Reason is required',
    }),
    description: Joi.string().max(500).optional().messages({
      'string.max': 'Description cannot exceed 500 characters',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateMuteUser = (data: any) => {
  const schema = Joi.object({
    eventId: Joi.string().required().messages({
      'string.empty': 'Event ID cannot be empty',
      'any.required': 'Event ID is required',
    }),
    userId: Joi.string().required().messages({
      'string.empty': 'User ID cannot be empty',
      'any.required': 'User ID is required',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateUnmuteUser = (data: any) => {
  const schema = Joi.object({
    eventId: Joi.string().required().messages({
      'string.empty': 'Event ID cannot be empty',
      'any.required': 'Event ID is required',
    }),
    userId: Joi.string().required().messages({
      'string.empty': 'User ID cannot be empty',
      'any.required': 'User ID is required',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateTimeoutUser = (data: any) => {
  const schema = Joi.object({
    eventId: Joi.string().required().messages({
      'string.empty': 'Event ID cannot be empty',
      'any.required': 'Event ID is required',
    }),
    userId: Joi.string().required().messages({
      'string.empty': 'User ID cannot be empty',
      'any.required': 'User ID is required',
    }),
    userName: Joi.string().required().messages({
      'string.empty': 'User name cannot be empty',
      'any.required': 'User name is required',
    }),
    duration: Joi.number().integer().min(60).max(86400).required().messages({
      'number.base': 'Duration must be a number',
      'number.integer': 'Duration must be an integer',
      'number.min': 'Duration must be at least 60 seconds',
      'number.max': 'Duration cannot exceed 86400 seconds (24 hours)',
      'any.required': 'Duration is required',
    }),
    reason: Joi.string().min(3).max(200).required().messages({
      'string.empty': 'Reason cannot be empty',
      'string.min': 'Reason must be at least 3 characters',
      'string.max': 'Reason cannot exceed 200 characters',
      'any.required': 'Reason is required',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateBanUser = (data: any) => {
  const schema = Joi.object({
    eventId: Joi.string().required().messages({
      'string.empty': 'Event ID cannot be empty',
      'any.required': 'Event ID is required',
    }),
    userId: Joi.string().required().messages({
      'string.empty': 'User ID cannot be empty',
      'any.required': 'User ID is required',
    }),
    userName: Joi.string().required().messages({
      'string.empty': 'User name cannot be empty',
      'any.required': 'User name is required',
    }),
    reason: Joi.string().min(3).max(200).required().messages({
      'string.empty': 'Reason cannot be empty',
      'string.min': 'Reason must be at least 3 characters',
      'string.max': 'Reason cannot exceed 200 characters',
      'any.required': 'Reason is required',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateUnbanUser = (data: any) => {
  const schema = Joi.object({
    eventId: Joi.string().required().messages({
      'string.empty': 'Event ID cannot be empty',
      'any.required': 'Event ID is required',
    }),
    userId: Joi.string().required().messages({
      'string.empty': 'User ID cannot be empty',
      'any.required': 'User ID is required',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateUpdateSlowMode = (data: any) => {
  const schema = Joi.object({
    slowMode: Joi.boolean().required().messages({
      'boolean.base': 'Slow mode must be a boolean',
      'any.required': 'Slow mode is required',
    }),
    interval: Joi.number().integer().valid(5, 10, 30, 60).required().messages({
      'number.base': 'Interval must be a number',
      'number.integer': 'Interval must be an integer',
      'any.only': 'Interval must be one of: 5, 10, 30, 60 seconds',
      'any.required': 'Interval is required',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateToggleChatEnabled = (data: any) => {
  const schema = Joi.object({
    enabled: Joi.boolean().required().messages({
      'boolean.base': 'Enabled must be a boolean',
      'any.required': 'Enabled is required',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateSetSubscriberOnly = (data: any) => {
  const schema = Joi.object({
    subscriberOnly: Joi.boolean().required().messages({
      'boolean.base': 'Subscriber only must be a boolean',
      'any.required': 'Subscriber only is required',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateSetFollowersOnly = (data: any) => {
  const schema = Joi.object({
    followersOnly: Joi.boolean().required().messages({
      'boolean.base': 'Followers only must be a boolean',
      'any.required': 'Followers only is required',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateAddModerator = (data: any) => {
  const schema = Joi.object({
    moderatorId: Joi.string().required().messages({
      'string.empty': 'Moderator ID cannot be empty',
      'any.required': 'Moderator ID is required',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateRemoveModerator = (data: any) => {
  const schema = Joi.object({
    moderatorId: Joi.string().required().messages({
      'string.empty': 'Moderator ID cannot be empty',
      'any.required': 'Moderator ID is required',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateSearchMessages = (data: any) => {
  const schema = Joi.object({
    q: Joi.string().min(1).max(100).required().messages({
      'string.empty': 'Search query cannot be empty',
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 100 characters',
      'any.required': 'Search query is required',
    }),
    limit: Joi.number().integer().min(1).max(100).default(50).messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateTyping = (data: any) => {
  const schema = Joi.object({}).optional();

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};
