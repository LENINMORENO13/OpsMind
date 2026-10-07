import type { Request, Response, NextFunction } from "express";
import { ZodError, ZodType } from "zod";
import { validationErrorFrom } from "./error.middleware.js";

const toAppError = (error: unknown) => {
  const err = error as ZodError;
  return validationErrorFrom(
    (err.issues ?? []).map((issue) => ({
      path: issue.path,
      message: issue.message,
    })),
  );
};

export const validateSchema =
  (schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(toAppError(error));
    }
  };

export const validateParams =
  (schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as typeof req.params;
      next();
    } catch (error) {
      next(toAppError(error));
    }
  };