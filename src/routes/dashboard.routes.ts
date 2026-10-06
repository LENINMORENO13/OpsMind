import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  getDashboardSummaryHandler,
  getOperationalMonitorsHandler,
  getOperationalIncidentsHandler,
  getDashboardMetricsHandler,
  getRecentInsightsHandler,
} from "../controllers/dashboard.controller.js";

const router = express.Router();

// --- DASHBOARD OPERATIVO (solo lecturas, sin side effects) ---

/**
 * @openapi
 * /api/v1/dashboard/summary:
 *  get:
 *    tags:
 *      - Dashboard
 *    summary: Get global operational summary (monitors, incidents, logs and AI insights)
 *    security:
 *      - bearerAuth: []
 *    responses:
 *      200:
 *        description: Dashboard summary retrieved successfully
 *      401:
 *        description: Access denied. Token not provided or invalid
 *      500:
 *        description: Internal server error
 */
router.get("/summary", verifyToken, asyncHandler(getDashboardSummaryHandler));

/**
 * @openapi
 * /api/v1/dashboard/monitors:
 *  get:
 *    tags:
 *      - Dashboard
 *    summary: List operational monitors with live health context (no checks are executed)
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - in: query
 *        name: includeInactive
 *        schema:
 *          type: boolean
 *          default: false
 *        description: Include inactive monitors
 *      - in: query
 *        name: limit
 *        schema:
 *          type: integer
 *          minimum: 1
 *          maximum: 100
 *          default: 50
 *        description: Max number of monitors to return
 *    responses:
 *      200:
 *        description: Operational monitors retrieved successfully
 *      400:
 *        description: Validation error
 *      401:
 *        description: Access denied. Token not provided or invalid
 *      500:
 *        description: Internal server error
 */
router.get("/monitors", verifyToken, asyncHandler(getOperationalMonitorsHandler));

/**
 * @openapi
 * /api/v1/dashboard/incidents:
 *  get:
 *    tags:
 *      - Dashboard
 *    summary: List recent and open incidents within a window
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - in: query
 *        name: window
 *        schema:
 *          type: string
 *          enum: [24h, 7d, 30d, 90d]
 *          default: 24h
 *        description: Time window for recent incidents
 *      - in: query
 *        name: monitorId
 *        schema:
 *          type: integer
 *        description: Filter by monitor id
 *      - in: query
 *        name: limit
 *        schema:
 *          type: integer
 *          minimum: 1
 *          maximum: 100
 *          default: 20
 *        description: Max number of incidents to return
 *    responses:
 *      200:
 *        description: Operational incidents retrieved successfully
 *      400:
 *        description: Validation error
 *      401:
 *        description: Access denied. Token not provided or invalid
 *      500:
 *        description: Internal server error
 */
router.get("/incidents", verifyToken, asyncHandler(getOperationalIncidentsHandler));

/**
 * @openapi
 * /api/v1/dashboard/metrics:
 *  get:
 *    tags:
 *      - Dashboard
 *    summary: Get time-series metrics aggregated by bucket (availability, response time, p95)
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - in: query
 *        name: window
 *        schema:
 *          type: string
 *          enum: [24h, 7d, 30d, 90d]
 *          default: 24h
 *        description: Time window
 *      - in: query
 *        name: bucket
 *        schema:
 *          type: string
 *          enum: [5m, 1h, 6h, 1d]
 *          default: 1h
 *        description: Aggregation bucket size
 *      - in: query
 *        name: monitorId
 *        schema:
 *          type: integer
 *        description: Filter by monitor id
 *    responses:
 *      200:
 *        description: Dashboard metrics retrieved successfully
 *      400:
 *        description: Validation error
 *      401:
 *        description: Access denied. Token not provided or invalid
 *      500:
 *        description: Internal server error
 */
router.get("/metrics", verifyToken, asyncHandler(getDashboardMetricsHandler));

/**
 * @openapi
 * /api/v1/dashboard/insights:
 *  get:
 *    tags:
 *      - Dashboard
 *    summary: Get the most recent AI insights with their incident
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - in: query
 *        name: limit
 *        schema:
 *          type: integer
 *          minimum: 1
 *          maximum: 50
 *          default: 20
 *        description: Max number of insights to return
 *    responses:
 *      200:
 *        description: Recent AI insights retrieved successfully
 *      400:
 *        description: Validation error
 *      401:
 *        description: Access denied. Token not provided or invalid
 *      500:
 *        description: Internal server error
 */
router.get("/insights", verifyToken, asyncHandler(getRecentInsightsHandler));

export default router;