import request from "supertest";
import type { Express } from "express";

describe("Endurecimiento HTTP - cabeceras y rate limiting", () => {
  let app: Express;

  beforeAll(async () => {
    // Se fija un límite bajo solo durante la importación (el limiter lo lee al
    // construirse) y se restaura para no afectar a otras suites.
    const originalMax = process.env.AUTH_RATE_LIMIT_MAX;
    process.env.AUTH_RATE_LIMIT_MAX = "3";
    try {
      app = (await import("../src/app.js")).default;
    } finally {
      if (originalMax === undefined) {
        delete process.env.AUTH_RATE_LIMIT_MAX;
      } else {
        process.env.AUTH_RATE_LIMIT_MAX = originalMax;
      }
    }
  });

  it("Debería incluir las cabeceras de seguridad de helmet y ocultar x-powered-by", async () => {
    const response = await request(app).get("/api/v1/monitors");

    expect(response.status).toBe(401);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("Debería limitar los intentos de login devolviendo HTTP 429 al superar el máximo", async () => {
    const attempt = () =>
      request(app)
        .post("/api/v1/auth/login")
        .send({ email: "brute@email.com", password: "wrongpass" });

    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const response = await attempt();
      statuses.push(response.status);
    }

    expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
    expect(statuses[3]).toBe(429);
  });
});
