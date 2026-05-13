import { check } from "../services/checker.js";
import { analyzeStatus } from "../services/analyzer.js";
import { save, getHistory } from "../services/historyService.js";
import prisma from "../lib/prisma.js";

export const createMonitors = async (req, res) => {
  const { name, url } = req.body;
  try {
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
      data: {
        name,
        url,
      },
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

export const getMonitors = async (req, res) => {
  try {
    const monitors = await prisma.monitor.findMany();
    return res.status(200).json({
      success: true,
      data: monitors,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const updateMonitors = async (req, res) => {
  const { id } = req.params;
  const { url, name } = req.body;
  const idConvert = parseInt(id);

  try {
    const duplicate = await prisma.monitor.findFirst({
      where: {
        url: url,
        NOT: {
          id: idConvert,
        },
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
      where: {
        id: idConvert,
      },
      data: {
        name,
        url,
      },
    });
    return res.status(200).json({
      success: true,
      message: "Monitor updated successfully",
      data: monitor,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

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
    const monitor = await prisma.monitor.delete({
      where: {
        id: idConvert,
      },
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

export const processUrl = async (url) => {
  try {
    const response = await check(url);
    const analysis = analyzeStatus(response);
    
    console.log("DATA TO SAVE:", {
      url,
      status: response.status,
      state: analysis?.state,
      trend: analysis.trend,
      time: response.responseTime,
    });

    return analysis;
  } catch (error) {
    return {
      message: "Connection failed",
      trend: "OFFLINE",
      state: "DOWN",
      error: true,
    };
  }
};

export const getStatus = async (req, res) => {
  try {
    const monitors = await prisma.monitor.findMany();
    const results = [];
    for (const monitor of monitors) {
      const statusResult = await processUrl(monitor.url);
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
      data: results
    });
  } catch (error) {
    console.error("Error in getStatus:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

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

    const result = await processUrl(targetUrl.url);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Error processing request",
    });
  }
};