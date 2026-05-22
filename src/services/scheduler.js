import prisma from "../lib/prisma";
import cron from "node-cron";
import { executeMonitorCheck } from "./historyService";

export const startCronJobs = () => {
  cron.schedule("*/5 * * * *", async () => {
    console.log("Iniciando chequeo automatico de monitores...");

    try {
      const monitors = await prisma.monitor.findMany();
      for (const monitor of monitors) {
        try {
          await executeMonitorCheck(monitor);
          console.log(`Chequeo completo para: ${monitor.name}`);
        } catch (error) {
          console.error(`Error chequeando ${monitor.name}:`, error.message);
        }
      }
      console.log("Ciclo de chequeo automático finalizado.");
    } catch (error) {
      console.error(" Error crítico en la tarea en segundo plano:", error);
    }
  });
};
