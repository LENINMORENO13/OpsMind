import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import { getDemoConfig } from "../services/demo-user.service.js";
import type { Request, Response } from "express";
import {
  BadRequestError,
  UnauthorizedError,
} from "../middlewares/error.middleware.js";
import { logger } from "../lib/logger.js";

export interface RegisterDTO {
  email: string;
  password: string;
}

export const register = async (
  req: Request<{}, {}, RegisterDTO>,
  res: Response,
): Promise<void> => {
  const { email, password } = req.body;

  const userExists = await prisma.user.findUnique({ where: { email } });
  if (userExists) {
    throw new BadRequestError("User with this email already exists");
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword },
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: { user: user.id, email },
    });
  } catch (error) {
    logger.error({ err: error, email }, "Error creating user");
    throw error;
  }
};

export const login = async (
  req: Request<{}, {}, RegisterDTO>,
  res: Response,
): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError();
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError();
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" },
    );

    res.status(200).json({ success: true, data: token });
  } catch (error) {
    // UnauthorizedError es una señal de credenciales inválidas, no una falla
    // del sistema: se propaga al handler global sin loguear ruido.
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    logger.error({ err: error, email }, "Error during login");
    throw error;
  }
};

/**
 * Expone las credenciales de la cuenta de prueba solo cuando el despliegue las
 * habilita de forma explícita. Sin `DEMO_EMAIL`/`DEMO_PASSWORD` devuelve
 * `enabled: false` y no filtra ningún valor.
 */
export const getDemoCredentials = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: getDemoConfig(),
  });
};