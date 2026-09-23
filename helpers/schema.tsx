import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Json = JsonValue;
export type JsonArray = JsonValue[];
export type JsonObject = { [x: string]: JsonValue | undefined };
export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonArray | JsonObject | JsonPrimitive;
export type Numeric = ColumnType<string, number | string, number | string>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface Projects {
  createdAt: Generated<Timestamp>;
  id: string;
  location?: string | null;
  name: string;
  phone?: string | null;
}

export interface Clients {
  createdAt: Generated<Timestamp>;
  displayName: string;
  id: string;
}

export interface EstimateLoads {
  applianceName: string;
  critical: Generated<boolean>;
  estimateId: string;
  hoursPerDay: Numeric;
  id: string;
  quantity: number;
  surgeMultiplier: Generated<Numeric>;
  usagePeriod: string;
  watts: Numeric;
}

export interface Estimates {
  backupHours: Numeric;
  clientId: string;
  createdAt: Generated<Timestamp>;
  dailyEnergyKwh: Numeric;
  id: string;
  overrides: Generated<Json>;
  panelCount: number;
  peakSurgeW: Numeric;
  projectId?: string | null;
  recommendedBatteryAh: Numeric;
  recommendedBatteryKwh: Numeric;
  recommendedInverterKva: Numeric;
  recommendedSolarKwp: Numeric;
  safetyMargin: Generated<Numeric>;
  sunHours: Numeric;
  systemVoltage: number;
  totalConnectedW: Numeric;
}

export interface DB {
  clients: Clients;
  estimateLoads: EstimateLoads;
  estimates: Estimates;
  projects: Projects;
}

export const kyselyIdentifierOverrides: Record<string, string> = {};
