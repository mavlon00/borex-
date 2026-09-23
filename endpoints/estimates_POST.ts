import superjson from 'superjson';
import { nanoid } from 'nanoid';
import { db } from '../helpers/db';
import { schema } from './estimates_POST.schema';

export async function handle(request: Request) {
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    const clientId = nanoid();
    const estimateId = nanoid();
    const now = new Date();
    const { resolvedClientId } = await db.transaction().execute(async trx => {
      const existing = await trx.selectFrom('clients').select('id').where('displayName', '=', input.clientName).executeTakeFirst();
      const resolvedClientId = existing?.id ?? clientId;
      if (!existing) await (trx.insertInto('clients') as any).values({ id: clientId, displayName: input.clientName, createdAt: now }).execute();
      await (trx.insertInto('estimates') as any).values({ id: estimateId, clientId: resolvedClientId, projectId: input.projectId ?? null, backupHours: input.backupHours, systemVoltage: input.systemVoltage, sunHours: input.sunHours, safetyMargin: input.safetyMargin, totalConnectedW: input.totalConnectedW, dailyEnergyKwh: input.dailyEnergyKwh, peakSurgeW: input.peakSurgeW, recommendedInverterKva: input.recommendedInverterKva, recommendedBatteryKwh: input.recommendedBatteryKwh, recommendedBatteryAh: input.recommendedBatteryAh, recommendedSolarKwp: input.recommendedSolarKwp, panelCount: input.panelCount, overrides: input.overrides, createdAt: now }).execute();
      if (input.loads.length) await (trx.insertInto('estimateLoads') as any).values(input.loads.map(load => ({
        id: nanoid(),
        estimateId,
        applianceName: load.applianceName,
        watts: load.watts,
        quantity: load.quantity,
        hoursPerDay: load.hoursPerDay,
        usagePeriod: load.usagePeriod,
        critical: load.critical,
        surgeMultiplier: load.surgeMultiplier
      }))).execute();
      return { resolvedClientId };
    });
    return new Response(superjson.stringify({ id: estimateId, clientId: resolvedClientId, projectId: input.projectId, createdAt: now.toISOString() }));
  } catch (error) {
    return new Response(superjson.stringify({ error: error instanceof Error ? error.message : 'Unable to save estimate' }), { status: 400 });
  }
}
