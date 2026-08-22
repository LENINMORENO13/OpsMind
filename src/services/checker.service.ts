import axios, { isAxiosError } from "axios";

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
    const response = await axios.get(url, { timeout: 5000 });
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
