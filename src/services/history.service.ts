import prisma from "../lib/prisma.js";
import { analyzeStatus } from "./analyzer.service.js";
import { check } from "./checker.service.js";
import { openIncident, resolvedIncident } from "./incident.service.js";
import { logger } from "../lib/logger.js";
import type { Monitor, ServiceStatus, TrendStatus } from "@prisma/client";

export const save = async (
  monitorId: number,
  status: number,
  state: ServiceStatus,
  trend: TrendStatus,
  responseTime: number,
  error: string | null = null,
) => {
  try {
    const newLog = await prisma.log.create({
      data: {
        monitorId,
        status,
        state,
        trend,
        responseTime,
        error,
      },
    });
    return newLog;
  } catch (err) {
    throw new Error("Database persistence failed", {
      cause: err,
    });
  }
};

export const getHistory = async (id: number) => {
  return prisma.log.findMany({
    where: { monitorId: id },
    orderBy: {
      timestamp: "desc",
    },
    take: 10,
  });
};

export const getLastRecord = async (id: number) => {
  return prisma.log.findFirst({
    where: {
      monitorId: id,
    },
    orderBy: {
      timestamp: "desc",
    },
  });
};

export const executeMonitorCheck = async (monitor: Monitor) => {
  try {
    const lastRecord = await getLastRecord(monitor.id);
    const currentCheck = await check(monitor.url);
    const analysisResult = await analyzeStatus(currentCheck, lastRecord);

    const savedLog = await save(
      monitor.id,
      currentCheck.status,
      analysisResult.state,
      analysisResult.trend,
      currentCheck.responseTime,
      currentCheck.error,
    );

    // lastStatus refleja siempre el último estado observado del monitor
    await prisma.monitor.update({
      where: { id: monitor.id },
      data: { lastStatus: analysisResult.state },
    });

    const errorDetails =
      analysisResult.error ||
      analysisResult.details ||
      "Timeout or without response";

    // Se abre incidente ante una caída detectada (DROP_DETECTED) o cuando el
    // primer chequeo del monitor ya lo encuentra caído (OFFLINE con estado DOWN).
    // openIncident es idempotente por el índice único parcial: los chequeos
    // posteriores (DOWN→DOWN) no duplican incidente ni re-emiten análisis IA.
    if (
      analysisResult.trend === "DROP_DETECTED" ||
      analysisResult.state === "DOWN"
    ) {
      await openIncident(monitor.id, monitor.name, monitor.url, errorDetails);
    }

    if (analysisResult.trend === "RECOVERED") {
      await resolvedIncident(monitor.id);
    }

    return { ...savedLog, message: errorDetails };
  } catch (error) {
    logger.error(
      { err: error, monitor: monitor.name, monitorId: monitor.id },
      "Error executing monitor check",
    );
    throw error;
  }
};
