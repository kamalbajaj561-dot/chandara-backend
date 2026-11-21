import Joi from 'joi';
import { AppError } from '../middleware/errorHandler';

export const validateCreateTicket = (data: any) => {
  const schema = Joi.object({
    eventId: Joi.string().required().messages({
      'string.empty': 'Event ID cannot be empty',
      'any.required': 'Event ID is required',
    }),
    userId: Joi.string().required().messages({
      'string.empty': 'User ID cannot be empty',
      'any.required': 'User ID is required',
    }),
    creatorId: Joi.string().required().messages({
      'string.empty': 'Creator ID cannot be empty',
      'any.required': 'Creator ID is required',
    }),
    orderId: Joi.string().required().messages({
      'string.empty': 'Order ID cannot be empty',
      'any.required': 'Order ID is required',
    }),
    ticketType: Joi.string().valid('general', 'vip', 'early_bird', 'group').required().messages({
      'any.only': 'Ticket type must be one of: general, vip, early_bird, group',
      'any.required': 'Ticket type is required',
    }),
    price: Joi.number().positive().required().messages({
      'number.positive': 'Price must be positive',
      'any.required': 'Price is required',
    }),
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'INR').required().messages({
      'any.only': 'Currency must be one of: USD, EUR, GBP, INR',
      'any.required': 'Currency is required',
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

export const validateValidateTicket = (data: any) => {
  const schema = Joi.object({
    qrCode: Joi.string().required().messages({
      'string.empty': 'QR code cannot be empty',
      'any.required': 'QR code is required',
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

export const validateCreateOrder = (data: any) => {
  const schema = Joi.object({
    eventId: Joi.string().required().messages({
      'string.empty': 'Event ID cannot be empty',
      'any.required': 'Event ID is required',
    }),
    items: Joi.array().items(
      Joi.object({
        ticketType: Joi.string().valid('general', 'vip', 'early_bird', 'group').required().messages({
          'any.only': 'Ticket type must be one of: general, vip, early_bird, group',
          'any.required': 'Ticket type is required',
        }),
        price: Joi.number().positive().required().messages({
          'number.positive': 'Price must be positive',
          'any.required': 'Price is required',
        }),
        quantity: Joi.number().integer().min(1).required().messages({
          'number.min': 'Quantity must be at least 1',
          'any.required': 'Quantity is required',
        }),
      })
    ).min(1).required().messages({
      'array.min': 'At least one item is required',
      'any.required': 'Items are required',
    }),
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'INR').required().messages({
      'any.only': 'Currency must be one of: USD, EUR, GBP, INR',
      'any.required': 'Currency is required',
    }),
    paymentProvider: Joi.string().valid('razorpay', 'stripe', 'paypal', 'mock').required().messages({
      'any.only': 'Payment provider must be one of: razorpay, stripe, paypal, mock',
      'any.required': 'Payment provider is required',
    }),
    couponCode: Joi.string().optional().messages({
      'string.base': 'Coupon code must be a string',
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

export const validateUpdateOrderStatus = (data: any) => {
  const schema = Joi.object({
    status: Joi.string().valid('pending', 'paid', 'failed', 'cancelled', 'refunded').required().messages({
      'any.only': 'Status must be one of: pending, paid, failed, cancelled, refunded',
      'any.required': 'Status is required',
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

export const validateCreatePayment = (data: any) => {
  const schema = Joi.object({
    orderId: Joi.string().required().messages({
      'string.empty': 'Order ID cannot be empty',
      'any.required': 'Order ID is required',
    }),
    amount: Joi.number().positive().required().messages({
      'number.positive': 'Amount must be positive',
      'any.required': 'Amount is required',
    }),
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'INR').required().messages({
      'any.only': 'Currency must be one of: USD, EUR, GBP, INR',
      'any.required': 'Currency is required',
    }),
    provider: Joi.string().valid('razorpay', 'stripe', 'paypal', 'mock').required().messages({
      'any.only': 'Provider must be one of: razorpay, stripe, paypal, mock',
      'any.required': 'Provider is required',
    }),
    description: Joi.string().optional().messages({
      'string.base': 'Description must be a string',
    }),
    metadata: Joi.object().optional().messages({
      'object.base': 'Metadata must be an object',
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

export const validateVerifyPayment = (data: any) => {
  const schema = Joi.object({
    providerPaymentId: Joi.string().required().messages({
      'string.empty': 'Provider payment ID cannot be empty',
      'any.required': 'Provider payment ID is required',
    }),
    provider: Joi.string().valid('razorpay', 'stripe', 'paypal', 'mock').required().messages({
      'any.only': 'Provider must be one of: razorpay, stripe, paypal, mock',
      'any.required': 'Provider is required',
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

export const validateProcessRefund = (data: any) => {
  const schema = Joi.object({
    paymentId: Joi.string().required().messages({
      'string.empty': 'Payment ID cannot be empty',
      'any.required': 'Payment ID is required',
    }),
    amount: Joi.number().positive().required().messages({
      'number.positive': 'Amount must be positive',
      'any.required': 'Amount is required',
    }),
    reason: Joi.string().required().messages({
      'string.empty': 'Reason cannot be empty',
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

export const validateCreateCoupon = (data: any) => {
  const schema = Joi.object({
    code: Joi.string().min(3).max(50).required().messages({
      'string.empty': 'Code cannot be empty',
      'string.min': 'Code must be at least 3 characters',
      'string.max': 'Code cannot exceed 50 characters',
      'any.required': 'Code is required',
    }),
    type: Joi.string().valid('percentage', 'fixed').required().messages({
      'any.only': 'Type must be one of: percentage, fixed',
      'any.required': 'Type is required',
    }),
    value: Joi.number().positive().required().messages({
      'number.positive': 'Value must be positive',
      'any.required': 'Value is required',
    }),
    maxUses: Joi.number().integer().min(1).required().messages({
      'number.min': 'Max uses must be at least 1',
      'any.required': 'Max uses is required',
    }),
    minPurchase: Joi.number().min(0).required().messages({
      'number.min': 'Min purchase must be at least 0',
      'any.required': 'Min purchase is required',
    }),
    expiryDate: Joi.date().greater('now').required().messages({
      'date.greater': 'Expiry date must be in the future',
      'any.required': 'Expiry date is required',
    }),
    isPlatformCoupon: Joi.boolean().optional().messages({
      'boolean.base': 'Is platform coupon must be a boolean',
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

export const validateValidateCoupon = (data: any) => {
  const schema = Joi.object({
    code: Joi.string().required().messages({
      'string.empty': 'Code cannot be empty',
      'any.required': 'Code is required',
    }),
    purchaseAmount: Joi.number().positive().required().messages({
      'number.positive': 'Purchase amount must be positive',
      'any.required': 'Purchase amount is required',
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

export const validateCreateRefund = (data: any) => {
  const schema = Joi.object({
    orderId: Joi.string().required().messages({
      'string.empty': 'Order ID cannot be empty',
      'any.required': 'Order ID is required',
    }),
    amount: Joi.number().positive().required().messages({
      'number.positive': 'Amount must be positive',
      'any.required': 'Amount is required',
    }),
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'INR').required().messages({
      'any.only': 'Currency must be one of: USD, EUR, GBP, INR',
      'any.required': 'Currency is required',
    }),
    reason: Joi.string().required().messages({
      'string.empty': 'Reason cannot be empty',
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
