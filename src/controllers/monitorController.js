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
        error: "Ya existe un monitor con esa URL",
        monitor: existingMonitor,
      });
    }

    const newMonitor = await prisma.monitor.create({
      data: {
        name,
        url,
      },
    });
    // res.status(201).json(newMonitor);
    res.redirect("/monitors");
  } catch (error) {
    console.error("Error al crear monitor:", error);
    res.status(500).json({ error: "No se pudo crear el monitor" });
  }
};

export const renderNewForm = async(req,res)=>{
  res.render('monitors/new')
}

export const getMonitors = async (req, res) => {
  try {
    const monitors = await prisma.monitor.findMany();
    res.render("monitors/index", { monitors });
  } catch (error) {
    res.status(500).send("Error en el servidor");
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
        error: "Ya existe un monitor con esa URL",
        code: "URL_DUPLICATED",
      });
    }
    await prisma.monitor.update({
      where: {
        id: idConvert,
      },
      data: {
        name,
        url,
      },
    });
    res.redirect("/monitors");
  } catch (error) {
    console.log(error);
    res.status(500).send("Error en el servidor");
  }
};

export const renderEditForm = async (req, res) => {
  const { id } = req.params;
  const idConvert = parseInt(id);
  const monitor = await prisma.monitor.findUnique({
    where: {
      id: idConvert,
    },
  });
  res.render("monitors/edit", { monitor });
};

export const deleteMonitors = async (req, res) => {
  const { id } = req.params;
  const idConvert = parseInt(id);
  if (isNaN(idConvert)) {
    return res.status(400).json({ error: "ID inválido" });
  }
  try {
    await prisma.monitor.delete({
      where: {
        id: idConvert,
      },
    });
    // return res.json({ message: "Monitor eliminado correctamente" });
    res.redirect("/monitors");
  } catch (error) {
    console.log("Error al eliminar el monitor", error);
    return res.status(500).json({ error: "Error al eliminar el monitor" });
  }
};

export const processUrl = async (url) => {
  try {
    const response = await check(url);
    const history = await getHistory(url);

    const analysis = analyzeStatus(response);
    console.log("DATOS PARA GUARDAR:", {
      url,
      status: response.status,
      state: analysis?.state,
      trend: analysis.trend,
      time: response.responseTime,
    });

    // await save(url, response.status, analysis.state, analysis.trend, response.responseTime);

    return analysis;
  } catch (error) {
    // await save(url, 0, "DOWN", 0, error.message);

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
    return res.json(results);
  } catch (error) {
    console.error("Error en getStatus:", error);
    res.status(500).json({ error: "Server error" });
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
      return res.status(404).json({ error: "Site not monitored" });
    }

    const result = await processUrl(targetUrl.url);
    return res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Error processing request" });
  }
};
