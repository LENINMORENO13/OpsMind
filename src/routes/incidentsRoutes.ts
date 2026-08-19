import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import {
  getOpenIncidents,
  getResolvedIncidents,
} from "../controllers/incidentController.js";

const router = express.Router();

// --- INCIDENT PATHS ---
/**
 * @openapi
 * /api/v1/incidents/active:
 *  get:
 *    tags:
 *      - Incidents
 *    summary: Get all currently open incidents with AI diagnosis
 *    responses:
 *      200:
 *        description: List of active incidents retrieved successfully
 *      500:
 *        description: Internal server error
 */
router.get("/active", verifyToken, getOpenIncidents);

/**
 * @openapi
 * /api/v1/incidents/monitor/{monitorId}/resolved:
 *   get:
 *     tags:
 *       - Incidents
 *     summary: Get resolved incidents history for a specific monitor
 *     parameters:
 *       - in: path
 *         name: monitorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the monitor to fetch history for
 *     responses:
 *       200:
 *         description: History of resolved incidents retrieved successfully
 *       400:
 *         description: Invalid monitor ID format
 *       500:
 *         description: Internal server error
 */
router.get("/monitor/:monitorId/resolved", verifyToken, getResolvedIncidents);

export default router;
