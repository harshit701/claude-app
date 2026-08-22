import type { NextFunction, Request, Response } from "express";
import type { Schema } from "joi";
import { ValidationError } from "../utils/errors.ts";

export { ValidationError } from "../utils/errors.ts";

export function validate(schema: Schema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((detail) => detail.message).join(", ");
      next(new ValidationError(message));
      return;
    }

    req.body = value;
    next();
  };
}

export function validateQuery(schema: Schema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((detail) => detail.message).join(", ");
      next(new ValidationError(message));
      return;
    }

    req.query = value;
    next();
  };
}
