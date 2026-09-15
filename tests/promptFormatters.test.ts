import { formatHistoricalIncidents } from "../src/utils/prompt-formatters.util.js";

describe("formatHistoricalIncidents - Formateo de contexto histórico", () => {
  const baseIncident = {
    id: 15,
    errorDetails: "getaddrinfo ENOTFOUND auth.miservicio.com",
    downtime: 2,
    aiInsight: {
      analysis: "El DNS no resolvió el host del servicio.",
      suggestion: "Revisar la configuración del registro DNS.",
    },
  };

  it("Debería incluir el id del incidente en cada elemento formateado", () => {
    const result = formatHistoricalIncidents([baseIncident]);

    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ id: 15 });
  });

  it("Debería aplanar aiInsight dejando analysis y suggestion al mismo nivel", () => {
    const result = formatHistoricalIncidents([baseIncident]);

    const parsed = JSON.parse(result!);
    expect(parsed[0]).toMatchObject({
      ai_analysis: "El DNS no resolvió el host del servicio.",
      ai_suggestion: "Revisar la configuración del registro DNS.",
    });
    expect(parsed[0]).not.toHaveProperty("aiInsight");
  });

  it("Debería renombrar las propiedades con nombres descriptivos", () => {
    const result = formatHistoricalIncidents([
      { ...baseIncident, downtime: 7 },
    ]);

    const parsed = JSON.parse(result!);
    expect(parsed[0]).toMatchObject({
      error_description: "getaddrinfo ENOTFOUND auth.miservicio.com",
      downtime_minutes: 7,
    });
  });

  it("Debería truncar errorDetails a 500 caracteres agregando ... si excede el límite", () => {
    const longError = "x".repeat(600);
    const result = formatHistoricalIncidents([
      { ...baseIncident, errorDetails: longError },
    ]);

    const parsed = JSON.parse(result!);
    expect(parsed[0].error_description).toHaveLength(500);
    expect(parsed[0].error_description.endsWith("...")).toBe(true);
  });

  it("Debería no truncar errorDetails si no excede los 500 caracteres", () => {
    const shortError = "Error corto";
    const result = formatHistoricalIncidents([
      { ...baseIncident, errorDetails: shortError },
    ]);

    const parsed = JSON.parse(result!);
    expect(parsed[0].error_description).toBe("Error corto");
  });

  it("Debería usar mensajes descriptivos cuando no hay aiInsight en lugar de null", () => {
    const result = formatHistoricalIncidents([
      { ...baseIncident, aiInsight: null },
    ]);

    const parsed = JSON.parse(result!);
    expect(parsed[0].ai_analysis).toBe(
      "No se generó análisis de IA para este incidente.",
    );
    expect(parsed[0].ai_suggestion).toBe(
      "Sin recomendación técnica disponible.",
    );
  });

  it("Debería retornar null cuando no existen incidentes históricos", () => {
    const result = formatHistoricalIncidents([]);

    expect(result).toBeNull();
  });
});