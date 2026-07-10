import prisma from "../lib/prisma.js";

export async function openIncident(monitorId: number) {
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
      },
    });

    return newIncident;
  } catch (error) {
    throw new Error("Error opening incident");
  }
}
