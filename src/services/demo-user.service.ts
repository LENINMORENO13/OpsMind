import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

export interface DemoConfig {
  enabled: boolean;
  email: string | null;
  password: string | null;
}

/**
 * El acceso demo es totalmente opt-in: solo se habilita si el despliegue define
 * DEMO_EMAIL y DEMO_PASSWORD. No hay credenciales por defecto en el código para
 * evitar exponer una cuenta conocida en instalaciones que no loSolicitan.
 *
 * Se lee de `process.env` en cada llamada (y no en tiempo de import del módulo)
 * para que los tests puedan alternarlo dinámicamente.
 */
export const getDemoConfig = (): DemoConfig => {
  const email = process.env.DEMO_EMAIL?.trim();
  const password = process.env.DEMO_PASSWORD?.trim();

  if (!email || !password) {
    return { enabled: false, email: null, password: null };
  }

  return { enabled: true, email, password };
};

export const isDemoEnabled = (): boolean => getDemoConfig().enabled;

/**
 * Crea la cuenta demo de forma idempotente (upsert sin sobrescribir la
 * contraseña si ya existe). Es un no-op cuando el modo demo está deshabilitado.
 */
export async function ensureDemoUser(): Promise<boolean> {
  const { enabled, email, password } = getDemoConfig();

  if (!enabled || !email || !password) {
    return false;
  }

  try {
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: await bcrypt.hash(password, 10),
      },
    });

    logger.info({ email }, "Demo user ensured");
    return true;
  } catch (error) {
    // Un fallo aquí no debe impedir el arranque del cron ni tumbar la app.
    logger.error({ err: error, email }, "Failed to ensure demo user");
    return false;
  }
}