import type { Request, Response, NextFunction } from "express";
import { ZodError, ZodSchema } from "zod";

export const validateSchema =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      const err = error as ZodError;
      return res.status(400).json({
        message: "Validation error",
        errors: err.issues.map((err) => ({
          field: err.path[0],
          message: err.message,
        })),
      });
    }
  };
