import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";

/**
 * Log estructurado de cada petición HTTP: método, ruta, status y duración.
 * Se omite en tests (el logger ya está en `silent`) y nunca registra headers
 * ni cuerpos, para no filtrar tokens o datos de monitorización.
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const start = process.hrtime.bigint();
  const requestId = randomUUID();

  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const durationMs =
      Number(process.hrtime.bigint() - start) / 1_000_000;

    logger.info(
      {
        requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      },
      "request completed",
    );
  });

  next();
};