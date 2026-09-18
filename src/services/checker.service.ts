import axios, { isAxiosError } from "axios";
import {
  validatePublicHttpUrl,
  createPinnedAgentOptions,
} from "../utils/ssrf.util.js";

export interface CheckResult {
  url: string;
  online: boolean;
  status: number;
  responseTime: number;
  error: string | null;
}

export const check = async (url: string): Promise<CheckResult> => {
  const start = Date.now();
  try {
    // Bloquea SSRF antes de emitir la petición (protocolos, IPs internas y DNS)
    const validation = await validatePublicHttpUrl(url);
    if (!validation.ok) {
      return {
        url,
        online: false,
        status: 0,
        responseTime: Date.now() - start,
        error: validation.reason ?? "URL not allowed",
      };
    }

    const response = await axios.get(url, {
      timeout: 5000,
      ...createPinnedAgentOptions(validation.address!, validation.family!),
    });
    const responseTime = Date.now() - start;
    return {
      url: url,
      online: response.status >= 200 && response.status < 300,
      status: response.status,
      responseTime: responseTime,
      error: null,
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    if (isAxiosError(error)) {
      return {
        url: url,
        online: false,
        status: error.response ? error.response.status : 0,
        responseTime: responseTime,
        error: error.message,
      };
    }
    const err = error as Error;
    return {
      url,
      online: false,
      status: 0,
      responseTime,
      error: err.message,
    };
  }
};
