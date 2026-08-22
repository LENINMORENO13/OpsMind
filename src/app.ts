import express from "express";
import routes from "./routes/monitor.routes.js";
import { getFormattedDate } from "./utils/helpers.js";
import { startCronJobs } from "./services/scheduler.service.js";
import { swaggerSpec } from "./config/swagger.js";
import swaggerUI from "swagger-ui-express";
import authRoutes from "./routes/auth.routes.js";
import incidentRoutes from "./routes/incidents.routes.js";
import "./services/notification.service.js";
import type { Request, Response } from "express";

const app = express();

console.log("--- Monitoring System ---");
console.log("Started on: ", getFormattedDate());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response): void => {
  res.redirect("/api-docs");
});

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));

app.use("/api/v1/monitors", routes);

app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/incidents", incidentRoutes);

if (process.env.NODE_ENV !== "test") {
  const PORT: number | string = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    startCronJobs();
  });
}

export default app;
