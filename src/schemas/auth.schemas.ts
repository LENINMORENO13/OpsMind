import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ message: "The email is required" }) 
    .email({ message: "Invalid email format" })
    .trim(),
  password: z
    .string({ message: "The password is required" })
    .min(6, { message: "The password must be at least 6 characters" }),
});

export const registerSchema = loginSchema;

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;