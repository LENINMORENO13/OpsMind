import prisma from "../src/lib/prisma.js";
import request from "supertest";
import app from "../src/app.js";
import { processIncidentInsight } from "../src/services/ai.service.js";
import { openIncident, resolvedIncident } from "../src/services/incident.service.js";

let token: string;
let monitorId: number;

// Mock del servicio de IA con el nombre de función correcto
jest.mock("../src/services/ai.service.js", () => ({
  processIncidentInsight: jest.fn(),
}));

const mockedProcessInsight = jest.mocked(processIncidentInsight);

describe("API de Incidentes - Suite de Integración", () => {
  beforeAll(async () => {
    // 1. Limpieza inicial
    await prisma.incident.deleteMany();
    await prisma.monitor.deleteMany();
    await prisma.user.deleteMany();

    // 2. Autenticación
    await request(app).post("/api/v1/auth/register").send({
      email: "incident-user@email.com",
      password: "ops123password",
    });

    const loginRequest = await request(app).post("/api/v1/auth/login").send({
      email: "incident-user@email.com",
      password: "ops123password",
    });

    token = loginRequest.body.data;

    // 3. Crear monitor base para todas las pruebas
    const monitorRes = await request(app)
      .post("/api/v1/monitors")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Servicio de Autenticación",
        url: "https://auth.miservicio.com/health",
      });

    monitorId = monitorRes.body.data.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // --- BLOQUE 1: SERVICIO DE INCIDENTES & EVENTEMITTER DE IA ---
  describe("Ciclo de Vida de Incidentes & Evento de IA", () => {
    beforeEach(async () => {
      await prisma.incident.deleteMany();
      jest.clearAllMocks();
    });

    it("Debería crear un nuevo incidente y disparar el análisis de IA por evento", async () => {
      mockedProcessInsight.mockResolvedValue(undefined);

      const incident = await openIncident(
        monitorId,
        "Servicio de Autenticación",
        "https://auth.miservicio.com/health",
        "Connection timeout at port 5432",
      );

      // Tiempo para el listener asíncrono del EventEmitter
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(incident).toBeDefined();
      expect(incident.status).toBe("OPEN");
      expect(incident.monitorId).toBe(monitorId);

      expect(mockedProcessInsight).toHaveBeenCalledTimes(1);
      expect(mockedProcessInsight).toHaveBeenCalledWith({
        incidentId: incident.id,
        monitorId,
        name: "Servicio de Autenticación",
        url: "https://auth.miservicio.com/health",
        errorDetails: "Connection timeout at port 5432",
        historicalContext: null,
      });

      const updatedIncident = await prisma.incident.findUnique({
        where: { id: incident.id },
      });

      expect(updatedIncident).not.toBeNull();
      expect(updatedIncident?.status).toBe("OPEN");
      expect(updatedIncident?.errorDetails).toBe("Connection timeout at port 5432");
    });

    it("Debería retornar el incidente existente sin duplicar ni reemitir si ya está OPEN", async () => {
      const firstIncident = await openIncident(
        monitorId,
        "Servicio de Autenticación",
        "https://auth.miservicio.com/health",
        "Timeout 1",
      );

      // Tiempo para que el listener asíncrono del EventEmitter termine
      await new Promise((resolve) => setTimeout(resolve, 150));

      jest.clearAllMocks();

      const secondIncident = await openIncident(
        monitorId,
        "Servicio de Autenticación",
        "https://auth.miservicio.com/health",
        "Timeout 2",
      );

      expect(secondIncident.id).toBe(firstIncident.id);
      expect(mockedProcessInsight).not.toHaveBeenCalled();

      const totalOpen = await prisma.incident.count({
        where: { monitorId, status: "OPEN" },
      });
      expect(totalOpen).toBe(1);
    });
  });

  // --- BLOQUE 2: ENDPOINT REST GET /api/v1/incidents/active ---
  describe("GET /api/v1/incidents/active", () => {
    beforeEach(async () => {
      await prisma.incident.deleteMany();
      await prisma.incident.create({
        data: {
          monitorId: monitorId,
          status: "OPEN",
          startedAt: new Date(),
        },
      });
    });

    it("Debería retornar únicamente los incidentes activos (HTTP 200)", async () => {
      const response = await request(app)
        .get("/api/v1/incidents/active")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe("OPEN");
    });

    it("Debería rechazar la petición con HTTP 401 si no hay token de autorización", async () => {
      const response = await request(app).get("/api/v1/incidents/active");

      expect(response.status).toBe(401);
    });
  });

  // --- BLOQUE 3: ENDPOINT REST GET /api/v1/incidents/monitor/:monitorId/resolved ---
  describe("GET /api/v1/incidents/monitor/:monitorId/resolved", () => {
    beforeEach(async () => {
      await prisma.incident.deleteMany();

      const started = new Date(Date.now() - 10 * 60 * 1000);
      const resolve = new Date();

      await prisma.incident.create({
        data: {
          monitorId: monitorId,
          status: "RESOLVED",
          startedAt: started,
          resolvedAt: resolve,
          downtime: 10,
        },
      });
    });

    it("Debería retornar los incidentes resueltos del monitor especificado (HTTP 200)", async () => {
      const response = await request(app)
        .get(`/api/v1/incidents/monitor/${monitorId}/resolved`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe("RESOLVED");
      expect(response.body.data[0].downtime).toBe(10);
    });
  });

  // --- BLOQUE 4: TRANSICIÓN OPEN -> RESOLVED (resolvedIncident) ---
  describe("resolvedIncident - Transición de estado", () => {
    let incidentId: number;

    beforeEach(async () => {
      await prisma.incident.deleteMany();
      const created = await prisma.incident.create({
        data: {
          monitorId: monitorId,
          status: "OPEN",
          startedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 min de downtime
        },
      });
      incidentId = created.id;
    });

    it("Debería cambiar el estado a RESOLVED, establecer resolvedAt y calcular downtime", async () => {
      const resolved = await resolvedIncident(monitorId);

      expect(resolved.status).toBe("RESOLVED");
      expect(resolved.resolvedAt).not.toBeNull();
      expect(resolved.downtime).not.toBeNull();
      expect(resolved.downtime!).toBeGreaterThan(0);
    });

    it("Debería lanzar error si no hay incidente OPEN para el monitor", async () => {
      await prisma.incident.deleteMany();
      await expect(resolvedIncident(monitorId)).rejects.toThrow();
    });
  });
});