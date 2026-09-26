import type { Request, Response } from "express";
import { ZodError } from "zod";
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

export const getDashboardSummaryHandler = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const data = await getDashboardSummary();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const getOperationalMonitorsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const query = monitorsOperationalQuerySchema.parse(req.query);
    const data = await getOperationalMonitors({
      includeInactive: query.includeInactive,
      limit: query.limit,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message,
        })),
      });
      return;
    }
    console.error("Error fetching operational monitors:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const getOperationalIncidentsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const query = incidentsOperationalQuerySchema.parse(req.query);
    const data = await getOperationalIncidents({
      window: query.window,
      monitorId: query.monitorId,
      limit: query.limit,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message,
        })),
      });
      return;
    }
    console.error("Error fetching operational incidents:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const getDashboardMetricsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const query = metricsQuerySchema.parse(req.query);
    const data = await getDashboardMetrics({
      window: query.window,
      bucket: query.bucket,
      monitorId: query.monitorId,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message,
        })),
      });
      return;
    }
    console.error("Error fetching dashboard metrics:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const getRecentInsightsHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const query = insightsRecentQuerySchema.parse(req.query);
    const data = await getRecentInsights(query.limit);
    res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message,
        })),
      });
      return;
    }
    console.error("Error fetching recent insights:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};