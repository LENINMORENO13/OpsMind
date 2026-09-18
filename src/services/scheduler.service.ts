import prisma from "../lib/prisma.js";
import cron from "node-cron";
import { executeMonitorCheck } from "./history.service.js";

export const startCronJobs = (): void => {
  cron.schedule("*/5 * * * *", async () => {
    console.log("Starting automatic monitor checks...");

    try {
      // isActive decide si el monitor se evalúa; checkInterval, cuándo
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
            const elapsedMs = Date.now() - lastLog.timestamp.getTime();
            if (elapsedMs < monitor.checkInterval * 1000) {
              continue;
            }
          }

          await executeMonitorCheck(monitor);

          console.log(`Check complete for: ${monitor.name}`);
        } catch (error) {
          const err = error as Error
          console.error(`Error checking ${monitor.name}:`, err.message);
        }
      }
      console.log("Automatic monitor check cycle finished.");
    } catch (error) {
      console.error("Critical error in background task:", error);
    }
  });
};
