import prisma from "../lib/prisma.js";
import { analyzeStatus } from "./analyzer.js";
import { check } from "./checker.js";

export const save = async (
  monitorId,
  status,
  state,
  trend,
  responseTime,
  error = null,
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
  } catch (error) {
    throw new Error("Se registro un error en la base de datos", {
      cause: error,
    });
  }
};

export const getHistory = async (id) => {
  return prisma.log.findMany({
    where: { monitorId: id },
    orderBy: {
      timestamp: "desc",
    },
    take: 10,
  });
};

export const getLastRecord = async (id) => {
  return prisma.log.findFirst({
    where: {
      monitorId: id,
    },
    orderBy: {
      timestamp: "desc",
    },
  });
};

export const executeMonitorCheck = async (monitor) => {
  try {
    const getLatestRecord = await getLastRecord(monitor.id);
    const currentCheck = await check(monitor.url);
    const analysisResult = await analyzeStatus(currentCheck, getLatestRecord);
    const savedLog = await save(
      monitor.id,
      currentCheck.status,
      analysisResult.state,
      analysisResult.trend,
      currentCheck.responseTime,
      currentCheck.error,
    );
    return savedLog;
  } catch (error) {
    console.error(
      `Error ejecutando el chequeo para el monitor ${monitor.name}:`,
      error,
    );
    throw error;
  }
};
