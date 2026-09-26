import { z } from "zod";

export const windowEnum = z.enum(["24h", "7d", "30d", "90d"]);
export const bucketEnum = z.enum(["5m", "1h", "6h", "1d"]);

const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

export const monitorsOperationalQuerySchema = z.object({
  includeInactive: booleanFromString.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const incidentsOperationalQuerySchema = z.object({
  window: windowEnum.default("24h"),
  monitorId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const metricsQuerySchema = z.object({
  window: windowEnum.default("24h"),
  bucket: bucketEnum.default("1h"),
  monitorId: z.coerce.number().int().positive().optional(),
});

export const insightsRecentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type MonitorsOperationalQuery = z.infer<
  typeof monitorsOperationalQuerySchema
>;
export type IncidentsOperationalQuery = z.infer<
  typeof incidentsOperationalQuerySchema
>;
export type MetricsQuery = z.infer<typeof metricsQuerySchema>;
export type InsightsRecentQuery = z.infer<typeof insightsRecentQuerySchema>;
export type Window = z.infer<typeof windowEnum>;
export type Bucket = z.infer<typeof bucketEnum>;