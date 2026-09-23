import prisma from "../src/lib/prisma.js";
import request from "supertest";
import app from "../src/app.js";
import { processIncidentInsight } from "../src/services/ai.service.js";
import {
  openIncident,
  resolvedIncident,
  resolveIncidentWithLog,
  IncidentNotFoundError,
  ResolutionAlreadyRecordedError,
} from "../src/services/incident.service.js";

let token: string;
let monitorId: number;
let userId: number;

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

    const authenticatedUser = await prisma.user.findUnique({
      where: { email: "incident-user@email.com" },
    });
    userId = authenticatedUser!.id;

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

    it("Debería garantizar un único incidente OPEN ante llamadas concurrentes", async () => {
      mockedProcessInsight.mockResolvedValue(undefined);

      const [first, second] = await Promise.all([
        openIncident(
          monitorId,
          "Servicio de Autenticación",
          "https://auth.miservicio.com/health",
          "Concurrente 1",
        ),
        openIncident(
          monitorId,
          "Servicio de Autenticación",
          "https://auth.miservicio.com/health",
          "Concurrente 2",
        ),
      ]);

      expect(first.id).toBe(second.id);

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

      expect(resolved).not.toBeNull();
      expect(resolved!.status).toBe("RESOLVED");
      expect(resolved!.resolvedAt).not.toBeNull();
      expect(resolved!.downtime).not.toBeNull();
      expect(resolved!.downtime!).toBeGreaterThan(0);
    });

    it("Debería retornar null sin lanzar si no hay incidente OPEN para el monitor", async () => {
      await prisma.incident.deleteMany();
      await expect(resolvedIncident(monitorId)).resolves.toBeNull();
    });
  });

  // --- BLOQUE 5: SERVICIO resolveIncidentWithLog (registro de solución + cierre) ---
  describe("resolveIncidentWithLog - Registro de solución humana y cierre", () => {
    let incidentId: number;

    beforeEach(async () => {
      await prisma.incident.deleteMany();
      const created = await prisma.incident.create({
        data: {
          monitorId: monitorId,
          status: "OPEN",
          startedAt: new Date(Date.now() - 15 * 60 * 1000),
        },
      });
      incidentId = created.id;
    });

    it("Debería cerrar el incidente y crear el ResolutionLog si el monitor está sano (lastStatus UP)", async () => {
      await prisma.monitor.update({
        where: { id: monitorId },
        data: { lastStatus: "UP" },
      });

      const result = await resolveIncidentWithLog(
        incidentId,
        userId,
        "Fallo en la base de datos",
        "Reiniciar el servicio de PostgreSQL",
      );

      expect(result.closedNow).toBe(true);
      expect(result.incident.status).toBe("RESOLVED");
      expect(result.resolutionLog.rootCause).toBe("Fallo en la base de datos");
      expect(result.resolutionLog.actionTaken).toBe(
        "Reiniciar el servicio de PostgreSQL",
      );
      expect(result.resolutionLog.userId).toBe(userId);
      expect(result.resolutionLog.incidentId).toBe(incidentId);
    });

    it("Debería guardar el log pero dejar el incidente OPEN si el monitor sigue caído (lastStatus DOWN)", async () => {
      await prisma.monitor.update({
        where: { id: monitorId },
        data: { lastStatus: "DOWN" },
      });

      const result = await resolveIncidentWithLog(
        incidentId,
        userId,
        "Deploy fallido",
        "Rollback pendiente de aplicar",
      );

      expect(result.closedNow).toBe(false);
      expect(result.incident.status).toBe("OPEN");

      const updatedIncident = await prisma.incident.findUnique({
        where: { id: incidentId },
      });
      expect(updatedIncident?.status).toBe("OPEN");
      expect(updatedIncident?.resolvedAt).toBeNull();

      const log = await prisma.resolutionLog.findUnique({
        where: { incidentId },
      });
      expect(log?.rootCause).toBe("Deploy fallido");
    });

    it("Debería registrar el log post-mortem aunque el incidente ya se haya recuperado solo (RESOLVED)", async () => {
      await prisma.incident.update({
        where: { id: incidentId },
        data: { status: "RESOLVED", resolvedAt: new Date(), downtime: 10 },
      });

      const result = await resolveIncidentWithLog(
        incidentId,
        userId,
        "Carga inesperada",
        "Escalar el balanceador",
      );

      expect(result.closedNow).toBe(false);
      expect(result.incident.status).toBe("RESOLVED");
      expect(result.resolutionLog.actionTaken).toBe("Escalar el balanceador");
    });

    it("Debería lanzar ResolutionAlreadyRecordedError si el incidente ya tiene una solución registrada", async () => {
      await prisma.monitor.update({
        where: { id: monitorId },
        data: { lastStatus: "DOWN" },
      });
      await resolveIncidentWithLog(incidentId, userId, "Causa A", "Acción A");

      await expect(
        resolveIncidentWithLog(incidentId, userId, "Causa B", "Acción B"),
      ).rejects.toBeInstanceOf(ResolutionAlreadyRecordedError);
    });

    it("Debería lanzar IncidentNotFoundError si el incidente no existe", async () => {
      await expect(
        resolveIncidentWithLog(99999, userId, "Causa", "Acción"),
      ).rejects.toBeInstanceOf(IncidentNotFoundError);
    });
  });

  // --- BLOQUE 6: ENDPOINT REST POST /api/v1/incidents/:id/resolve ---
  describe("POST /api/v1/incidents/:id/resolve", () => {
    let incidentId: number;

    beforeEach(async () => {
      await prisma.incident.deleteMany();
      const created = await prisma.incident.create({
        data: {
          monitorId: monitorId,
          status: "OPEN",
          startedAt: new Date(Date.now() - 10 * 60 * 1000),
        },
      });
      incidentId = created.id;
    });

    it("Debería cerrar el incidente y registrar la solución si el monitor está sano (HTTP 200)", async () => {
      await prisma.monitor.update({
        where: { id: monitorId },
        data: { lastStatus: "UP" },
      });

      const response = await request(app)
        .post(`/api/v1/incidents/${incidentId}/resolve`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          rootCause: "Deploy fallido",
          actionTaken: "Rollback de la versión",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Incident resolved successfully");
      expect(response.body.data.closedNow).toBe(true);

      const updatedIncident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: { resolutionLog: true },
      });
      expect(updatedIncident?.status).toBe("RESOLVED");
      expect(updatedIncident?.resolutionLog?.rootCause).toBe("Deploy fallido");
      expect(updatedIncident?.resolutionLog?.actionTaken).toBe(
        "Rollback de la versión",
      );
      expect(updatedIncident?.resolutionLog?.userId).toBe(userId);
    });

    it("Debería guardar la solución pero dejar el incidente OPEN si el monitor sigue caído (HTTP 200)", async () => {
      await prisma.monitor.update({
        where: { id: monitorId },
        data: { lastStatus: "DOWN" },
      });

      const response = await request(app)
        .post(`/api/v1/incidents/${incidentId}/resolve`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          rootCause: "Deploy fallido",
          actionTaken: "Rollback pendiente de aplicar",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "Resolution recorded. Incident will close once the service recovers.",
      );
      expect(response.body.data.closedNow).toBe(false);

      const updatedIncident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: { resolutionLog: true },
      });
      expect(updatedIncident?.status).toBe("OPEN");
      expect(updatedIncident?.resolutionLog?.actionTaken).toBe(
        "Rollback pendiente de aplicar",
      );
    });

    it("Debería registrar la solución post-mortem si el incidente ya se recuperó solo (HTTP 200)", async () => {
      await prisma.incident.update({
        where: { id: incidentId },
        data: { status: "RESOLVED", resolvedAt: new Date(), downtime: 10 },
      });

      const response = await request(app)
        .post(`/api/v1/incidents/${incidentId}/resolve`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          rootCause: "Carga inesperada",
          actionTaken: "Escalar el balanceador",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        "Resolution recorded. Incident was already resolved (recovered before logging).",
      );
      const log = await prisma.resolutionLog.findUnique({
        where: { incidentId },
      });
      expect(log?.rootCause).toBe("Carga inesperada");
    });

    it("Debería rechazar con HTTP 409 si ya existe una solución registrada", async () => {
      await prisma.monitor.update({
        where: { id: monitorId },
        data: { lastStatus: "DOWN" },
      });

      await request(app)
        .post(`/api/v1/incidents/${incidentId}/resolve`)
        .set("Authorization", `Bearer ${token}`)
        .send({ rootCause: "Causa", actionTaken: "Acción" });

      const response = await request(app)
        .post(`/api/v1/incidents/${incidentId}/resolve`)
        .set("Authorization", `Bearer ${token}`)
        .send({ rootCause: "Causa 2", actionTaken: "Acción 2" });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it("Debería rechazar con HTTP 400 si falta rootCause o actionTaken", async () => {
      const response = await request(app)
        .post(`/api/v1/incidents/${incidentId}/resolve`)
        .set("Authorization", `Bearer ${token}`)
        .send({ rootCause: "Causa sin acción" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("Debería rechazar con HTTP 401 si no hay token de autorización", async () => {
      const response = await request(app)
        .post(`/api/v1/incidents/${incidentId}/resolve`)
        .send({
          rootCause: "Causa",
          actionTaken: "Acción",
        });

      expect(response.status).toBe(401);
    });

    it("Debería devolver HTTP 404 si el incidente no existe", async () => {
      const response = await request(app)
        .post("/api/v1/incidents/99999/resolve")
        .set("Authorization", `Bearer ${token}`)
        .send({
          rootCause: "Causa",
          actionTaken: "Acción",
        });

      expect(response.status).toBe(404);
    });
  });
});