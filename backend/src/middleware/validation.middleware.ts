import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';

type ValidationTarget = 'body' | 'params' | 'query';

export const validationMiddleware = (schema: Joi.ObjectSchema, target: ValidationTarget = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validation = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true
    });

    if (validation.error) {
      res.status(400).json({
        status: false,
        message: 'Validation failed',
        errors: validation.error.details.map(detail => detail.message)
      });
      return;
    }

    req[target] = validation.value;
    next();
  };
};
