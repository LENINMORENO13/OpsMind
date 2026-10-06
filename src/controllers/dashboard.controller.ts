import type { Request, Response } from "express";
import { ZodError, type ZodType } from "zod";
import {
  monitorsOperationalQuerySchema,
  incidentsOperationalQuerySchema,
  metricsQuerySchema,
  insightsRecentQuerySchema,
} from "../schemas/dashboard.schemas.js";
import {
  getDashboardSummary,
  getOperationalMonitors,
  getOperationalIncidents,
  getDashboardMetrics,
  getRecentInsights,
} from "../services/dashboard.service.js";
import { validationErrorFrom } from "../middlewares/error.middleware.js";

/**
 * Valida `req.query` contra un esquema Zod y traduce el fallo al mismo contrato
 * de 400 que usa el middleware global de validación.
 */
const parseQuery = <T>(schema: ZodType<T>, query: unknown): T => {
  const result = schema.safeParse(query);

  if (!result.success) {
    throw validationErrorFrom(
      (result.error as ZodError).issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    );
  }

  return result.data;
};

export const getDashboardSummaryHandler = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  res.status(200).json({ success: true, data: await getDashboardSummary() });
};

export const getOperationalMonitorsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const query = parseQuery(
    monitorsOperationalQuerySchema,
    req.query,
  );

  const data = await getOperationalMonitors({
    includeInactive: query.includeInactive,
    limit: query.limit,
  });

  res.status(200).json({ success: true, data });
};

export const getOperationalIncidentsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const query = parseQuery(incidentsOperationalQuerySchema, req.query);

  const data = await getOperationalIncidents({
    window: query.window,
    monitorId: query.monitorId,
    limit: query.limit,
  });

  res.status(200).json({ success: true, data });
};

export const getDashboardMetricsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const query = parseQuery(metricsQuerySchema, req.query);

  const data = await getDashboardMetrics({
    window: query.window,
    bucket: query.bucket,
    monitorId: query.monitorId,
  });

  res.status(200).json({ success: true, data });
};

export const getRecentInsightsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const query = parseQuery(insightsRecentQuerySchema, req.query);

  res.status(200).json({ success: true, data: await getRecentInsights(query.limit) });
};