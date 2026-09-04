import prisma from "../lib/prisma.js";
import emitter from "../events/emitter.js";

export async function openIncident(
  monitorId: number,
  monitorName: string,
  monitorUrl: string,
  errorDetails: string,
) {
  try {
    const incidentExisting = await prisma.incident.findFirst({
      where: {
        monitorId,
        status: "OPEN",
      },
    });

    if (incidentExisting) {
      return incidentExisting;
    }

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
    throw new Error("Error opening incident");
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

    if (!incidentExisting) {
      throw new Error("There is no open incident for this monitor.");
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
        errorDetails: true,
        downtime: true,
        aiInsight: {
          select: {
            analysis: true,
            suggestion: true,
          },
        },
      },
    });
  } catch (error) {
    throw new Error("Error retrieving recent incidents", { cause: error });
  }
}
