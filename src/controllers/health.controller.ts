import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

/**
 * Liveness probe: confirma que el proceso responde. No toca dependencias
 * externas, para no reportar como "muerto" un proceso sano cuya base de datos
 * está temporalmente caída.
 */
export const healthCheck = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      service: "opsmind-api",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * Readiness probe: verifica que las dependencias críticas (PostgreSQL) están
 * operativas. Devuelve 503 si la consulta falla, que es lo que esperan los
 * orquestadores para dejar de enrutar tráfico hacia esta instancia.
 */
export const readinessCheck = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      data: {
        status: "ready",
        database: "up",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Readiness check failed: database unreachable");

    res.status(503).json({
      success: false,
      error: "Database unavailable",
      data: {
        status: "not_ready",
        database: "down",
        timestamp: new Date().toISOString(),
      },
    });
  }
};