import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import {
  validateParams,
  validateSchema,
} from "../middlewares/validator.middleware.js";
import {
  monitorIdSchema,
  incidentIdParamsSchema,
  resolveIncidentSchema,
} from "../schemas/incident.schemas.js";
import {
  getOpenIncidents,
  getResolvedIncidents,
  resolveIncident,
} from "../controllers/incident.controller.js";

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
router.get("/monitor/:monitorId/resolved", verifyToken, validateParams(monitorIdSchema), getResolvedIncidents);

/**
 * @openapi
 * /api/v1/incidents/{id}/resolve:
 *   post:
 *     tags:
 *       - Incidents
 *     summary: Record the human solution and (if the service is healthy) close the incident
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the incident to record the solution for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rootCause
 *               - actionTaken
 *             properties:
 *               rootCause:
 *                 type: string
 *                 description: Root cause of the incident
 *               actionTaken:
 *                 type: string
 *                 description: Action taken to resolve the incident
 *     responses:
 *       200:
 *         description: Human solution recorded. closes the incident when it is OPEN and the service is healthy; otherwise the incident closes automatically once the service recovers (RECOVERED). The response data informs closedNow.
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Incident not found
 *       409:
 *         description: A resolution has already been recorded for this incident
 *       500:
 *         description: Internal server error
 */
router.post(
  "/:id/resolve",
  verifyToken,
  validateParams(incidentIdParamsSchema),
  validateSchema(resolveIncidentSchema),
  resolveIncident,
);

export default router;
