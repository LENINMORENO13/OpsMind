import prisma from "../lib/prisma.js";
export const save = async (
  url,
  status,
  state,
  trend,
  responseTime,
  error = null,
) => {
  try {
    const newLog = await prisma.log.create({
      data: {
        url,
        status,
        state,
        trend,
        responseTime,
        error,
      },
    });
    return newLog;
  } catch (error) {
    console.error("Se registro un error en la base de datos", error);
  }
};

export const getHistory = async (url) => {
  try {
    const logs = await prisma.log.findMany({
      where: { url },
      orderBy: {
        timestamp: "desc",
      },
      take: 10,
    });
    return logs;
  } catch (error) {
    console.error("Error al obtener el historial", error);
    return [];
  }
};
