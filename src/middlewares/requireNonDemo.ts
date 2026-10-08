import type { NextFunction, Response } from "express";
import { ForbiddenError } from "./error.middleware.js";
import type { AunthenticatedRequest } from "./auth.middleware.js";

/**
 * Impide que la cuenta demo (la configurada vía `DEMO_EMAIL`) ejecute
 * operaciones destructivas en monitores e incidentes. El acceso de solo lectura
 * sigue permitido: la demo existe para explorar el panel, no para alterar el
 * estado de producción.
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
        "Demo account is read-only; this action is not allowed.",
      ),
    );
    return;
  }

  next();
};