import { analyzeIncident } from "../src/services/ai.service.js";

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
});