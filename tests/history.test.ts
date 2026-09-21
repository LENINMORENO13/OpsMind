import prisma from "../src/lib/prisma.js";
import { executeMonitorCheck } from "../src/services/history.service.js";
import { check } from "../src/services/checker.service.js";
import { analyzeStatus } from "../src/services/analyzer.service.js";
import {
  openIncident,
  resolvedIncident,
} from "../src/services/incident.service.js";

jest.mock("../src/lib/prisma", () => ({
  log: { findFirst: jest.fn(), create: jest.fn() },
  monitor: { update: jest.fn() },
}));

jest.mock("../src/services/checker.service.js", () => ({ check: jest.fn() }));

jest.mock("../src/services/analyzer.service.js", () => ({
  analyzeStatus: jest.fn(),
}));

jest.mock("../src/services/incident.service.js", () => ({
  openIncident: jest.fn(),
  resolvedIncident: jest.fn(),
}));

const mockedPrisma = prisma as unknown as {
  log: { findFirst: jest.Mock; create: jest.Mock };
  monitor: { update: jest.Mock };
};
const mockedCheck = check as jest.Mock;
const mockedAnalyze = analyzeStatus as jest.Mock;
const mockedOpenIncident = openIncident as jest.Mock;
const mockedResolvedIncident = resolvedIncident as jest.Mock;

const monitor = {
  id: 1,
  name: "App",
  url: "https://app.example.com",
  isActive: true,
  checkInterval: 300,
  lastStatus: "PENDING",
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

const baseAnalysis = {
  url: monitor.url,
  status: 200,
  message: "OK",
  details: "ok",
  trend: "STABLE",
  responseTime: 100,
  state: "UP",
  error: null,
};

describe("executeMonitorCheck - estado del monitor y resiliencia", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.log.findFirst.mockResolvedValue(null);
    mockedPrisma.log.create.mockResolvedValue({ id: 10, state: "UP" });
    mockedPrisma.monitor.update.mockResolvedValue({});
    mockedCheck.mockResolvedValue({
      url: monitor.url,
      online: true,
      status: 200,
      responseTime: 100,
      error: null,
    });
    mockedAnalyze.mockReturnValue(baseAnalysis);
  });

  it("Debería actualizar monitor.lastStatus con el último estado observado", async () => {
    await executeMonitorCheck(monitor);

    expect(mockedPrisma.monitor.update).toHaveBeenCalledWith({
      where: { id: monitor.id },
      data: { lastStatus: "UP" },
    });
  });

  it("Debería marcar DOWN en lastStatus y abrir incidente ante una caída", async () => {
    mockedAnalyze.mockReturnValue({
      ...baseAnalysis,
      trend: "DROP_DETECTED",
      state: "DOWN",
    });

    await executeMonitorCheck(monitor);

    expect(mockedOpenIncident).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.monitor.update).toHaveBeenCalledWith({
      where: { id: monitor.id },
      data: { lastStatus: "DOWN" },
    });
  });

  it("No debería romper el flujo cuando hay recuperación sin incidente OPEN", async () => {
    mockedAnalyze.mockReturnValue({
      ...baseAnalysis,
      trend: "RECOVERED",
      state: "UP",
    });
    mockedResolvedIncident.mockResolvedValue(null);

    await expect(executeMonitorCheck(monitor)).resolves.toBeDefined();
    expect(mockedResolvedIncident).toHaveBeenCalledWith(monitor.id);
  });
});
