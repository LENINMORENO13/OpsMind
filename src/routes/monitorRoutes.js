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
router.get("/", getMonitors);

// Crear un monitor (POST /api/v1/monitors)
router.post("/", createMonitors);

// Actualizar un monitor (PATCH /api/v1/monitors/:id)
router.patch("/:id", updateMonitors);

// Eliminar un monitor (DELETE /api/v1/monitors/:id)
router.delete("/:id", deleteMonitors);


// --- RUTAS DE ESTADO/CHECKER ---

// Obtener estado de todos (GET /api/v1/monitors/status/all)
router.get("/status/all", getStatus);

// Obtener estado de uno (GET /api/v1/monitors/status/:site)
router.get("/status/:site", getStatusOne);

//Obtener los ultimos 10 logs
router.get("/:id/history", getMonitorHistory);

export default router;