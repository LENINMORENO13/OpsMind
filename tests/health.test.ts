import request from "supertest";
import type { Express } from "express";

describe("Health check endpoints", () => {
  let app: Express;

  beforeAll(async () => {
    app = (await import("../src/app.js")).default;
  });

  it("GET /health responde 200 con estado ok sin requerir autenticación", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
  });

  it("GET /health/ready responde 200 cuando la base de datos está accesible", async () => {
    const response = await request(app).get("/health/ready");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.database).toBe("up");
  });

  it("GET /health/ready devuelve 503 si la base de datos no responde", async () => {
    const prismaModule = await import("../src/lib/prisma.js");
    const spy = jest
      .spyOn(prismaModule.default, "$queryRaw")
      .mockRejectedValue(new Error("connection refused") as never);

    try {
      const response = await request(app).get("/health/ready");

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.data.database).toBe("down");
    } finally {
      spy.mockRestore();
    }
  });

  it("GET /health incluye la marca de tiempo de arranque", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(typeof response.body.data.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(response.body.data.timestamp))).toBe(false);
  });

  it("Las rutas de health no exigen token JWT", async () => {
    const response = await request(app)
      .get("/health")
      .set("Authorization", "");

    expect(response.status).toBe(200);
  });

  it("Las rutas inexistentes devuelven 404 en JSON con el envelope estándar", async () => {
    const response = await request(app).get("/api/v1/no-existe");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain("not found");
  });
});