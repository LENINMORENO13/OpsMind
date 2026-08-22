import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export interface CustomJwtPayload {
  id: string;
  email: string;
}

export interface AunthenticatedRequest extends Request {
  user?: CustomJwtPayload;
}

export const verifyToken = async (
  req: AunthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Access denied. Token not provided.",
    });
  }

  const token = header.split(" ")[1];

  try {
    const verify = jwt.verify(
      token,
      process.env.JWT_SECRET!,
    ) as CustomJwtPayload;

    req.user = verify;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }
};
