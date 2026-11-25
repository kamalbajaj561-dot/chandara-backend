import { Request, Response, NextFunction, RequestHandler } from 'express';

type DataValidator = (data: any) => any;

/**
 * Adapts a `(data) => validatedValue` validator (throws AppError on failure) into Express middleware.
 * Routes must use these wrappers: passing a data-style validator directly to router.post() makes Express
 * call it with (req, res, next), so it would validate the request object instead of the body.
 */
export const fromBody =
  (validator: DataValidator): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const value = validator(req.body ?? {});
      if (value !== undefined) req.body = value;
      next();
    } catch (error) {
      next(error);
    }
  };

export const fromQuery =
  (validator: DataValidator): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const value = validator(req.query ?? {});
      // Express 4: req.query is a plain, writable property.
      if (value !== undefined) (req as any).query = value;
      next();
    } catch (error) {
      next(error);
    }
  };
