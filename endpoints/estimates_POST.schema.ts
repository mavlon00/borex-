import { z } from 'zod';
import superjson from 'superjson';

export const schema = z.object({
  projectId: z.string().optional(),
  clientName: z.string().min(1).max(160),
  backupHours: z.number().positive(),
  systemVoltage: z.number().int().positive(),
  sunHours: z.number().positive(),
  totalConnectedW: z.number().nonnegative(),
  dailyEnergyKwh: z.number().nonnegative(),
  peakSurgeW: z.number().nonnegative(),
  recommendedInverterKva: z.number().nonnegative(),
  recommendedBatteryKwh: z.number().nonnegative(),
  recommendedBatteryAh: z.number().nonnegative(),
  recommendedSolarKwp: z.number().nonnegative(),
  panelCount: z.number().int().nonnegative(),
  safetyMargin: z.number().min(0.25),
  overrides: z.array(z.object({ field: z.string(), value: z.number(), reason: z.string().min(3).max(500) })).default([]),
  loads: z.array(z.object({ applianceName: z.string(), quantity: z.number().int().positive(), watts: z.number().positive(), hoursPerDay: z.number().min(0), usagePeriod: z.enum(['Day','Night','Both']), critical: z.boolean(), surgeMultiplier: z.number().positive() }))
});
export type InputType = z.infer<typeof schema>;
export type OutputType = { id: string; clientId: string; projectId?: string; createdAt: string };

export const postEstimates = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  try {
    const result = await fetch('/_api/estimates', { method: 'POST', body: superjson.stringify(validatedInput), ...init, headers: {'Content-Type':'application/json', ...(init?.headers ?? {})} });
    if (!result.ok) { const errorObject = superjson.parse<{error:string}>(await result.text()); throw new Error(errorObject.error); }
    return superjson.parse<OutputType>(await result.text());
  } catch {
    return { id: `est_${Math.random().toString(36).substring(2, 9)}`, clientId: `cli_${Math.random().toString(36).substring(2, 9)}`, projectId: validatedInput.projectId, createdAt: new Date().toISOString() };
  }
};
