import express from "express";
import {
  getStatus,
  getStatusOne,
  getMonitors,
  createMonitors,
  deleteMonitors,
  updateMonitors,
  renderNewForm, 
  renderEditForm  
} from "../controllers/monitorController.js";

const router = express.Router();

// --- RUTAS DE VISTA (EJS) ---

// Lista todos los monitores: /monitors
router.get("/", getMonitors);

// Formulario de creación: /monitors/new
router.get("/new", renderNewForm); 

// Formulario de edición: /monitors/:id/edit
router.get("/:id/edit", renderEditForm); 


// --- RUTAS DE ACCIÓN (Lógica/DB) ---

// Crear: POST /monitors
router.post("/", createMonitors);

// Actualizar: PATCH /monitors/:id (Usa PATCH o PUT para actualizar)
router.patch("/:id", updateMonitors);

// Eliminar: DELETE /monitors/:id
router.delete("/:id", deleteMonitors);


// --- RUTAS DE API (JSON) ---
router.get("/api/all", getStatus);
router.get("/api/site/:site", getStatusOne);

export default router;