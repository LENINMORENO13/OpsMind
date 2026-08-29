import { z } from "zod";

export const monitorIdSchema = z.object({
  monitorId: z.coerce.number().int().positive(),
});

export type MonitorIdParams = z.infer<typeof monitorIdSchema>;
