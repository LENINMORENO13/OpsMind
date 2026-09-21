import axios from "axios";
import { check } from "../src/services/checker.service.js";
import { validatePublicHttpUrl } from "../src/utils/ssrf.util.js";

// Aísla la validación SSRF (que resuelve DNS real) del resto de la suite
jest.mock("../src/utils/ssrf.util.js", () => {
  const actual = jest.requireActual("../src/utils/ssrf.util.js");
  return {
    ...actual,
    validatePublicHttpUrl: jest.fn(),
  };
});

const mockedValidate = jest.mocked(validatePublicHttpUrl);

// Mantener las clases y métodos reales de Axios (como AxiosError e isAxiosError)
// y mockear únicamente el método .get()
jest.mock("axios", () => {
  const actualAxios = jest.requireActual("axios");
  return {
    __esModule: true,
    ...actualAxios,
    default: {
      ...actualAxios.default,
      get: jest.fn(),
    },
    get: jest.fn(),
  };
});

const mockedAxios = jest.mocked(axios);

describe("Servicio de Monitoreo - Checker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedValidate.mockResolvedValue({
      ok: true,
      hostname: "mi-sitio.com",
      address: "93.184.216.34",
      family: 4,
    });
  });

  it("Debería retornar online: true y status 200 cuando la URL responde correctamente", async () => {
    // 1. ARRANGE
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: "OK",
    });

    // 2. ACT
    const result = await check("https://mi-sitio.com");

    // 3. ASSERT
    expect(result.online).toBe(true);
    expect(result.status).toBe(200);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);

    // Validamos métricas de rendimiento (Tiempo de respuesta)
    expect(result).toHaveProperty("responseTime");
    expect(typeof result.responseTime).toBe("number");
  });

  it("Debería retornar online: false y marcar fallo si ocurre un error drástico de red", async () => {
    // 1. ARRANGE
    mockedAxios.get.mockRejectedValue(new Error("Network error"));

    // 2. ACT
    const result = await check("https://mi-sitio.com");

    // 3. ASSERT
    expect(result.online).toBe(false);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it("Debería retornar online: false y capturar el status code correcto ante un error HTTP (ej. 404)", async () => {
    // 1. ARRANGE: Instanciamos un AxiosError real para que pasen las validaciones de Axios
    const axiosError = new axios.AxiosError(
      "Request failed with status code 404",
      "ERR_BAD_REQUEST",
      undefined,
      {},
      {
        status: 404,
        statusText: "Not Found",
        data: {},
        headers: {},
        config: {} as any,
      }
    );

    mockedAxios.get.mockRejectedValue(axiosError);

    // 2. ACT
    const result = await check("https://mi-sitio.com");

    // 3. ASSERT
    expect(result.online).toBe(false);
    expect(result.status).toBe(404);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it("Debería rechazar una URL interna (SSRF) sin emitir la petición HTTP", async () => {
    // 1. ARRANGE: La validación SSRF rechaza el destino (p. ej. metadata/loopback)
    mockedValidate.mockResolvedValue({
      ok: false,
      reason: "URL resolves to a non-public address",
    });

    // 2. ACT
    const result = await check("http://169.254.169.254/latest/meta-data");

    // 3. ASSERT
    expect(result.online).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toBe("URL resolves to a non-public address");
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
});