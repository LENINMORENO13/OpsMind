import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "./error.middleware.js";

export interface CustomJwtPayload {
  id: string;
  email: string;
}

export interface AunthenticatedRequest<
  Params = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
> extends Request<Params, ResBody, ReqBody> {
  user?: CustomJwtPayload;
}

/**
 * Verifica el JWT del header `Authorization: Bearer <token>` e inyecta
 * `req.user = { id, email }`. Los fallos se lanzan como `UnauthorizedError` para
 * que el manejador global produzca un 401 con el envelope estándar.
 */
export const verifyToken = (
  req: AunthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    next(new UnauthorizedError("Access denied. Token not provided."));
    return;
  }

  const token = header.split(" ")[1];

  try {
    req.user = jwt.verify(
      token,
      process.env.JWT_SECRET!,
    ) as CustomJwtPayload;

    next();
  } catch {
    next(new UnauthorizedError("Invalid token"));
  }
};