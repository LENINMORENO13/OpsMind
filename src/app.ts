import express from "express";
import helmet from "helmet";
import path from "node:path";
import { existsSync } from "node:fs";
import routes from "./routes/monitor.routes.js";
import { getFormattedDate } from "./utils/helpers.js";
import { startCronJobs } from "./services/scheduler.service.js";
import { swaggerSpec } from "./config/swagger.js";
import swaggerUI from "swagger-ui-express";
import authRoutes from "./routes/auth.routes.js";
import incidentRoutes from "./routes/incidents.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import { ensureDemoUser } from "./services/demo-user.service.js";
import "./services/notification.service.js";
import type { NextFunction, Request, Response } from "express";


const app = express();

const frontendDist = path.join(process.cwd(), "frontend", "dist");
const frontendIndexHtml = path.join(frontendDist, "index.html");

console.log("--- Monitoring System ---");
console.log("Started on: ", getFormattedDate());

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));
app.use("/api/v1/monitors", routes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/incidents", incidentRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);

app.use(express.static(frontendDist));

app.use((req: Request, res: Response, next: NextFunction): void => {
  if (req.method !== "GET" || req.path.startsWith("/api")) {
    next();
    return;
  }
  if (!existsSync(frontendIndexHtml)) {
    res.status(503).json({ success: false, error: "Frontend no disponible: el panel web no se ha compilado en este despliegue." });
    return;
  }
  res.sendFile(frontendIndexHtml);
});

if (process.env.NODE_ENV !== "test") {
  const PORT: number | string = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    // Auto-crea la cuenta demo (idempotente) si las credenciales demo están
    // configuradas. Un fallo aquí no debe impedir el arranque del cron.
    ensureDemoUser().then(() => {
      startCronJobs();
    }).catch((error) => {
      console.error("Error ensuring demo user:", error);
      startCronJobs();
    });
  });
}

export default app;