import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

// Credenciales demo públicas para que un evaluador pueda probar el panel sin
// registrarse. La cuenta se auto-crea de forma idempotente al arrancar.
export const DEMO_EMAIL = process.env.DEMO_EMAIL || "demo@opsmind.com";
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "demo1234";

export const isDemoEnabled = (): boolean =>
  Boolean(process.env.DEMO_EMAIL && process.env.DEMO_PASSWORD);

export async function ensureDemoUser(): Promise<void> {
  // Upsert idempotente: si la cuenta existe, se deja intacta; si no, se crea
  // con la contraseña demo. No pisa credenciales ya registradas.
  await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      password: await bcrypt.hash(DEMO_PASSWORD, 10),
    },
  });
}