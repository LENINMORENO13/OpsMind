import prisma from "../lib/prisma.js";
import emitter from "../events/emitter.js";

export async function openIncident(
  monitorId: number,
  monitorName: string,
  monitorUrl: string,
  errorDetails: string,
) {
  try {
    // El índice único parcial (Incident_open_unique) garantiza la exclusividad
    // del estado OPEN incluso bajo llamadas concurrentes.
    const newIncident = await prisma.incident.create({
      data: {
        monitorId,
        errorDetails,
      },
    });

    emitter.emit("incident-opened", {
      incidentId: newIncident.id,
      monitorId,
      name: monitorName,
      url: monitorUrl,
      errorDetails: errorDetails,
    });
    return newIncident;
  } catch (error) {
    // Si otro proceso ya abrió el incidente, devolvemos el existente sin
    // duplicar ni reemitir el análisis de IA.
    if ((error as { code?: string })?.code === "P2002") {
      const incidentExisting = await prisma.incident.findFirst({
        where: {
          monitorId,
          status: "OPEN",
        },
      });

      if (incidentExisting) {
        return incidentExisting;
      }
    }

    throw new Error("Error opening incident", { cause: error });
  }
}

export async function resolvedIncident(monitorId: number) {
  try {
    const incidentExisting = await prisma.incident.findFirst({
      where: {
        monitorId,
        status: "OPEN",
      },
    });

    // Una recuperación sin incidente OPEN es un no-op válido: no debe romper
    // el flujo del chequeo (p. ej. primer chequeo en UP o resolución manual).
    if (!incidentExisting) {
      return null;
    }

    const now = new Date();
    const totalMinutesDown = Math.round(
      (now.getTime() - incidentExisting.startedAt.getTime()) / 60000,
    );

    const updateIncident = await prisma.incident.update({
      where: { id: incidentExisting.id },
      data: {
        status: "RESOLVED",
        resolvedAt: now,
        downtime: totalMinutesDown,
      },
    });
    return updateIncident;
  } catch (error) {
    throw new Error("Error updating the incident", { cause: error });
  }
}

export class IncidentNotFoundError extends Error {
  constructor() {
    super("Incident not found");
  }
}

export class IncidentNotOpenError extends Error {
  constructor() {
    super("Incident is not open");
  }
}

export async function resolveIncidentWithLog(
  incidentId: number,
  userId: number,
  rootCause: string,
  actionTaken: string,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const incident = await tx.incident.findUnique({
        where: { id: incidentId },
      });

      if (!incident) {
        throw new IncidentNotFoundError();
      }

      if (incident.status !== "OPEN") {
        throw new IncidentNotOpenError();
      }

      const now = new Date();
      const totalMinutesDown = Math.round(
        (now.getTime() - incident.startedAt.getTime()) / 60000,
      );

      // La transacción garantiza que la resolución del incidente y el
      // registro de la solución humana sean atómicos: o se persisten ambos
      // o ninguno, manteniendo la consistencia de los datos.
      const [updatedIncident, resolutionLog] = await Promise.all([
        tx.incident.update({
          where: { id: incidentId },
          data: {
            status: "RESOLVED",
            resolvedAt: now,
            downtime: totalMinutesDown,
          },
        }),
        tx.resolutionLog.create({
          data: {
            rootCause,
            actionTaken,
            userId,
            incidentId,
          },
        }),
      ]);

      return { incident: updatedIncident, resolutionLog };
    });
  } catch (error) {
    if (
      error instanceof IncidentNotFoundError ||
      error instanceof IncidentNotOpenError
    ) {
      throw error;
    }
    throw new Error("Error resolving the incident", { cause: error });
  }
}

export async function getRecentIncidentsContext(monitorId: number) {
  try {
    return await prisma.incident.findMany({
      where: {
        monitorId,
        status: "RESOLVED",
      },
      take: 5,
      orderBy: {
        startedAt: "desc",
      },
      select: {
        id: true,
        errorDetails: true,
        downtime: true,
        aiInsight: {
          select: {
            analysis: true,
            suggestion: true,
          },
        },
        resolutionLog: {
          select: {
            rootCause: true,
            actionTaken: true,
          },
        },
      },
    });
  } catch (error) {
    throw new Error("Error retrieving recent incidents", { cause: error });
  }
}
