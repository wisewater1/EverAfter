export interface GlucosePoint {
  ts: string;
  value: number;
  unit?: 'mg/dL' | 'mmol/L';
  trend?: string;
  quality?: string;
  raw?: any;
}

export interface LabResult {
  ts: string;
  loinc?: string;
  name: string;
  value: number;
  unit: string;
  raw?: any;
}

export interface MetabolicEvent {
  ts: string;
  type: 'meal' | 'insulin' | 'exercise' | 'illness' | 'note';
  carbs_g?: number;
  insulin_units?: number;
  intensity?: string;
  text?: string;
  raw?: any;
}

export interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
}

export interface GlucoseConnector {
  id: 'dexcom' | 'libre-agg' | 'terra' | 'manual' | 'fhir';
  friendlyName: string;
  category: 'cgm' | 'aggregator' | 'lab' | 'manual';
  description: string;
  oauth?: OAuthConfig;

  initAuth?(userId: string): Promise<{ url: string; state?: string }>;

  handleOAuthCallback?(code: string, state: string): Promise<{
    ok: boolean;
    userId?: string;
    externalUserId?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string;
  }>;

  handleWebhook?(headers: Headers, body: any): Promise<{
    ok: boolean;
    userId?: string;
    points?: GlucosePoint[];
    labs?: LabResult[];
    error?: string;
  }>;

  poll?(userId: string, accessToken: string, sinceISO?: string): Promise<{
    ok: boolean;
    points?: GlucosePoint[];
    labs?: LabResult[];
    error?: string;
  }>;

  parseManualUpload?(fileContent: string, fileType: 'csv' | 'json'): Promise<{
    ok: boolean;
    points?: GlucosePoint[];
    events?: MetabolicEvent[];
    error?: string;
  }>;
}

export function toMgDl(value: number, unit: 'mg/dL' | 'mmol/L' = 'mg/dL'): number {
  if (unit === 'mmol/L') {
    return Math.round(value * 18.0182 * 10) / 10;
  }
  return value;
}

export function toMmolL(value: number, unit: 'mg/dL' | 'mmol/L' = 'mg/dL'): number {
  if (unit === 'mg/dL') {
    return Math.round((value / 18.0182) * 10) / 10;
  }
  return value;
}

export interface TIRResult {
  tir_pct: number;
  below_pct: number;
  above_pct: number;
  total_readings: number;
}

export function computeTIR(
  readings: GlucosePoint[],
  lowThreshold: number = 70,
  highThreshold: number = 180
): TIRResult {
  if (readings.length === 0) {
    return {
      tir_pct: 0,
      below_pct: 0,
      above_pct: 0,
      total_readings: 0,
    };
  }

  let inRange = 0;
  let below = 0;
  let above = 0;

  for (const reading of readings) {
    const valueMgDl = toMgDl(reading.value, reading.unit || 'mg/dL');

    if (valueMgDl >= lowThreshold && valueMgDl <= highThreshold) {
      inRange++;
    } else if (valueMgDl < lowThreshold) {
      below++;
    } else {
      above++;
    }
  }

  const total = readings.length;

  return {
    tir_pct: Math.round((inRange / total) * 10000) / 100,
    below_pct: Math.round((below / total) * 10000) / 100,
    above_pct: Math.round((above / total) * 10000) / 100,
    total_readings: total,
  };
}

export interface GlucoseStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
}

export function computeGlucoseStats(readings: GlucosePoint[]): GlucoseStats {
  if (readings.length === 0) {
    return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, count: 0 };
  }

  const values = readings
    .map(r => toMgDl(r.value, r.unit || 'mg/dL'))
    .sort((a, b) => a - b);

  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / values.length;

  const median = values.length % 2 === 0
    ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
    : values[Math.floor(values.length / 2)];

  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean: Math.round(mean * 10) / 10,
    median: Math.round(median * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    min: values[0],
    max: values[values.length - 1],
    count: values.length,
  };
}

export function computeGMI(meanGlucose: number): number {
  return Math.round((3.31 + (0.02392 * meanGlucose)) * 10) / 10;
}

export function detectHypoEvents(
  readings: GlucosePoint[],
  threshold: number = 70,
  durationMinutes: number = 15
): Array<{ start: string; nadir: number; duration: number }> {
  const events: Array<{ start: string; nadir: number; duration: number }> = [];

  let eventStart: string | null = null;
  let eventNadir = Infinity;
  let consecutiveCount = 0;

  for (let i = 0; i < readings.length; i++) {
    const reading = readings[i];
    const valueMgDl = toMgDl(reading.value, reading.unit || 'mg/dL');

    if (valueMgDl < threshold) {
      if (eventStart === null) {
        eventStart = reading.ts;
        eventNadir = valueMgDl;
        consecutiveCount = 1;
      } else {
        consecutiveCount++;
        eventNadir = Math.min(eventNadir, valueMgDl);
      }
    } else {
      if (eventStart !== null && consecutiveCount * 5 >= durationMinutes) {
        events.push({
          start: eventStart,
          nadir: eventNadir,
          duration: consecutiveCount * 5,
        });
      }
      eventStart = null;
      eventNadir = Infinity;
      consecutiveCount = 0;
    }
  }

  if (eventStart !== null && consecutiveCount * 5 >= durationMinutes) {
    events.push({
      start: eventStart,
      nadir: eventNadir,
      duration: consecutiveCount * 5,
    });
  }

  return events;
}

export function detectHyperEvents(
  readings: GlucosePoint[],
  threshold: number = 180,
  durationMinutes: number = 60
): Array<{ start: string; peak: number; duration: number }> {
  const events: Array<{ start: string; peak: number; duration: number }> = [];

  let eventStart: string | null = null;
  let eventPeak = -Infinity;
  let consecutiveCount = 0;

  for (let i = 0; i < readings.length; i++) {
    const reading = readings[i];
    const valueMgDl = toMgDl(reading.value, reading.unit || 'mg/dL');

    if (valueMgDl > threshold) {
      if (eventStart === null) {
        eventStart = reading.ts;
        eventPeak = valueMgDl;
        consecutiveCount = 1;
      } else {
        consecutiveCount++;
        eventPeak = Math.max(eventPeak, valueMgDl);
      }
    } else {
      if (eventStart !== null && consecutiveCount * 5 >= durationMinutes) {
        events.push({
          start: eventStart,
          peak: eventPeak,
          duration: consecutiveCount * 5,
        });
      }
      eventStart = null;
      eventPeak = -Infinity;
      consecutiveCount = 0;
    }
  }

  if (eventStart !== null && consecutiveCount * 5 >= durationMinutes) {
    events.push({
      start: eventStart,
      peak: eventPeak,
      duration: consecutiveCount * 5,
    });
  }

  return events;
}

const connectorRegistry = new Map<string, GlucoseConnector>();

export function registerConnector(connector: GlucoseConnector): void {
  connectorRegistry.set(connector.id, connector);
}

export function getConnector(id: string): GlucoseConnector | undefined {
  return connectorRegistry.get(id);
}

export function getAllConnectors(): GlucoseConnector[] {
  return Array.from(connectorRegistry.values());
}
