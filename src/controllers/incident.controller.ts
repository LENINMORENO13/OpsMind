import prisma from "../lib/prisma.js";
import type { Request, Response } from "express";
import type { AunthenticatedRequest } from "../middlewares/auth.middleware.js";
import { resolveIncidentWithLog } from "../services/incident.service.js";

export const getOpenIncidents = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const openIncidents = await prisma.incident.findMany({
    where: { status: "OPEN" },
    select: {
      id: true,
      status: true,
      startedAt: true,
      monitor: { select: { name: true, url: true } },
      aiInsight: {
        select: {
          analysis: true,
          suggestion: true,
          criticality: true,
          historicalAnalysis: true,
          createdAt: true,
        },
      },
    },
  });

  res.status(200).json({ success: true, data: openIncidents });
};

export const getResolvedIncidents = async (
  req: Request<{ monitorId: string }, unknown, unknown>,
  res: Response,
): Promise<void> => {
  const monitorId = Number(req.params.monitorId);

  const incidents = await prisma.incident.findMany({
    where: { monitorId, status: "RESOLVED" },
    include: { aiInsight: true },
    orderBy: { startedAt: "desc" },
  });

  res.status(200).json({ success: true, data: incidents });
};

export const resolveIncident = async (
  req: AunthenticatedRequest<{ id: string }, unknown, IncidentResolutionDTO>,
  res: Response,
): Promise<void> => {
  const id = Number(req.params.id);
  const { rootCause, actionTaken } = req.body;

  const result = await resolveIncidentWithLog(
    id,
    Number(req.user?.id),
    rootCause,
    actionTaken,
  );

  let message: string;
  if (result.closedNow) {
    message = "Incident resolved successfully";
  } else if (result.incident.status === "RESOLVED") {
    message =
      "Resolution recorded. Incident was already resolved (recovered before logging).";
  } else {
    message =
      "Resolution recorded. Incident will close once the service recovers.";
  }

  res.status(200).json({ success: true, message, data: result });
};

export interface IncidentResolutionDTO {
  rootCause: string;
  actionTaken: string;
}