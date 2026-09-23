import { z } from "zod";

export const monitorIdSchema = z.object({
  monitorId: z.coerce.number().int().positive(),
});

export const incidentIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const resolveIncidentSchema = z.object({
  rootCause: z
    .string({ message: "rootCause is required" })
    .trim()
    .min(1, { message: "rootCause is required" }),
  actionTaken: z
    .string({ message: "actionTaken is required" })
    .trim()
    .min(1, { message: "actionTaken is required" }),
});

export type MonitorIdParams = z.infer<typeof monitorIdSchema>;
export type IncidentIdParams = z.infer<typeof incidentIdParamsSchema>;
export type ResolveIncidentInput = z.infer<typeof resolveIncidentSchema>;
