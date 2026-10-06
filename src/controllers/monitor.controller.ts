import prisma from "../lib/prisma.js";
import { getHistory, executeMonitorCheck } from "../services/history.service.js";
import type { ParamsDictionary } from "express-serve-static-core";
import type { Request, Response } from "express";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../middlewares/error.middleware.js";

export interface MonitorDTO {
  name: string;
  url: string;
}

export interface MonitorParams extends ParamsDictionary {
  id: string;
}

export interface SiteParams extends ParamsDictionary {
  site: string;
}

// --- CREAR MONITOR  ---
export const createMonitors = async (
  req: Request<{}, {}, MonitorDTO>,
  res: Response,
): Promise<void> => {
  const { name, url } = req.body;

  // Evita duplicidad de URLs en el sistema
  const existingMonitor = await prisma.monitor.findUnique({ where: { url } });
  if (existingMonitor) {
    throw new BadRequestError("Monitor with this URL already exists", {
      monitor: existingMonitor,
    });
  }

  const newMonitor = await prisma.monitor.create({ data: { name, url } });

  res.status(201).json({
    success: true,
    message: "Monitor created successfully",
    data: newMonitor,
  });
};

// --- LISTAR MONITORES  ---
export const getMonitors = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const monitors = await prisma.monitor.findMany();

  res.status(200).json({ success: true, data: monitors });
};

// --- ACTUALIZAR MONITOR  ---
export const updateMonitors = async (
  req: Request<MonitorParams, {}, MonitorDTO>,
  res: Response,
): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const { url, name } = req.body;

  const existingMonitor = await prisma.monitor.findUnique({ where: { id } });
  if (!existingMonitor) {
    throw new NotFoundError("Monitor not found");
  }

  // Solo validamos colisión de URL cuando la petición intenta cambiarla.
  // Un PATCH parcial (p. ej. solo name) no debe reportar un falso 409.
  if (url !== undefined) {
    const duplicate = await prisma.monitor.findFirst({
      where: { url, NOT: { id } },
    });

    if (duplicate) {
      throw new ConflictError("Monitor with this URL already exists", {
        code: "URL_DUPLICATED",
      });
    }
  }

  const monitor = await prisma.monitor.update({
    where: { id },
    data: { name, url },
  });

  res.status(200).json({
    success: true,
    message: "Monitor updated successfully",
    data: monitor,
  });
};

// --- ELIMINAR MONITOR  ---
export const deleteMonitors = async (
  req: Request<MonitorParams>,
  res: Response,
): Promise<void> => {
  const { id } = req.params as unknown as { id: number };

  const existingMonitor = await prisma.monitor.findUnique({ where: { id } });
  if (!existingMonitor) {
    throw new NotFoundError("Monitor not found");
  }

  const monitor = await prisma.monitor.delete({ where: { id } });

  res.status(200).json({
    success: true,
    message: "Monitor deleted successfully",
    data: monitor,
  });
};

// --- CHEQUEO GENERAL EN TIEMPO REAL---
/**
 * Ejecuta un chequeo real contra cada monitor. Ojo: tiene efectos secundarios
 * (escribe `Log`, puede abrir/cerrar incidentes y disparar análisis de IA).
 */
export const getStatus = async (_req: Request, res: Response): Promise<void> => {
  const monitors = await prisma.monitor.findMany();
  const results = [];

  // Evaluamos secuencialmente el estado de salud de cada monitor registrado
  for (const monitor of monitors) {
    const statusResult = await executeMonitorCheck(monitor);
    results.push({
      id: monitor.id,
      name: monitor.name,
      url: monitor.url,
      status: statusResult.status,
      message: statusResult.message,
      trend: statusResult.trend,
      state: statusResult.state,
    });
  }

  res.status(200).json({ success: true, data: results });
};

// --- CHEQUEO DE UN SITIO INDIVIDUAL POR NOMBRE ---
export const getStatusOne = async (
  req: Request<SiteParams>,
  res: Response,
): Promise<void> => {
  const { site } = req.params;

  const targetUrl = await prisma.monitor.findFirst({
    where: { name: { equals: site, mode: "insensitive" } },
  });

  if (!targetUrl) {
    throw new NotFoundError("Site not monitored");
  }

  const result = await executeMonitorCheck(targetUrl);

  res.status(200).json({ success: true, data: result });
};

// --- HISTORIAL DE UN MONITOR ---
export const getMonitorHistory = async (
  req: Request<MonitorParams>,
  res: Response,
): Promise<void> => {
  const { id } = req.params as unknown as { id: number };

  const monitorExists = await prisma.monitor.findUnique({ where: { id } });
  if (!monitorExists) {
    throw new NotFoundError("Monitor not found");
  }

  const history = await getHistory(id);

  res.status(200).json({ success: true, data: history });
};