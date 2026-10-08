import request from "supertest";
import type { Express } from "express";
import prisma from "../src/lib/prisma.js";
import { ensureDemoUser } from "../src/services/demo-user.service.js";

const DEMO_EMAIL = "demo-readonly@opsmind.com";
const DEMO_PASSWORD = "demo-readonly-pass";
const NORMAL_USER_EMAIL = "readwrite@opsmind.com";
const NORMAL_USER_PASSWORD = "readwrite-pass";

describe("Cuenta demo - solo lectura (requireNonDemo)", () => {
  let app: Express;

  beforeAll(async () => {
    process.env.DEMO_EMAIL = DEMO_EMAIL;
    process.env.DEMO_PASSWORD = DEMO_PASSWORD;
    app = (await import("../src/app.js")).default;
    await ensureDemoUser();
  });

  afterAll(async () => {
    delete process.env.DEMO_EMAIL;
    delete process.env.DEMO_PASSWORD;
    await prisma.user.deleteMany({
      where: { email: { in: [DEMO_EMAIL, NORMAL_USER_EMAIL] } },
    });
    await prisma.monitor.deleteMany({
      where: { name: "readonly-guard-test" },
    });
    await prisma.$disconnect();
  });

  const loginToken = async (email: string, password: string): Promise<string> => {
    const response = await request(app).post("/api/v1/auth/login").send({ email, password });
    expect(response.status).toBe(200);
    return response.body.data as string;
  };

  it("Debería rechazar con HTTP 403 el POST /monitors para la cuenta demo", async () => {
    const token = await loginToken(DEMO_EMAIL, DEMO_PASSWORD);

    const response = await request(app)
      .post("/api/v1/monitors")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "readonly-guard-test", url: "https://example.com" });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain("read-only");
  });

  it("No debería crear el monitor cuando la cuenta demo recibe 403", async () => {
    await expect(
      prisma.monitor.count({ where: { name: "readonly-guard-test" } }),
    ).resolves.toBe(0);
  });

  it("Debería permitir el POST /monitors para un usuario normal", async () => {
    await request(app).post("/api/v1/auth/register").send({
      email: NORMAL_USER_EMAIL,
      password: NORMAL_USER_PASSWORD,
    });
    const token = await loginToken(NORMAL_USER_EMAIL, NORMAL_USER_PASSWORD);

    const response = await request(app)
      .post("/api/v1/monitors")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "readonly-guard-test", url: "https://example.com" });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});