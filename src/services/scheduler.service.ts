import prisma from "../lib/prisma.js";
import cron from "node-cron";
import { executeMonitorCheck } from "./history.service.js";
import { logger } from "../lib/logger.js";

const CRON_EXPRESSION = "*/5 * * * *";

export const startCronJobs = (): void => {
  logger.info({ expression: CRON_EXPRESSION }, "Scheduler started");

  cron.schedule(CRON_EXPRESSION, async () => {
    logger.debug("Starting automatic monitor checks...");

    try {
      // isActive decide si el monitor se evalúa.
      const monitors = await prisma.monitor.findMany({
        where: { isActive: true },
      });

      for (const monitor of monitors) {
        try {
          const lastLog = await prisma.log.findFirst({
            where: { monitorId: monitor.id },
            orderBy: { timestamp: "desc" },
          });

          if (lastLog) {
            // Throttle por ventana: omite el chequeo si el último registro
            // pertenece a la misma ventana temporal que el tick actual.
            // Comparar por ventana evita que pequeños desfases entre el log y el tick
            // dupliquen la cadencia efectiva (p. ej., intervalo de 5 min → 10 min).
            const intervalMs = monitor.checkInterval * 1000;
            const currentWindow = Math.floor(Date.now() / intervalMs);
            const lastLogWindow = Math.floor(
              lastLog.timestamp.getTime() / intervalMs,
            );

            if (currentWindow === lastLogWindow) {
              continue;
            }
          }

          await executeMonitorCheck(monitor);

          logger.debug({ monitor: monitor.name }, "Check complete");
        } catch (error) {
          logger.error(
            { err: error, monitor: monitor.name, monitorId: monitor.id },
            "Error checking monitor",
          );
        }
      }

      logger.debug(
        { checked: monitors.length },
        "Automatic monitor check cycle finished",
      );
    } catch (error) {
      logger.error({ err: error }, "Critical error in background task");
    }
  });
};
