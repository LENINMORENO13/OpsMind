import express from "express";
import {
  healthCheck,
  readinessCheck,
} from "../controllers/health.controller.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const router = express.Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Liveness probe
 *     description: >
 *       Confirma que el proceso HTTP está vivo. No consulta la base de datos,
 *       por lo que no marca como unhealthy una instancia sana cuya
 *       dependencia está temporalmente caída.
 *     security: []
 *     responses:
 *       200:
 *         description: Process is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: ok
 *                     service:
 *                       type: string
 *                       example: opsmind-api
 *                     uptimeSeconds:
 *                       type: integer
 *                       example: 3600
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */
router.get("/", healthCheck);

/**
 * @openapi
 * /health/ready:
 *   get:
 *     tags:
 *       - Health
 *     summary: Readiness probe
 *     description: >
 *       Verifica que las dependencias críticas (PostgreSQL) están operativas.
 *       Responde 503 si la base de datos no responde, para que el orquestador
 *       deje de enrutar tráfico hacia la instancia.
 *     security: []
 *     responses:
 *       200:
 *         description: Service is ready to receive traffic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: ready
 *                     database:
 *                       type: string
 *                       example: up
 *       503:
 *         description: Service is not ready (database unreachable)
 */
router.get("/ready", asyncHandler(readinessCheck));

export default router;