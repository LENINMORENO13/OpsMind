import { analyzeIncident } from "../src/services/ai.service.js";

// Evita esperas reales entre reintentos durante las pruebas
process.env.GEMINI_RETRY_DELAY_MS = "0";

// Variable global para controlar las respuestas simuladas del modelo de IA
const mockGenerateContent = jest.fn();

// --- JEST MOCKS (Simulación del SDK de Google GenAI) ---
jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
  Type: {
    OBJECT: "OBJECT",
    STRING: "STRING",
  },
}));

// --- TEST SUITE ---
describe("Servicio de IA - analyzeIncident", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Debería retornar el JSON estructurado sin llamar a la API real de internet", async () => {
    // 1. ARRANGE: Simulamos una respuesta perfecta en formato JSON del LLM
    const mockFakeResponse = {
      text: JSON.stringify({
        causa_probable: "El servidor de base de datos no acepta conexiones.",
        accion_recomendada: "Reiniciar el contenedor de PostgreSQL.",
      }),
    };
    mockGenerateContent.mockResolvedValue(mockFakeResponse);

    // 2. ACT
    const response = await analyzeIncident(
      "Mi Base de Datos",
      "localhost:5432",
      "Connection refused",
    );

    // 3. ASSERT: Validamos que el JSON se haya parseado correctamente en un objeto
    expect(response.causa_probable).toBe(
      "El servidor de base de datos no acepta conexiones.",
    );
    expect(response.accion_recomendada).toBe(
      "Reiniciar el contenedor de PostgreSQL.",
    );

    // Verificamos que se interceptó la llamada y se inyectaron las variables clave
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.stringContaining("Mi Base de Datos"),
      })
    );
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.stringContaining("Connection refused"),
      })
    );
  });

  it("Debería manejar un error de la API y devolver el diagnóstico por defecto (Fallback)", async () => {
    // 1. ARRANGE: Forzamos un colapso en los servidores de la API de IA
    mockGenerateContent.mockRejectedValue(
      new Error("500 Internal server error - AI is unavailable"),
    );

    // 2. ACT
    const response = await analyzeIncident(
      "Servicio de Pagos",
      "https://api.pagos.com",
      "Timeout exception",
    );

    // 3. ASSERT: Comprobamos que el sistema devuelva el mensaje controlado de error
    expect(response.causa_probable).toBe("Análisis de IA no disponible temporalmente.");
    expect(response.accion_recomendada || response.accion_recomendada).toBe("Revisar los logs del contenedor manualmente.");
  });

  it("Debería manejar un error de parseo si la IA devuelve un JSON inválido", async () => {
    // 1. ARRANGE: El modelo responde con éxito, pero devuelve texto plano inválido en lugar de un JSON
    const mockBadResponse = {
      text: "Esto definitivamente no es un JSON válido, hola mundo",
    };
    mockGenerateContent.mockResolvedValue(mockBadResponse);

    // 2. ACT
    const response = await analyzeIncident(
      "Mi Base de Datos",
      "localhost:5432",
      "Connection refused",
    );

    // 3. ASSERT: El JSON.parse fallará internamente, activando la respuesta segura por defecto
    expect(response.causa_probable).toBe("Análisis de IA no disponible temporalmente.");
    expect(response.accion_recomendada || response.accion_recomendada).toBe("Revisar los logs del contenedor manualmente.");
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  // --- TESTS DE RESILIENCIA: Códigos de saturación (429/503/UNAVAILABLE/RESOURCE_EXHAUSTED) ---
  // Se usan retries=0 para evitar el delay de 10s y aislar la lógica de detección de retryables.

  it("Debería reconocer error 429 como retryable y devolver fallback sin reintentar (retries=0)", async () => {
    mockGenerateContent.mockRejectedValue(new Error("429 Resource exhausted"));

    const response = await analyzeIncident(
      "Servicio de Pagos",
      "https://api.pagos.com",
      "Timeout exception",
      0,
    );

    expect(response.causa_probable).toBe("Análisis de IA no disponible temporalmente.");
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it("Debería reconocer error 503 como retryable y devolver fallback sin reintentar (retries=0)", async () => {
    mockGenerateContent.mockRejectedValue(new Error("503 Service Unavailable"));

    const response = await analyzeIncident(
      "Servicio de Pagos",
      "https://api.pagos.com",
      "Timeout exception",
      0,
    );

    expect(response.causa_probable).toBe("Análisis de IA no disponible temporalmente.");
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it("Debería reconocer error UNAVAILABLE como retryable y devolver fallback sin reintentar (retries=0)", async () => {
    mockGenerateContent.mockRejectedValue(new Error("UNAVAILABLE: backend connection lost"));

    const response = await analyzeIncident(
      "Servicio de Pagos",
      "https://api.pagos.com",
      "Timeout exception",
      0,
    );

    expect(response.causa_probable).toBe("Análisis de IA no disponible temporalmente.");
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it("Debería reconocer error RESOURCE_EXHAUSTED como retryable y devolver fallback sin reintentar (retries=0)", async () => {
    mockGenerateContent.mockRejectedValue(new Error("RESOURCE_EXHAUSTED: quota exceeded"));

    const response = await analyzeIncident(
      "Servicio de Pagos",
      "https://api.pagos.com",
      "Timeout exception",
      0,
    );

    expect(response.causa_probable).toBe("Análisis de IA no disponible temporalmente.");
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it("Debería reintentar cuando el error expone status 503 en un objeto", async () => {
    mockGenerateContent.mockRejectedValue(
      Object.assign(new Error("boom"), { status: 503 }),
    );

    const response = await analyzeIncident(
      "Servicio de Pagos",
      "https://api.pagos.com",
      "Timeout exception",
      1,
    );

    expect(response.causa_probable).toBe("Análisis de IA no disponible temporalmente.");
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it("Debería reintentar cuando el error expone code UNAVAILABLE", async () => {
    mockGenerateContent.mockRejectedValue(
      Object.assign(new Error("backend down"), { code: "UNAVAILABLE" }),
    );

    const response = await analyzeIncident(
      "Servicio de Pagos",
      "https://api.pagos.com",
      "Timeout exception",
      1,
    );

    expect(response.causa_probable).toBe("Análisis de IA no disponible temporalmente.");
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it("No debería reintentar ante un error no retryable (400 INVALID_ARGUMENT)", async () => {
    mockGenerateContent.mockRejectedValue(
      Object.assign(new Error("Bad request"), {
        status: 400,
        code: "INVALID_ARGUMENT",
      }),
    );

    await analyzeIncident(
      "Servicio de Pagos",
      "https://api.pagos.com",
      "Timeout exception",
      3,
    );

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it("Debería incluir el contexto histórico formateado en el prompt cuando se recibe historicalContext", async () => {
    // 1. ARRANGE
    const mockFakeResponse = {
      text: JSON.stringify({
        causa_probable: "El DNS no resolvió el host.",
        accion_recomendada: "Revisar el registro DNS.",
      }),
    };
    mockGenerateContent.mockResolvedValue(mockFakeResponse);

    // 2. ACT
    await analyzeIncident(
      "Servicio de Autenticación",
      "https://auth.miservicio.com/health",
      "getaddrinfo ENOTFOUND",
      0,
      '[{"id": 15, "error_description": "getaddrinfo ENOTFOUND", "ai_analysis": "Causa recurrente", "ai_suggestion": "Revisar DNS"}]',
    );

    // 3. ASSERT: El JSON con el id del histórico debe llegar al contenido del prompt
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.stringContaining("15"),
      })
    );
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.stringContaining("ai_analysis"),
      })
    );
  });

  it("Debería indicar que no existen incidentes históricos cuando historicalContext es null", async () => {
    // 1. ARRANGE
    const mockFakeResponse = {
      text: JSON.stringify({
        causa_probable: "Causa de prueba.",
        accion_recomendada: "Acción de prueba.",
      }),
    };
    mockGenerateContent.mockResolvedValue(mockFakeResponse);

    // 2. ACT
    await analyzeIncident(
      "Servicio de Autenticación",
      "https://auth.miservicio.com/health",
      "getaddrinfo ENOTFOUND",
      0,
      undefined,
    );

    // 3. ASSERT: El prompt debe comunicar que no hay historial de referencia
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.stringContaining("No existen incidentes históricos"),
      })
    );
  });
});