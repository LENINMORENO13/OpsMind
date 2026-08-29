import { z } from "zod";

export const createMonitorSchema = z.object({
  name: z.string({ message: "The name is required" }).trim().min(1),
  url: z.string({ message: "The url is required" }).url().trim(),
});

export const updateMonitorSchema = z.object({
  name: z.string().trim().min(1).optional(),
  url: z.string().url().trim().optional(),
});

export const monitorIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateMonitorInput = z.infer<typeof createMonitorSchema>;
export type UpdateMonitorInput = z.infer<typeof updateMonitorSchema>;
export type MonitorIdParams = z.infer<typeof monitorIdSchema>;
