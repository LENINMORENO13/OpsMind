import express from "express";
import {
  getStatus,
  getStatusOne,
  getMonitors,
  createMonitors,
  updateMonitors,
  deleteMonitors,
  getMonitorHistory
} from "../controllers/monitorController.js";

const router = express.Router();

// --- RUTAS CRUD (API REST) ---

// Listar todos los monitores (GET /api/v1/monitors)
/**
 * @openapi
 * /api/v1/monitors:
 *  get:
 *    tags: 
 *      - Monitors
 *    summary: List all available monitors
 *    responses:
 *      200:
 *        description: Monitor list retrieved successfully
 *      500:
 *        description: Internal server error
 */
router.get("/", getMonitors);

// Crear un monitor (POST /api/v1/monitors)
/**
 * @openapi
 * /api/v1/monitors:
 *   post:
 *    tags:
 *      - Monitors
 *    summary: Create a new monitor
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - name
 *              - url
 *            properties:
 *              name:
 *                type: string
 *                example: "My application"
 *              url:
 *                type: string
 *                example: "https://myapp.com"
 *    responses:
 *      201:
 *        description: Monitor created successfully
 *      400:
 *        description: Missing required fields or invalid URL format
 *      500:
 *        description: Internal server error
 */
router.post("/", createMonitors);



// Actualizar un monitor (PATCH /api/v1/monitors/:id)
/**
 * @openapi
 * /api/v1/monitors/{id}:
 *   patch:
 *    tags:
 *      - Monitors
 *    summary: Update a monitor
 *    parameters: 
 *      - name: id
 *        in: path
 *        required: true 
 *        schema:
 *          type: integer
 *    requestBody:
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              name:
 *                type: string
 *                example: "My application"
 *              url:
 *                type: string
 *                example: "https://myapp.com"
 *    responses:
 *      200:
 *        description: Monitor updated successfully
 *      404:
 *        description: Monitor not found
 *      500:
 *        description: Internal server error
 */
router.patch("/:id", updateMonitors);


// Eliminar un monitor (DELETE /api/v1/monitors/:id)
/**
 * @openapi
 * /api/v1/monitors/{id}:
 *   delete:
 *    tags:
 *      - Monitors
 *    summary: Delete a monitor
 *    parameters: 
 *      - name: id
 *        in: path
 *        required: true 
 *        schema:
 *          type: integer
 *    responses:
 *      200:
 *        description: Monitor deleted successfully
 *      404:
 *        description: Monitor not found
 *      500:
 *        description: Internal server error
 */
router.delete("/:id", deleteMonitors);


// --- RUTAS DE ESTADO/CHECKER ---

// Obtener estado de todos (GET /api/v1/monitors/status/all)
/**
 * @openapi
 * /api/v1/monitors/status/all:
 *  get:
 *    tags: 
 *      - Monitors
 *    summary: Get the current status of all available monitors
 *    responses:
 *      200:
 *        description: Monitor status retrieved successfully
 *      500:
 *        description: Internal server error
 */
router.get("/status/all", getStatus);


// Obtener estado de uno (GET /api/v1/monitors/status/:site)
/**
 * @openapi
 * /api/v1/monitors/status/{site}:
 *   get:
 *    tags:
 *      - Monitors
 *    summary: Get the status of a specific monitor
 *    parameters: 
 *      - name: site
 *        in: path
 *        required: true 
 *        schema:
 *          type: string
 *    responses:
 *      200:
 *        description: Monitor status retrieved successfully
 *      404:
 *        description: Monitor not found
 *      500:
 *        description: Internal server error
 */
router.get("/status/:site", getStatusOne);


//Obtener los ultimos 10 logs
/**
 * @openapi
 * /api/v1/monitors/{id}/history:
 *   get:
 *    tags:
 *      - Monitors
 *    summary: Retrieve the last 10 logs for a specific monitor
 *    parameters: 
 *      - name: id
 *        in: path
 *        required: true 
 *        schema:
 *          type: integer
 *    responses:
 *      200:
 *        description: Latest 10 monitor logs retrieved successfully
 *      404:
 *        description: Monitor not found
 *      500:
 *        description: Internal server error
 */
router.get("/:id/history", getMonitorHistory);

export default router;