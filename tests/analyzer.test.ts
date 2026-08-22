import { analyzeStatus } from "../src/services/analyzer.service.js";
import { ServiceStatus } from "@prisma/client";

describe("Servicio Analizador de Estados", () => {
  it("Debería retornar STABLE y UP si todo está perfecto", () => {
    // 1. ARRANGE
    const currentCheck = {
      online: true,
      responseTime: 200,
      status: 200,
      url: "test.com",
      error: null,
    };
    const lastRecord = { state: ServiceStatus.UP};

    // 2. ACT
    const result = analyzeStatus(currentCheck, lastRecord);

    // 3. ASSERT
    expect(result.state).toBe("UP");
    expect(result.trend).toBe("STABLE");
  });

  it("Debería retornar DOWN y DROP_DETECTED si la página se cae de golpe", () => {
    // 1. ARRANGE
    const currentCheck = {
      online: false,
      responseTime: 0,
      status: 404,
      url: "test.com",
      error: null,
    };
    const lastRecord = { state: ServiceStatus.UP };

    // 2. ACT
    const result = analyzeStatus(currentCheck, lastRecord);

    // 3. ASSERT
    expect(result.state).toBe("DOWN");
    expect(result.trend).toBe("DROP_DETECTED");
  });

  it("Debería retornar DEGRADED si la página responde pero está muy lenta", () => {
    // 1. ARRANGE
    const currentCheck = {
      online: true,
      responseTime: 1600,
      status: 200,
      url: "test.com",
      error: null,
    };
    const lastRecord = { state: ServiceStatus.UP };

    // 2. ACT
    const result = analyzeStatus(currentCheck, lastRecord);

    // 3. ASSERT
    expect(result.state).toBe("DEGRADED");
    expect(result.trend).toBe("DROP_DETECTED");
  });

  it("Debería retornar RECOVERED si el monitor estaba DOWN y ahora responde bien", () => {
    // 1. ARRANGE
    const currentCheck = {
      online: true,
      responseTime: 200,
      status: 200,
      url: "test.com",
      error: null,
    };
    const lastRecord = { state: ServiceStatus.DOWN };

    // 2. ACT
    const result = analyzeStatus(currentCheck, lastRecord);

    // 3. ASSERT
    expect(result.state).toBe("UP");
    expect(result.trend).toBe("RECOVERED");
  });

  it("Debería retornar DOWN y la tendencia OFFLINE si el monitor ya estaba caído y sigue fallando", () => {
    // 1. ARRANGE
    const currentCheck = {
      online: false,
      responseTime: 0,
      status: 404,
      url: "test.com",
      error: null,
    };
    const lastRecord = { state: ServiceStatus.DOWN };

    // 2. ACT
    const result = analyzeStatus(currentCheck, lastRecord);

    // 3. ASSERT
    expect(result.state).toBe("DOWN");
    expect(result.trend).toBe("OFFLINE");
  });

  it("Debería manejar correctamente el caso donde no existe un registro anterior (Primer Chequeo)", () => {
    // 1. ARRANGE
    const currentCheck = {
      online: true,
      responseTime: 200,
      status: 200,
      url: "test.com",
      error: null,
    };
    const lastRecord = null;

    // 2. ACT
    const result = analyzeStatus(currentCheck, lastRecord);

    // 3. ASSERT
    expect(result.state).toBe("UP");
    expect(result.trend).toBe("STABLE");
  });

  it("Debería mantener el estado DEGRADED pero con tendencia STABLE si el monitor ya venía lento y continúa igual", () => {
    // 1. ARRANGE
    const currentCheck = {
      online: true,
      responseTime: 1600,
      status: 200,
      url: "test.com",
      error: null,
    };
    const lastRecord = { state: ServiceStatus.DEGRADED};

    // 2. ACT
    const result = analyzeStatus(currentCheck, lastRecord);

    // 3. ASSERT
    expect(result.state).toBe("DEGRADED");
    expect(result.trend).toBe("STABLE");
  });
});