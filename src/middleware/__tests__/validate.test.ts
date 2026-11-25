import Joi from 'joi';
import { fromBody, fromQuery } from '../validate';
import { AppError } from '../errorHandler';

const validator = (data: any) => {
  const { error, value } = Joi.object({ name: Joi.string().required(), n: Joi.number().default(1) }).validate(data);
  if (error) throw new AppError('Validation failed', 400);
  return value;
};

describe('fromBody / fromQuery', () => {
  it('validates req.body (not the request object) and applies defaults', () => {
    const req: any = { body: { name: 'a' } };
    const next = jest.fn();
    fromBody(validator)(req, {} as any, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'a', n: 1 });
  });

  it('forwards validation errors to next() instead of throwing', () => {
    const req: any = { body: {} };
    const next = jest.fn();
    expect(() => fromBody(validator)(req, {} as any, next)).not.toThrow();
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });

  it('validates the query string', () => {
    const req: any = { query: { name: 'q' } };
    const next = jest.fn();
    fromQuery(validator)(req, {} as any, next);
    expect(req.query).toEqual({ name: 'q', n: 1 });
    expect(next).toHaveBeenCalledWith();
  });

  it('keeps the original body if a validator returns nothing', () => {
    const req: any = { body: { a: 1 } };
    fromBody(() => undefined)(req, {} as any, jest.fn());
    expect(req.body).toEqual({ a: 1 });
  });
});
