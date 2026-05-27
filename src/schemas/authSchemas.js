import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string({ required_error: "The email is required" })
    .email({ message: "Invalid email format" })
    .trim(),
  password: z
    .string({ required_error: "The password is required" })
    .min(6, { message: "The password must be at least 6 characters" }),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "The email is required" })
    .email({ message: "Invalid email format" })
    .trim(),
  password: z
    .string({ required_error: "The password is required" })
    .min(6, { message: "The password must be at least 6 characters" }),
});
