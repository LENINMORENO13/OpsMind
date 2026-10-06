import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRequestHandler<Req extends Request = Request> = (
  req: Req,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/**
 * Envuelve un handler asíncrono para que cualquier promesa rechazada se
 * forwarding al middleware de errores global, en lugar de quedar como un
 * unhandled rejection que deja la petición colgada.
 *
 * Express 4 no captura rechazos de forma nativa, de modo que este wrapper es
 * lo que garantiza que todo error termine en `errorHandler`.
 */
export const asyncHandler =
  <Req extends Request = Request>(handler: AsyncRequestHandler<Req>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req as Req, res, next)).catch(next);
  };