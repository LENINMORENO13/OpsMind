import axios from "axios";
import { check } from "../src/services/checker";

// Simulamos por completo la librería Axios para evitar peticiones HTTP reales
jest.mock("axios");

describe("Servicio de Monitoreo - Checker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Debería retornar online: true y status 200 cuando la URL responde correctamente", async () => {
    // 1. ARRANGE
    axios.get.mockResolvedValue({
      status: 200,
    });

    // 2. ACT
    const result = await check("https://mi-sitio.com");

    // 3. ASSERT
    expect(result.online).toBe(true);
    expect(result.status).toBe(200);
    expect(axios.get).toHaveBeenCalledTimes(1);

    // Validamos métricas de rendimiento (Tiempo de respuesta)
    expect(result).toHaveProperty("responseTime");
    expect(typeof result.responseTime).toBe("number");
  });

  it("Debería retornar online: false y marcar fallo si ocurre un error drástico de red", async () => {
    // 1. ARRANGE: Simulamos un colapso total de conexión
    axios.get.mockRejectedValue(new Error("Network error"));

    // 2. ACT
    const result = await check("https://mi-sitio.com");

    // 3. ASSERT
    expect(result.online).toBe(false);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it("Debería retornar online: false y capturar el status code correcto ante un error HTTP (ej. 404)", async () => {
    // 1. ARRANGE: Mockeamos la estructura nativa de error que devuelve Axios
    const axiosError = {
      response: {
        status: 404,
      },
    };
    axios.get.mockRejectedValue(axiosError);

    // 2. ACT
    const result = await check("https://mi-sitio.com");

    // 3. ASSERT
    expect(result.online).toBe(false);
    expect(result.status).toBe(404);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});