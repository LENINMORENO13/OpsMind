import prisma from "../src/lib/prisma";
import { executeMonitorCheck } from "../src/services/historyService.js";
import { startCronJobs } from "../src/services/scheduler.js";

// Variable global para capturar la función que node-cron ejecutará internamente
let mockSavedCallback;

// --- JEST MOCKS ---
jest.mock("node-cron", () => ({
  schedule: jest.fn(async (expression, callback) => {
    mockSavedCallback = callback;
  }),
}));

jest.mock("../src/lib/prisma", () => ({
  monitor: {
    findMany: jest.fn(),
  },
}));

jest.mock("../src/services/historyService.js", () => ({
  executeMonitorCheck: jest.fn(),
}));

// --- TEST SUITE ---
describe("Servicio de Cron / Scheduler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Debería ejecutar con éxito el chequeo para todos los monitores activos (Camino Feliz)", async () => {
    // 1. ARRANGE: Simulamos que la base de datos retorna dos monitores activos
    prisma.monitor.findMany.mockResolvedValue([
      { id: 1, name: "App 1" },
      { id: 2, name: "App 2" },
    ]);

    // 2. ACT: Inicializamos el cron y disparamos manualmente el callback capturado
    startCronJobs();
    await mockSavedCallback();

    // 3. ASSERT: Verificamos que se consultó la DB y se ejecutaron ambos chequeos
    expect(prisma.monitor.findMany).toHaveBeenCalledTimes(1);
    expect(executeMonitorCheck).toHaveBeenCalledTimes(2);
  });

  it("Debería continuar evaluando el resto de monitores si uno de ellos falla", async () => {
    // 1. ARRANGE: Configuramos los monitores y forzamos a que el primero falle
    prisma.monitor.findMany.mockResolvedValue([
      { id: 1, name: "App 1" },
      { id: 2, name: "App 2" },
    ]);
    
    executeMonitorCheck
      .mockRejectedValueOnce(new Error("Error simulado de red"))
      .mockResolvedValueOnce(true);

    // 2. ACT: Ejecutamos el flujo del planificador
    startCronJobs();
    await mockSavedCallback();

    // 3. ASSERT: El fallo de un monitor no debe detener el bucle del scheduler
    expect(prisma.monitor.findMany).toHaveBeenCalledTimes(1);
    expect(executeMonitorCheck).toHaveBeenCalledTimes(2);
  });

  it("Debería manejar un error crítico si la base de datos falla al buscar los monitores", async () => {
    // 1. ARRANGE: Simulamos un colapso total en la conexión de PostgreSQL
    prisma.monitor.findMany.mockRejectedValue(
      new Error("Database connection lost"),
    );

    // 2. ACT: Intentamos arrancar el ciclo del cron
    startCronJobs();
    await mockSavedCallback();

    // 3. ASSERT: Se debió intentar la consulta, pero no se debió mandar a chequear ninguna URL
    expect(prisma.monitor.findMany).toHaveBeenCalledTimes(1);
    expect(executeMonitorCheck).not.toHaveBeenCalled();
  });
});