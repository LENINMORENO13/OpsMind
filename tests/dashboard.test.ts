import prisma from "../src/lib/prisma.js";
import request from "supertest";
import app from "../src/app.js";

let token: string;
let monitorId: number;

describe("API Dashboard - Endpoints de Integración (solo lecturas)", () => {
  beforeAll(async () => {
    // Limpieza inicial
    await prisma.aIInsight.deleteMany();
    await prisma.incident.deleteMany();
    await prisma.log.deleteMany();
    await prisma.monitor.deleteMany();
    await prisma.user.deleteMany();

    // Autenticación
    await request(app).post("/api/v1/auth/register").send({
      email: "dashboard-user@email.com",
      password: "ops123password",
    });

    const loginRequest = await request(app).post("/api/v1/auth/login").send({
      email: "dashboard-user@email.com",
      password: "ops123password",
    });

    token = loginRequest.body.data;

    // Monitor base
    const monitorRes = await request(app)
      .post("/api/v1/monitors")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Servicio API",
        url: "https://api.miservicio.com/health",
        checkInterval: 300,
      });

    monitorId = monitorRes.body.data.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Autenticación", () => {
    it("Debería rechazar el acceso (HTTP 401) si no se envía el token", async () => {
      const response = await request(app).get("/api/v1/dashboard/summary");
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("Debería rechazar el acceso (HTTP 401) si el token es inválido", async () => {
      const response = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", "Bearer token_completamente_falso");
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("Debería rechazar el acceso (HTTP 401) para cada endpoint del dashboard", async () => {
      const endpoints = [
        "/api/v1/dashboard/monitors",
        "/api/v1/dashboard/incidents",
        "/api/v1/dashboard/metrics",
        "/api/v1/dashboard/insights",
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(401);
      }
    });
  });

  describe("GET /api/v1/dashboard/summary", () => {
    beforeEach(async () => {
      await prisma.log.deleteMany();
      await prisma.incident.deleteMany();
      await prisma.monitor.update({
        where: { id: monitorId },
        data: { lastStatus: "DOWN" },
      });
      await prisma.incident.create({
        data: {
          monitorId,
          status: "OPEN",
          startedAt: new Date(),
        },
      });
    });

    it("Debería retornar el resumen global con monitores, incidentes, logs e insights (HTTP 200)", async () => {
      await prisma.log.create({
        data: {
          monitorId,
          status: 200,
          responseTime: 120,
          state: "UP",
          trend: "STABLE",
          timestamp: new Date(),
        },
      });

      const response = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      expect(data.monitors.total).toBe(1);
      expect(data.monitors.byStatus.DOWN).toBe(1);
      expect(data.incidents.open).toBe(1);
      expect(data.logs24h.checks).toBe(1);
      expect(data.logs24h.availability24h).toBe(100);
      expect(data.logs24h.avgResponseTime).toBe(120);
      expect(data.insights.total).toBeGreaterThanOrEqual(0);
      expect(data.generatedAt).toBeDefined();
    });

    it("Debería calcular disponibilidad 0% cuando todos los cheques están caídos", async () => {
      await prisma.log.create({
        data: {
          monitorId,
          status: 503,
          responseTime: 3000,
          state: "DOWN",
          trend: "DROP_DETECTED",
          timestamp: new Date(),
        },
      });

      const response = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.logs24h.availability24h).toBe(0);
      expect(response.body.data.monitors.byStatus.DOWN).toBe(1);
    });

    it("Debería calcular mttr30d solo con incidentes resueltos en los últimos 30 días", async () => {
      await prisma.incident.deleteMany();
      await prisma.incident.createMany({
        data: [
          {
            monitorId,
            status: "RESOLVED",
            startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            resolvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            downtime: 60,
          },
          {
            monitorId,
            status: "RESOLVED",
            startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            downtime: 120,
          },
          {
            monitorId,
            status: "RESOLVED",
            startedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            resolvedAt: new Date(Date.now() - 59 * 24 * 60 * 60 * 1000),
            downtime: 999,
          },
        ],
      });

      const response = await request(app)
        .get("/api/v1/dashboard/summary")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      // Solo los dos recientes: (60 + 120) / 2 = 90
      expect(response.body.data.incidents.mttr30d).toBe(90);
      // Histórico global incluye el viejo: (60 + 120 + 999) / 3 = 393
      expect(response.body.data.incidents.mttrMinutes).toBe(393);
    });
  });

  describe("GET /api/v1/dashboard/monitors", () => {
    beforeEach(async () => {
      await prisma.monitor.deleteMany();
      const monitorRes = await prisma.monitor.create({
        data: {
          name: "Servicio API",
          url: "https://api.miservicio.com/health",
          checkInterval: 300,
        },
      });
      monitorId = monitorRes.id;
    });

    it("Debería listar los monitores operacionales con contexto de salud (HTTP 200)", async () => {
      const upMonitor = await prisma.monitor.create({
        data: {
          name: "Monitor UP",
          url: "https://up.miservicio.com",
          lastStatus: "UP",
        },
      });
      const downMonitor = await prisma.monitor.create({
        data: {
          name: "Monitor DOWN",
          url: "https://down.miservicio.com",
          lastStatus: "DOWN",
        },
      });

      await prisma.log.createMany({
        data: [
          { monitorId: upMonitor.id, status: 200, responseTime: 80, state: "UP", trend: "STABLE", timestamp: new Date() },
          { monitorId: downMonitor.id, status: 503, responseTime: 2500, state: "DOWN", trend: "DROP_DETECTED", timestamp: new Date() },
          { monitorId: downMonitor.id, status: 503, responseTime: 2400, state: "DOWN", trend: "OFFLINE", timestamp: new Date(Date.now() - 60 * 60 * 1000) },
        ],
      });

      const response = await request(app)
        .get("/api/v1/dashboard/monitors")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);

      // Los monitores con estado peor aparecen primero
      expect(response.body.data[0].name).toBe("Monitor DOWN");
      expect(response.body.data[0].lastStatus).toBe("DOWN");
      expect(response.body.data[0].checks24h).toBe(2);
      expect(response.body.data[0].availability24h).toBe(0);
      expect(response.body.data[0].lastChecked).not.toBeNull();
      // Promedio de respuesta 24h: (2500 + 2400) / 2 = 2450
      expect(response.body.data[0].avgResponseTime24h).toBe(2450);

      const up = response.body.data.find(
        (m: { name: string }) => m.name === "Monitor UP",
      );
      expect(up.lastStatus).toBe("UP");
      expect(up.availability24h).toBe(100);
      expect(up.avgResponseTime24h).toBe(80);
    });

    it("Debería incluir los incidentes abiertos de cada monitor", async () => {
      const monitor = await prisma.monitor.create({
        data: { name: "Monitor con incidente", url: "https://inc.miservicio.com" },
      });
      await prisma.incident.create({
        data: { monitorId: monitor.id, status: "OPEN", startedAt: new Date() },
      });

      const response = await request(app)
        .get("/api/v1/dashboard/monitors")
        .set("Authorization", `Bearer ${token}`);

      const monitorResult = response.body.data.find(
        (m: { id: number }) => m.id === monitor.id,
      );
      expect(monitorResult).toBeDefined();
      expect(monitorResult.openIncidents).toBe(1);
    });

    it("Debería devolver HTTP 400 con window inválido", async () => {
      const response = await request(app)
        .get("/api/v1/dashboard/monitors?limit=0")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation error");
    });
  });

  describe("GET /api/v1/dashboard/incidents", () => {
    beforeEach(async () => {
      await prisma.incident.deleteMany();
    });

    it("Debería retornar incidentes abiertos y recientes con contexto (HTTP 200)", async () => {
      await prisma.incident.create({
        data: {
          monitorId,
          status: "OPEN",
          startedAt: new Date(Date.now() - 10 * 60 * 1000),
        },
      });
      await prisma.incident.create({
        data: {
          monitorId,
          status: "RESOLVED",
          startedAt: new Date(Date.now() - 60 * 60 * 1000),
          resolvedAt: new Date(Date.now() - 30 * 60 * 1000),
          downtime: 30,
        },
      });

      const response = await request(app)
        .get("/api/v1/dashboard/incidents")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);

      const open = response.body.data.find((i: { status: string }) => i.status === "OPEN");
      const resolved = response.body.data.find((i: { status: string }) => i.status === "RESOLVED");

      expect(open).toBeDefined();
      expect(open.monitor.name).toBe("Servicio API");
      expect(resolved.downtime).toBe(30);
    });

    it("Debería filtrar por ventana de tiempo (HTTP 200)", async () => {
      await prisma.incident.create({
        data: {
          monitorId,
          status: "RESOLVED",
          startedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
          resolvedAt: new Date(Date.now() - 9 * 60 * 60 * 1000),
          downtime: 60,
        },
      });

      const response = await request(app)
        .get("/api/v1/dashboard/incidents?window=24h")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it("Debería filtrar por monitorId", async () => {
      const otroMonitor = await prisma.monitor.create({
        data: { name: "Otro", url: "https://otro.miservicio.com" },
      });
      await prisma.incident.create({
        data: { monitorId: otroMonitor.id, status: "OPEN", startedAt: new Date() },
      });

      const response = await request(app)
        .get(`/api/v1/dashboard/incidents?monitorId=${monitorId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it("Debería devolver HTTP 400 con window inválido", async () => {
      const response = await request(app)
        .get("/api/v1/dashboard/incidents?window=10m")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation error");
    });
  });

  describe("GET /api/v1/dashboard/metrics", () => {
    beforeEach(async () => {
      await prisma.log.deleteMany();
    });

    it("Debería retornar métricas globales y buckets por hora (HTTP 200)", async () => {
      await prisma.log.createMany({
        data: [
          { monitorId, status: 200, responseTime: 100, state: "UP", trend: "STABLE", timestamp: new Date() },
          { monitorId, status: 200, responseTime: 150, state: "UP", trend: "STABLE", timestamp: new Date(Date.now() - 60 * 1000) },
          { monitorId, status: 503, responseTime: 2000, state: "DOWN", trend: "DROP_DETECTED", timestamp: new Date(Date.now() - 2 * 60 * 1000) },
        ],
      });

      const response = await request(app)
        .get("/api/v1/dashboard/metrics?bucket=1h")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      expect(data.overall.checks).toBe(3);
      expect(data.overall.availability).toBeCloseTo(66.67, 2);
      expect(data.overall.avgResponseTime).toBe(750);
      expect(data.overall.byState.DOWN).toBe(1);
      expect(Array.isArray(data.buckets)).toBe(true);
      expect(data.buckets.length).toBeGreaterThan(0);
      expect(data.buckets[0]).toHaveProperty("availability");
    });

    it("Debería filtrar por monitorId", async () => {
      const otroMonitor = await prisma.monitor.create({
        data: { name: "Otro", url: "https://metric-otro.miservicio.com" },
      });
      await prisma.log.create({
        data: { monitorId: otroMonitor.id, status: 200, responseTime: 50, state: "UP", trend: "STABLE", timestamp: new Date() },
      });

      const response = await request(app)
        .get(`/api/v1/dashboard/metrics?monitorId=${otroMonitor.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.monitorId).toBe(otroMonitor.id);
      expect(response.body.data.overall.checks).toBe(1);
      expect(response.body.data.overall.avgResponseTime).toBe(50);
    });

    it("Debería devolver HTTP 400 con bucket inválido", async () => {
      const response = await request(app)
        .get("/api/v1/dashboard/metrics?bucket=7s")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation error");
    });
  });

  describe("GET /api/v1/dashboard/insights", () => {
    beforeEach(async () => {
      await prisma.aIInsight.deleteMany();
      await prisma.incident.deleteMany();
    });

    it("Debería retornar los insights recientes con su incidente (HTTP 200)", async () => {
      const incident = await prisma.incident.create({
        data: {
          monitorId,
          status: "OPEN",
          startedAt: new Date(),
        },
      });

      await prisma.aIInsight.create({
        data: {
          incidentId: incident.id,
          analysis: "Fallo detectado por timeout",
          suggestion: "Revisar conexión de red",
          criticality: "HIGH",
          historicalAnalysis: null,
        },
      });

      const response = await request(app)
        .get("/api/v1/dashboard/insights")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].analysis).toBe("Fallo detectado por timeout");
      expect(response.body.data[0].criticality).toBe("HIGH");
      expect(response.body.data[0].incident.monitor.name).toBe("Servicio API");
    });

    it("Debería respetar el límite de resultados (HTTP 200)", async () => {
      const incidentA = await prisma.incident.create({
        data: { monitorId, status: "OPEN", startedAt: new Date() },
      });
      const incidentB = await prisma.incident.create({
        data: {
          monitorId,
          status: "RESOLVED",
          startedAt: new Date(Date.now() - 60 * 60 * 1000),
          resolvedAt: new Date(),
          downtime: 10,
        },
      });

      await prisma.aIInsight.createMany({
        data: [
          {
            incidentId: incidentA.id,
            analysis: "Insight A",
            suggestion: null,
            criticality: "LOW",
            historicalAnalysis: null,
          },
          {
            incidentId: incidentB.id,
            analysis: "Insight B",
            suggestion: null,
            criticality: "MEDIUM",
            historicalAnalysis: null,
          },
        ],
      });

      const response = await request(app)
        .get("/api/v1/dashboard/insights?limit=1")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it("Debería devolver HTTP 400 si el límite es inválido", async () => {
      const response = await request(app)
        .get("/api/v1/dashboard/insights?limit=999")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation error");
    });
  });
});