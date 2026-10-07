import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

/**
 * Error de aplicación con estado HTTP y carga útil opcional.
 *
 * `details` se mezcla en el cuerpo de la respuesta para preservar contratos
 * existentes del API (por ejemplo `code: "URL_DUPLICATED"` o el `monitor`
 * duplicado en `POST /monitors`).
 *
 * `useMessageField` hace que el mensaje viaje en `message` en lugar de
 * `error`, que es lo que espera el cliente para errores de validación de Zod.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly details?: Record<string, unknown>;
  readonly useMessageField: boolean;

  constructor(
    statusCode: number,
    message: string,
    options: {
      isOperational?: boolean;
      details?: Record<string, unknown>;
      useMessageField?: boolean;
      cause?: unknown;
    } = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;
    this.useMessageField = options.useMessageField ?? false;
    Error.captureStackTrace(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: Record<string, unknown>) {
    super(400, message, { details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: Record<string, unknown>) {
    super(409, message, { details });
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Internal server error", cause?: unknown) {
    super(500, message, { isOperational: false, cause });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Service unavailable", cause?: unknown) {
    super(503, message, { isOperational: false, cause });
  }
}

/**
 * Convierte un ZodError en el contrato de validación ya existente:
 * `{ success: false, message: "Validation error", errors: [{ field, message }] }`.
 */
export const validationErrorFrom = (
  issues: { path: readonly PropertyKey[]; message: string }[],
): AppError =>
  new AppError(400, "Validation error", {
    details: {
      errors: issues.map((issue) => ({
        field: issue.path[0],
        message: issue.message,
      })),
    },
    useMessageField: true,
  });

/**
 * Traduce cualquier valor lanzado dentro del pipeline HTTP a una respuesta con
 * el envelope `{ success, message?, error?, data? }`.
 *
 * Los `AppError` operativos exponen su mensaje; el resto se registra completo
 * (incluido el `cause`) y se responde con un mensaje genérico para no filtrar
 * detalles internos al cliente.
 */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err, stack: err.stack }, "Unhandled application error");
    }

    res.status(err.statusCode).json({
      success: false,
      ...(err.useMessageField ? { message: err.message } : { error: err.message }),
      ...err.details,
    });
    return;
  }

  // Errores nativos de Node (p. ej. body-parser con JSON malformado) ya traen
  // un statusCode utilizable.
  const candidate = err as { statusCode?: unknown; status?: unknown };
  const statusCode =
    typeof candidate?.statusCode === "number"
      ? candidate.statusCode
      : typeof candidate?.status === "number"
        ? candidate.status
        : 500;

  if (statusCode >= 400 && statusCode < 500) {
    const error = err as Error;
    res.status(statusCode).json({
      success: false,
      message: error?.message || "Bad request",
    });
    return;
  }

  logger.error({ err, stack: (err as Error)?.stack }, "Unhandled error");
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
};

/**
 * Finaliza el pipeline para rutas no registradas bajo `/api`, evitando que
 * Express emita su HTML por defecto y manteniendo el envelope JSON.
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
};