import pino from "pino";

const isTest = process.env.NODE_ENV === "test";
const isProduction = process.env.NODE_ENV === "production";

const level = isTest ? "silent" : process.env.LOG_LEVEL?.trim() || "info";

/**
 * Logger estructurado de la aplicación.
 *
 * - test: sin transport (para no dejar hilos abiertos) y nivel `silent`.
 * - development: `pino-pretty` para salida legible en consola.
 * - production: JSON puro por stdout, que es lo que recolectan Render,
 *   Supabase y cualquier agregador de logs.
 */
export const logger = pino({
  level,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isTest || isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }),
});

export default logger;