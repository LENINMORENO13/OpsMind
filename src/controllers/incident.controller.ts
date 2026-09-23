import prisma from "../lib/prisma.js";
import type { Request, Response } from "express";
import type { AunthenticatedRequest } from "../middlewares/auth.middleware.js";
import {
  IncidentNotFoundError,
  ResolutionAlreadyRecordedError,
  resolveIncidentWithLog,
} from "../services/incident.service.js";

export const getOpenIncidents = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const openIncidents = await prisma.incident.findMany({
      where: {
        status: "OPEN",
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        monitor: {
          select: {
            name: true,
            url: true,
          },
        },
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
    res.status(200).json({
      success: true,
      data: openIncidents,
    });
  } catch (error) {
    console.error("Error fetching incidents");
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const getResolvedIncidents = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const monitorId = Number(req.params.monitorId);
  try {
    const incidents = await prisma.incident.findMany({
      where: {
        monitorId,
        status: "RESOLVED",
      },
      include: {
        aiInsight: true,
      },
      orderBy: {
        startedAt: "desc",
      },
    });
    res.status(200).json({
      success: true,
      data: incidents,
    });
  } catch (error) {
    console.error("Error fetching incidents");
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const resolveIncident = async (
  req: AunthenticatedRequest,
  res: Response,
): Promise<void> => {
  const id = Number(req.params.id);
  const { rootCause, actionTaken } = req.body;

  try {
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

    res.status(200).json({
      success: true,
      message,
      data: result,
    });
  } catch (error) {
    if (error instanceof IncidentNotFoundError) {
      res.status(404).json({
        success: false,
        error: "Incident not found",
      });
      return;
    }
    if (error instanceof ResolutionAlreadyRecordedError) {
      res.status(409).json({
        success: false,
        error: "A resolution has already been recorded for this incident",
      });
      return;
    }
    console.error("Error resolving the incident");
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
