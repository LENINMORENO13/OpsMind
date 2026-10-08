import type { NextFunction, Response } from "express";
import { ForbiddenError } from "./error.middleware.js";
import type { AunthenticatedRequest } from "./auth.middleware.js";

/**
 * Impide que la cuenta demo (la configurada vía `DEMO_EMAIL`) ejecute acciones
 * que mutan el estado o generan side effects: las mutaciones (POST/PATCH/DELETE)
 * de monitores e incidentes y los endpoints de status/checker (`/status/all` y
 * `/status/:site`), que lanzan checks reales, abren incidentes y consumen cuota
 * de Gemini. El resto del acceso de consulta sigue permitido.
 *
 * Se lee `process.env.DEMO_EMAIL` en cada petición (igual que
 * `demo-user.service`) para que los tests puedan alternarlo dinámicamente.
 */
export const requireNonDemo = (
  req: AunthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  const demoEmail = process.env.DEMO_EMAIL?.trim();

  if (demoEmail && req.user?.email === demoEmail) {
    next(
      new ForbiddenError(
        "Demo account is not allowed to perform this action.",
      ),
    );
    return;
  }

  next();
};