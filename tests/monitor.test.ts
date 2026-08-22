import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

describe("API de Monitores - Endpoints de Integración", () => {
  let token: string;

  beforeAll(async () => {
    if (prisma.incident) await prisma.incident.deleteMany();

    await prisma.monitor.deleteMany();

    await prisma.user.deleteMany();

    await request(app).post("/api/v1/auth/register").send({
      email: "pepito@email.com",
      password: "ops123",
    });

    const loginRequest = await request(app).post("/api/v1/auth/login").send({
      email: "pepito@email.com",
      password: "ops123",
    });

    token = loginRequest.body.data;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Autenticación", () => {
    it("Debería rechazar el acceso (HTTP 401) si no se envía el token de autorización", async () => {
      const response = await request(app).get("/api/v1/monitors");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("Debería rechazar el acceso (HTTP 401) si el token enviado es inválido", async () => {
      const response = await request(app)
        .get("/api/v1/monitors")
        .set("Authorization", "Bearer token_completamente_falso_y_roto");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/monitors", () => {
    it("Debería registrar un nuevo monitor y devolver HTTP 201", async () => {
      const nuevoMonitor = {
        name: "Google DNS",
        url: "https://google.com",
        checkInterval: 300,
      };

      const response = await request(app)
        .post("/api/v1/monitors")
        .set("Authorization", `Bearer ${token}`)
        .send(nuevoMonitor);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(nuevoMonitor.name);

      const monitorGuardado = await prisma.monitor.findFirst({
        where: { url: nuevoMonitor.url },
      });

      expect(monitorGuardado).not.toBeNull();
      expect(monitorGuardado!.name).toBe("Google DNS");
    });

    it('Debería rechazar la creación si falta la propiedad "url" (HTTP 400)', async () => {
      const monitorRoto = {
        name: "MyApp",
        checkInterval: 300,
      };

      const response = await request(app)
        .post("/api/v1/monitors")
        .set("Authorization", `Bearer ${token}`)
        .send(monitorRoto);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/monitors", () => {
    it("Debería listar todos los monitores y devolver HTTP 200", async () => {
      await prisma.monitor.create({
        data: {
          name: "App de Prueba GET",
          url: "https://get-test.com",
          checkInterval: 300,
        },
      });

      const response = await request(app)
        .get("/api/v1/monitors")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty("name");
      expect(response.body.data[0]).toHaveProperty("url");
    });
  });

  describe("DELETE /api/v1/monitors/:id", () => {
    it("Debería borrar el monitor con el id definido y devolver HTTP 200", async () => {
      const newMonitor = await prisma.monitor.create({
        data: {
          name: "App para borrar",
          url: "https://gett-test.com",
          checkInterval: 300,
        },
      });

      const monitorId = newMonitor.id;

      const response = await request(app)
        .delete("/api/v1/monitors/" + monitorId)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);

      const monitorBorrado = await prisma.monitor.findUnique({
        where: { id: monitorId },
      });

      expect(monitorBorrado).toBeNull();
    });

    it("Debería retornar HTTP 400 si se envía un ID con formato inválido", async () => {
      const idInvalido = "abc";

      const response = await request(app)
        .delete("/api/v1/monitors/" + idInvalido)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid ID format");
    });

    it("Debería retornar HTTP 404 si se intenta borrar un monitor que no existe", async () => {
      const idFantasma = 999999;

      const response = await request(app)
        .delete("/api/v1/monitors/" + idFantasma)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
