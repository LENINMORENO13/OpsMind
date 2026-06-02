import prisma from "../lib/prisma.js";
import { analyzeIncident } from "./aiServices.js";
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
  } catch (err) {
    throw new Error("Database persistence failed", {
      cause: err,
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

    if (analysisResult.trend === "DROP_DETECTED") {
      console.log(
        `Alerta: DROP_DETECTED en ${monitor.name}. Consultando a Gemini...`,
      );
      const errorDetails =
        analysisResult.error ||
        analysisResult.details ||
        "Timeout or without response";

      const aiDiagnosis = await analyzeIncident(
        monitor.name,
        monitor.url,
        errorDetails,
      );

      await prisma.aIInsight.create({
        data: {
          monitorId: monitor.id,
          analysis: aiDiagnosis.causa_probable,
          suggestion: aiDiagnosis.accion_recomendada,
          criticality: analysisResult.state === "DOWN" ? "CRITICAL" : "HIGH",
        },
      });
      console.log(
        `Successful AI diagnosis for ${monitor.name}`,
      );
    }
    return savedLog;
  } catch (error) {
    console.error(`Error executing monitor check for ${monitor.name}:`, error);
    throw error;
  }
};
