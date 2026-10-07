import request from "supertest";
import type { Express } from "express";
import prisma from "../src/lib/prisma.js";
import {
  ensureDemoUser,
  getDemoConfig,
  isDemoEnabled,
} from "../src/services/demo-user.service.js";

const DEMO_EMAIL = "demo@opsmind.com";
const DEMO_PASSWORD = "demo1234";

describe("Acceso demo - auto-creación y endpoint público", () => {
  let app: Express;
  const originalEmail = process.env.DEMO_EMAIL;
  const originalPassword = process.env.DEMO_PASSWORD;

  beforeAll(async () => {
    // Activa el modo demo configurando el env antes de importar la app
    process.env.DEMO_EMAIL = DEMO_EMAIL;
    process.env.DEMO_PASSWORD = DEMO_PASSWORD;
    app = (await import("../src/app.js")).default;
  });

  afterAll(async () => {
    if (originalEmail === undefined) {
      delete process.env.DEMO_EMAIL;
    } else {
      process.env.DEMO_EMAIL = originalEmail;
    }
    if (originalPassword === undefined) {
      delete process.env.DEMO_PASSWORD;
    } else {
      process.env.DEMO_PASSWORD = originalPassword;
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });
  });

  it("No debe tener credenciales demo por defecto en el código", () => {
    const prevEmail = process.env.DEMO_EMAIL;
    const prevPassword = process.env.DEMO_PASSWORD;
    delete process.env.DEMO_EMAIL;
    delete process.env.DEMO_PASSWORD;

    try {
      expect(isDemoEnabled()).toBe(false);
      expect(getDemoConfig()).toEqual({
        enabled: false,
        email: null,
        password: null,
      });
    } finally {
      if (prevEmail !== undefined) process.env.DEMO_EMAIL = prevEmail;
      if (prevPassword !== undefined) process.env.DEMO_PASSWORD = prevPassword;
    }
  });

  it("Debería ser un no-op cuando el modo demo está deshabilitado", async () => {
    const prevEmail = process.env.DEMO_EMAIL;
    const prevPassword = process.env.DEMO_PASSWORD;
    delete process.env.DEMO_EMAIL;
    delete process.env.DEMO_PASSWORD;

    try {
      await expect(ensureDemoUser()).resolves.toBe(false);
      await expect(prisma.user.count({ where: { email: "" } })).resolves.toBe(0);
    } finally {
      if (prevEmail !== undefined) process.env.DEMO_EMAIL = prevEmail;
      if (prevPassword !== undefined) process.env.DEMO_PASSWORD = prevPassword;
    }
  });

  it("Debería auto-crear la cuenta demo de forma idempotente (sin duplicados)", async () => {
    await expect(ensureDemoUser()).resolves.toBe(true);
    await expect(ensureDemoUser()).resolves.toBe(true);

    const count = await prisma.user.count({
      where: { email: DEMO_EMAIL },
    });
    expect(count).toBe(1);
  });

  it("Debería permitir iniciar sesión con la cuenta demo auto-creada", async () => {
    await ensureDemoUser();

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.data).toBe("string");
  });

  it("Debería exponer las credenciales demo cuando el modo está habilitado", async () => {
    const response = await request(app).get("/api/v1/auth/demo");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      enabled: true,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
  });

  it("Debería reportar enabled:false cuando el modo demo está deshabilitado", async () => {
    const prevEmail = process.env.DEMO_EMAIL;
    const prevPassword = process.env.DEMO_PASSWORD;
    delete process.env.DEMO_EMAIL;
    delete process.env.DEMO_PASSWORD;

    try {
      const response = await request(app).get("/api/v1/auth/demo");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        enabled: false,
        email: null,
        password: null,
      });
    } finally {
      if (prevEmail !== undefined) process.env.DEMO_EMAIL = prevEmail;
      if (prevPassword !== undefined) process.env.DEMO_PASSWORD = prevPassword;
    }
  });
});