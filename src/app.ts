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
import healthRoutes from "./routes/health.routes.js";
import { ensureDemoUser } from "./services/demo-user.service.js";
import "./services/notification.service.js";
import type { NextFunction, Request, Response } from "express";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import { logger } from "./lib/logger.js";


const app = express();

const frontendDist = path.join(process.cwd(), "frontend", "dist");
const frontendIndexHtml = path.join(frontendDist, "index.html");

logger.info(
  { service: "opsmind-api", startedAt: getFormattedDate() },
  "--- Monitoring System ---",
);

// Render/Nginx forward X-Forwarded-For; sin esto express-rate-limit vería la
// IP del proxy (una sola para todos) y bloquearía/liberaría a todos a la vez.
app.set("trust proxy", 1);

// CSP mínima para el SPA (Vite produce assets hasheados). La primera fidelidad
// del servidor es self-origin; 'unsafe-inline' en style cubre atributos style
// que React inyecta vía DOM y data: los iconos/fuentes embebidos.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);


app.use(
  "/api-docs",
  (_req: Request, res: Response, next: NextFunction) => {
    // Swagger-ui inyecta sus estilos/scripts inline y quedaría roto con la CSP
    // global; se descarta la cabecera solo para esta ruta de documentación.
    res.removeHeader("Content-Security-Policy");
    next();
  },
  swaggerUI.serve,
  swaggerUI.setup(swaggerSpec),
);
app.use("/health", healthRoutes);
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

// Unhandled routes bajo /api responden JSON; cualquier otra ruta ya fue
// absorbida por el fallback del SPA o por los archivos estáticos.
app.use("/api", notFoundHandler);

// El manejador de errores debe registrarse al final del pipeline.
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  const PORT: number | string = process.env.PORT || 3000;

  // Fail-fast: sin JWT_SECRET no hay autenticación posible; mejor abortar que
  // arrancar con toda la API de auth rota silenciosamente.
  if (!process.env.JWT_SECRET) {
    logger.fatal("JWT_SECRET is required but was not provided. Aborting startup.");
    process.exit(1);
  }
  if (process.env.JWT_SECRET.length < 32) {
    logger.warn("JWT_SECRET is shorter than 32 characters; use a long, random secret.");
  }

  app.listen(PORT, () => {
    logger.info({ port: PORT }, `Servidor corriendo en el puerto ${PORT}`);
    // Auto-crea la cuenta demo (idempotente) si las credenciales demo están
    // configuradas. ensureDemoUser ya captura sus propios errores, así que un
    // fallo aquí no impide el arranque del cron.
    void ensureDemoUser().finally(() => {
      startCronJobs();
    });
  });
}

export default app;