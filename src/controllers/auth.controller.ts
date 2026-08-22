import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";

export interface RegisterDTO {
  email: string;
  password: string;
}

export const register = async (
  req: Request<{}, {}, RegisterDTO>,
  res: Response,
) => {
  const { email, password } = req.body;
  try {
    const userExists = await prisma.user.findUnique({
      where: { email },
    });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });
    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: user.id,
        email,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error("Error creating user:", err);
    res.status(500).json({
      success: false,
      error: "Failed to create user",
    });
  }
};

export const login = async (
  req: Request<{}, {}, RegisterDTO>,
  res: Response,
) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" },
    );

    return res.status(200).json({
      success: true,
      data: token,
    });
  } catch (error) {
    const err = error as Error;
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
