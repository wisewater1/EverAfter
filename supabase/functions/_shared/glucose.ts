import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';

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

export function toMgDl(value: number, unit: 'mg/dL' | 'mmol/L' = 'mg/dL'): number {
  if (unit === 'mmol/L') {
    return Math.round(value * 18.0182 * 10) / 10;
  }
  return value;
}

export async function upsertGlucoseReading(
  supabase: SupabaseClient,
  userId: string,
  engramId: string,
  point: GlucosePoint,
  src: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const valueMgDl = toMgDl(point.value, point.unit || 'mg/dL');

    const { error } = await supabase
      .from('glucose_readings')
      .upsert({
        user_id: userId,
        engram_id: engramId,
        ts: point.ts,
        value: valueMgDl,
        unit: 'mg/dL',
        src,
        trend: point.trend || null,
        quality: point.quality || null,
        raw: point.raw || {},
      }, {
        onConflict: 'user_id,engram_id,ts,src',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('Glucose upsert error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Glucose upsert exception:', err);
    return { success: false, error: err.message };
  }
}

export async function upsertLabResult(
  supabase: SupabaseClient,
  userId: string,
  engramId: string,
  lab: LabResult,
  src: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('lab_results')
      .insert({
        user_id: userId,
        engram_id: engramId,
        ts: lab.ts,
        loinc: lab.loinc || null,
        name: lab.name,
        value: lab.value,
        unit: lab.unit,
        src,
        raw: lab.raw || {},
      });

    if (error) {
      console.error('Lab result insert error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Lab result insert exception:', err);
    return { success: false, error: err.message };
  }
}

export async function insertMetabolicEvent(
  supabase: SupabaseClient,
  userId: string,
  engramId: string,
  event: MetabolicEvent
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('metabolic_events')
      .insert({
        user_id: userId,
        engram_id: engramId,
        ts: event.ts,
        type: event.type,
        carbs_g: event.carbs_g || null,
        insulin_units: event.insulin_units || null,
        intensity: event.intensity || null,
        text: event.text || null,
        raw: event.raw || {},
      })
      .select('id')
      .single();

    if (error) {
      console.error('Metabolic event insert error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('Metabolic event insert exception:', err);
    return { success: false, error: err.message };
  }
}

export async function getOrCreateRaphaelEngram(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('engrams')
    .select('id')
    .eq('user_id', userId)
    .eq('name', 'St. Raphael')
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data: serviceClient } = await supabase.auth.admin.getUserById(userId);
  if (!serviceClient) return null;

  const { data: created, error } = await supabase
    .from('engrams')
    .insert({
      user_id: userId,
      name: 'St. Raphael',
      description: 'Health companion and glucose monitoring assistant',
      personality_traits: { role: 'health_companion', focus: 'glucose_monitoring' },
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create Raphael engram:', error);
    return null;
  }

  return created.id;
}

export async function verifyDexcomSignature(
  req: Request,
  body: string
): Promise<boolean> {
  const signature = req.headers.get('x-dexcom-signature');
  if (!signature) return false;

  const secret = Deno.env.get('DEXCOM_WEBHOOK_SECRET');
  if (!secret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );

  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computedSignature === signature;
}

export function parseDexcomCsv(content: string): { points: GlucosePoint[]; events: MetabolicEvent[] } {
  const points: GlucosePoint[] = [];
  const events: MetabolicEvent[] = [];

  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    return { points, events };
  }

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  const tsIndex = headers.findIndex(h => h.includes('timestamp') || h.includes('time'));
  const valueIndex = headers.findIndex(h => h.includes('glucose') || h.includes('value'));
  const unitIndex = headers.findIndex(h => h.includes('unit'));
  const eventIndex = headers.findIndex(h => h.includes('event') || h.includes('type'));

  if (tsIndex === -1 || valueIndex === -1) {
    throw new Error('CSV must contain timestamp and glucose value columns');
  }

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim());

    if (cells.length <= Math.max(tsIndex, valueIndex)) continue;

    const ts = cells[tsIndex];
    const valueStr = cells[valueIndex];

    if (!ts || !valueStr || valueStr === '' || valueStr === 'Low' || valueStr === 'High') {
      continue;
    }

    const value = parseFloat(valueStr);
    if (isNaN(value)) continue;

    const unit = unitIndex >= 0 && cells[unitIndex] ? cells[unitIndex] : 'mg/dL';

    points.push({
      ts: new Date(ts).toISOString(),
      value,
      unit: unit.includes('mmol') ? 'mmol/L' : 'mg/dL',
    });
  }

  return { points, events };
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

export function computeGlucoseStats(readings: GlucosePoint[]): {
  mean: number;
  median: number;
  sd: number;
  min: number;
  max: number;
  gmi?: number;
} {
  if (readings.length === 0) {
    return { mean: 0, median: 0, sd: 0, min: 0, max: 0 };
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
  const sd = Math.sqrt(variance);

  const gmi = 3.31 + (0.02392 * mean);

  return {
    mean: Math.round(mean * 10) / 10,
    median: Math.round(median * 10) / 10,
    sd: Math.round(sd * 10) / 10,
    min: values[0],
    max: values[values.length - 1],
    gmi: Math.round(gmi * 10) / 10,
  };
}

export async function logJobAudit(
  supabase: SupabaseClient,
  jobName: string,
  status: 'running' | 'success' | 'failed',
  meta?: {
    rowsWritten?: number;
    durationMs?: number;
    error?: string;
    startedAt?: string;
  }
): Promise<void> {
  await supabase.from('glucose_job_audit').insert({
    job_name: jobName,
    started_at: meta?.startedAt || new Date().toISOString(),
    completed_at: status !== 'running' ? new Date().toISOString() : null,
    rows_written: meta?.rowsWritten || 0,
    duration_ms: meta?.durationMs || null,
    status,
    error: meta?.error || null,
  });
}
