import prisma from "../lib/prisma.js";
import { getHistory, executeMonitorCheck } from "../services/historyService.js";

// --- CREAR MONITOR  ---
export const createMonitors = async (req, res) => {
  const { name, url } = req.body;

  // Validación básica de campos requeridos
  if (!name || !url) {
    return res.status(400).json({
      success: false,
      error: "The 'name' and 'url' properties are absolutely mandatory.",
    });
  }

  try {
    // Evita duplicidad de URLs en el sistema
    const existingMonitor = await prisma.monitor.findUnique({
      where: { url },
    });

    if (existingMonitor) {
      return res.status(400).json({
        success: false,
        error: "Monitor with this URL already exists",
        monitor: existingMonitor,
      });
    }

    const newMonitor = await prisma.monitor.create({
      data: { name, url },
    });

    return res.status(201).json({
      success: true,
      message: "Monitor created successfully",
      data: newMonitor,
    });
  } catch (error) {
    console.error("Error creating monitor:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create monitor",
    });
  }
};

// --- LISTAR MONITORES  ---
export const getMonitors = async (req, res) => {
  try {
    const monitors = await prisma.monitor.findMany();
    return res.status(200).json({
      success: true,
      data: monitors,
    });
  } catch (error) {
    console.error("Error fetching monitors:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  };
  }   

// --- ACTUALIZAR MONITOR  ---
export const updateMonitors = async (req, res) => {
  const { id } = req.params;
  const { url, name } = req.body;
  const idConvert = parseInt(id);

  // Validación preventiva del formato del ID numérico
  if (isNaN(idConvert)) {
    return res.status(400).json({
      success: false,
      error: "Invalid ID format",
    });
  }

  try {
    // Validamos que el cambio de URL no colisione con el registro de otro monitor diferente
    const duplicate = await prisma.monitor.findFirst({
      where: {
        url: url,
        NOT: { id: idConvert },
      },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        error: "Monitor with this URL already exists",
        code: "URL_DUPLICATED",
      });
    }

    const monitor = await prisma.monitor.update({
      where: { id: idConvert },
      data: { name, url },
    });

    return res.status(200).json({
      success: true,
      message: "Monitor updated successfully",
      data: monitor,
    });
  } catch (error) {
    console.error("Error updating monitor:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// --- ELIMINAR MONITOR  ---
export const deleteMonitors = async (req, res) => {
  const { id } = req.params;
  const idConvert = parseInt(id);

  if (isNaN(idConvert)) {
    return res.status(400).json({
      success: false,
      error: "Invalid ID format",
    });
  }

  try {
    const existingMonitor = await prisma.monitor.findUnique({
      where: { id: idConvert },
    });

    if (!existingMonitor) {
      return res.status(404).json({
        success: false,
        error: "Monitor not found",
      });
    }

    const monitor = await prisma.monitor.delete({
      where: { id: idConvert },
    });

    return res.status(200).json({
      success: true,
      message: "Monitor deleted successfully",
      data: monitor,
    });
  } catch (error) {
    console.error("Error deleting monitor:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete monitor",
    });
  }
};

// --- CHEQUEO GENERAL EN TIEMPO REAL---
export const getStatus = async (req, res) => {
  try {
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

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error in getStatus execution loop:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// --- CHEQUEO DE UN SITIO INDIVIDUAL POR NOMBRE ---
export const getStatusOne = async (req, res) => {
  const { site } = req.params;
  try {
    const targetUrl = await prisma.monitor.findFirst({
      where: {
        name: {
          equals: site,
          mode: "insensitive", 
        },
      },
    });

    if (!targetUrl) {
      return res.status(404).json({
        success: false,
        error: "Site not monitored",
      });
    }

    const result = await executeMonitorCheck(targetUrl);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(`Error processing health check for site ${site}:`, error);
    return res.status(500).json({
      success: false,
      error: "Error processing request",
    });
  }
};

// --- HISTORIAL DE UN MONITOR ---
export const getMonitorHistory = async (req, res) => {
  const { id } = req.params;
  const idConvert = parseInt(id);

  if (isNaN(idConvert)) {
    return res.status(400).json({
      success: false,
      error: "Invalid ID format",
    });
  }

  try {
    const monitorExists = await prisma.monitor.findUnique({
      where: { id: idConvert },
    });

    if (!monitorExists) {
      return res.status(404).json({
        success: false,
        error: "Monitor not found",
      });
    }

    const history = await getHistory(idConvert);

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error(`Error fetching history for monitor ${id}:`, error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};