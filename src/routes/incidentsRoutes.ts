import express from "express";
import { getOpenIncidents, getResolvedIncidents } from "../controllers/incidentController.js";

const router = express.Router();

// --- INCIDENT PATHS ---

router.get("/incidents/active", getOpenIncidents);
router.get("/incidents/monitor/:monitorId/resolved", getResolvedIncidents);
