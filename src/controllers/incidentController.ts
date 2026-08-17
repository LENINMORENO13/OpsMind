import prisma from "../lib/prisma.js";
import type { Request, Response } from "express";

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
  const { monitorId } = req.params;
  const idConvert = Number(monitorId);
  try {
    const incidents = await prisma.incident.findMany({
      where: {
        monitorId: idConvert,
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
