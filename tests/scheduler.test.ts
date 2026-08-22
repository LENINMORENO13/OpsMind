import prisma from "../src/lib/prisma.js";
import { executeMonitorCheck } from "../src/services/history.service.js";
import { startCronJobs } from "../src/services/scheduler.service.js";

// Variable global para capturar la función que node-cron ejecutará internamente
let mockSavedCallback: () => Promise<void>;

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

jest.mock("../src/services/history.service.js", () => ({
  executeMonitorCheck: jest.fn(),
}));

const mockedFindMany = prisma.monitor.findMany as jest.Mock
const mockedExecuteMonitorCheck = executeMonitorCheck as jest.Mock

// --- TEST SUITE ---
describe("Servicio de Cron / Scheduler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Debería ejecutar con éxito el chequeo para todos los monitores activos (Camino Feliz)", async () => {
    // 1. ARRANGE: Simulamos que la base de datos retorna dos monitores activos
    mockedFindMany.mockResolvedValue([
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
    mockedFindMany.mockResolvedValue([
      { id: 1, name: "App 1" },
      { id: 2, name: "App 2" },
    ]);

    mockedExecuteMonitorCheck
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
    mockedFindMany.mockRejectedValue(
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
