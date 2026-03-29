/**
 * Health Data Service - central data layer for Delphi Health Trajectory.
 *
 * Reads and writes health_metrics, generates trajectory predictions from
 * stored data, saves trajectory snapshots for long-term history, and extracts
 * health data from natural language messages.
 */

import { supabase } from '../supabase';
import { apiClient } from '../api-client';
import { requestBackendJson } from '../backend-request';

export interface HealthDataPoint {
  metric_type: string;
  value: number;
  unit: string;
  recorded_at: string;
  source: string;
}

export interface TrajectoryPoint {
  timestamp: string;
  value: number;
}

export interface DelphiPrediction {
  prediction_type: string;
  predicted_value: number;
  confidence: number;
  horizon: string;
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  contributing_factors: string[];
  trajectory: TrajectoryPoint[];
  data_source: 'live' | 'simulated';
  metrics_used: number;
}

export interface ExtractedHealthData {
  metric_type: string;
  value: number;
  unit: string;
  raw_text: string;
}

const HEALTH_PATTERNS: Array<{
  pattern: RegExp;
  metric_type: string;
  unit: string;
  extractor: (match: RegExpMatchArray) => number;
}> = [
  {
    pattern: /(?:blood\s*pressure|bp)\s*(?:is|was|:)?\s*(\d{2,3})\s*[\/over]+\s*(\d{2,3})/i,
    metric_type: 'blood_pressure_systolic',
    unit: 'mmHg',
    extractor: (m) => parseInt(m[1], 10),
  },
  {
    pattern: /(?:blood\s*pressure|bp)\s*(?:is|was|:)?\s*(\d{2,3})\s*[\/over]+\s*(\d{2,3})/i,
    metric_type: 'blood_pressure_diastolic',
    unit: 'mmHg',
    extractor: (m) => parseInt(m[2], 10),
  },
  {
    pattern: /(?:heart\s*rate|pulse|hr|bpm)\s*(?:is|was|:)?\s*(\d{2,3})\s*(?:bpm)?/i,
    metric_type: 'heart_rate',
    unit: 'bpm',
    extractor: (m) => parseInt(m[1], 10),
  },
  {
    pattern: /(\d{2,3})\s*bpm/i,
    metric_type: 'heart_rate',
    unit: 'bpm',
    extractor: (m) => parseInt(m[1], 10),
  },
  {
    pattern: /(?:glucose|blood\s*sugar|bg)\s*(?:is|was|:)?\s*(\d{2,3})\s*(?:mg\/dl)?/i,
    metric_type: 'glucose',
    unit: 'mg/dL',
    extractor: (m) => parseInt(m[1], 10),
  },
  {
    pattern: /(?:a1c|hba1c)\s*(?:is|was|:)?\s*(\d+\.?\d*)\s*%?/i,
    metric_type: 'a1c',
    unit: '%',
    extractor: (m) => parseFloat(m[1]),
  },
  {
    pattern: /(?:weight|weigh)\s*(?:is|was|:)?\s*(\d{2,3})\s*(?:lbs?|pounds?|kg)?/i,
    metric_type: 'weight',
    unit: 'lbs',
    extractor: (m) => parseFloat(m[1]),
  },
  {
    pattern: /(?:temp(?:erature)?|fever)\s*(?:is|was|:)?\s*(\d{2,3}\.?\d*)\s*(?:°?[fF])?/i,
    metric_type: 'temperature',
    unit: '°F',
    extractor: (m) => parseFloat(m[1]),
  },
  {
    pattern: /(?:slept|sleep|got)\s*(?:for)?\s*(\d+\.?\d*)\s*(?:hours?|hrs?)\s*(?:of\s*sleep)?/i,
    metric_type: 'sleep_duration',
    unit: 'hours',
    extractor: (m) => parseFloat(m[1]),
  },
  {
    pattern: /(\d{3,6})\s*steps/i,
    metric_type: 'steps',
    unit: 'steps',
    extractor: (m) => parseInt(m[1], 10),
  },
  {
    pattern: /(?:spo2|oxygen|o2\s*sat)\s*(?:is|was|:)?\s*(\d{2,3})\s*%?/i,
    metric_type: 'oxygen_saturation',
    unit: '%',
    extractor: (m) => parseInt(m[1], 10),
  },
  {
    pattern: /(?:stress|mood|feeling|pain)\s*(?:level)?\s*(?:is|was|:)?\s*(\d{1,2})\s*(?:\/|out\s*of)\s*10/i,
    metric_type: 'stress_level',
    unit: '/10',
    extractor: (m) => parseInt(m[1], 10),
  },
];

export function extractHealthDataFromMessage(text: string): ExtractedHealthData[] {
  const extracted: ExtractedHealthData[] = [];
  const seenTypes = new Set<string>();

  for (const pattern of HEALTH_PATTERNS) {
    const match = text.match(pattern.pattern);
    if (!match || seenTypes.has(pattern.metric_type)) {
      continue;
    }

    const value = pattern.extractor(match);
    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }

    seenTypes.add(pattern.metric_type);
    extracted.push({
      metric_type: pattern.metric_type,
      value,
      unit: pattern.unit,
      raw_text: match[0],
    });
  }

  return extracted;
}

export async function storeHealthMetrics(
  userId: string,
  dataPoints: ExtractedHealthData[],
  source: string = 'raphael_chat',
): Promise<{ stored: number; error?: string }> {
  if (!userId || dataPoints.length === 0) {
    return { stored: 0 };
  }

  try {
    const headers = await apiClient.getAuthHeaders({
      'Bypass-Tunnel-Reminder': 'true',
      'Content-Type': 'application/json',
    });
    const response = await requestBackendJson<{ stored: number }>(
      '/api/v1/health/metrics',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          metrics: dataPoints.map((point) => ({
            metric_type: point.metric_type,
            value: point.value,
            unit: point.unit,
            source,
            recorded_at: new Date().toISOString(),
          })),
        }),
      },
      'Failed to store health metrics.',
    );
    return { stored: Number(response?.stored || 0) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to store health metrics.';
    console.error('Failed to store health metrics:', error);
    return { stored: 0, error: message };
  }
}

export async function fetchHealthMetrics(
  userId: string,
  lookbackDays: number = 30,
): Promise<HealthDataPoint[]> {
  if (!userId) {
    return [];
  }

  try {
    const headers = await apiClient.getAuthHeaders({
      'Bypass-Tunnel-Reminder': 'true',
    });
    const data = await requestBackendJson<{ metrics?: HealthDataPoint[] }>(
      `/api/v1/health/metrics?lookbackDays=${lookbackDays}`,
      { headers },
      'Failed to load health metrics.',
    );
    return (data.metrics || []).map((row: any) => ({
      metric_type: row.metric_type,
      value: Number(row.value),
      unit: row.unit,
      recorded_at: row.recorded_at,
      source: row.source,
    }));
  } catch (error) {
    console.warn('Health metrics unavailable:', error);
    return [];
  }
}

export async function generateDelphiPrediction(userId: string): Promise<DelphiPrediction> {
  const metrics = await fetchHealthMetrics(userId, 30);
  if (metrics.length === 0) {
    throw new Error('No live health metrics are available yet.');
  }
  return generatePredictionFromMetrics(metrics);
}

export async function saveTrajectorySnapshot(
  userId: string,
  prediction: DelphiPrediction,
): Promise<void> {
  const { error } = await supabase.from('delphi_trajectories').insert({
    user_id: userId,
    prediction_type: prediction.prediction_type,
    predicted_value: prediction.predicted_value,
    confidence: prediction.confidence,
    risk_level: prediction.risk_level,
    contributing_factors: prediction.contributing_factors,
    trajectory_data: prediction.trajectory,
    metrics_used: prediction.metrics_used,
    data_source: prediction.data_source,
    generated_at: new Date().toISOString(),
  });

  if (error) {
    console.warn('Could not save trajectory snapshot:', error.message);
  }
}

export async function fetchTrajectoryHistory(
  userId: string,
  limit: number = 7,
): Promise<DelphiPrediction[]> {
  const { data, error } = await supabase
    .from('delphi_trajectories')
    .select('*')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => ({
    prediction_type: row.prediction_type,
    predicted_value: row.predicted_value,
    confidence: row.confidence,
    horizon: '24h',
    risk_level: row.risk_level,
    contributing_factors: row.contributing_factors || [],
    trajectory: row.trajectory_data || [],
    data_source: row.data_source || 'live',
    metrics_used: row.metrics_used || 0,
  }));
}

function generatePredictionFromMetrics(metrics: HealthDataPoint[]): DelphiPrediction {
  const grouped: Record<string, HealthDataPoint[]> = {};
  for (const metric of metrics) {
    if (!grouped[metric.metric_type]) {
      grouped[metric.metric_type] = [];
    }
    grouped[metric.metric_type].push(metric);
  }

  const scores: number[] = [];
  const factors: string[] = [];

  if (grouped.heart_rate?.length) {
    const avg = grouped.heart_rate.reduce((sum, metric) => sum + metric.value, 0) / grouped.heart_rate.length;
    const hrScore = avg >= 60 && avg <= 80 ? 0.9 : avg >= 50 && avg <= 100 ? 0.7 : 0.4;
    scores.push(hrScore);
    const trend = grouped.heart_rate.length > 1
      ? grouped.heart_rate[grouped.heart_rate.length - 1].value - grouped.heart_rate[0].value
      : 0;
    factors.push(
      `Heart rate avg ${Math.round(avg)} bpm - ${hrScore > 0.8 ? 'optimal range' : 'slightly outside optimal'}${trend > 5 ? ' (trending up)' : trend < -5 ? ' (trending down)' : ' (stable)'}`,
    );
  }

  if (grouped.blood_pressure_systolic?.length) {
    const latest = grouped.blood_pressure_systolic[grouped.blood_pressure_systolic.length - 1].value;
    const bpScore = latest >= 110 && latest <= 130 ? 0.9 : latest >= 90 && latest <= 140 ? 0.7 : 0.4;
    scores.push(bpScore);
    factors.push(`Systolic BP ${latest} mmHg - ${bpScore > 0.8 ? 'within normal range' : 'warrants monitoring'}`);
  }

  if (grouped.glucose?.length) {
    const avg = grouped.glucose.reduce((sum, metric) => sum + metric.value, 0) / grouped.glucose.length;
    const glucoseScore = avg >= 70 && avg <= 110 ? 0.9 : avg >= 60 && avg <= 140 ? 0.7 : 0.4;
    scores.push(glucoseScore);
    factors.push(`Glucose avg ${Math.round(avg)} mg/dL - ${glucoseScore > 0.8 ? 'well controlled' : 'variable'}`);
  }

  if (grouped.sleep_duration?.length) {
    const avg = grouped.sleep_duration.reduce((sum, metric) => sum + metric.value, 0) / grouped.sleep_duration.length;
    const sleepScore = avg >= 7 ? 0.9 : avg >= 5 ? 0.65 : 0.3;
    scores.push(sleepScore);
    factors.push(`Sleep avg ${avg.toFixed(1)}h - ${sleepScore > 0.8 ? 'adequate recovery' : 'below recommended 7h'}`);
  }

  if (grouped.steps?.length) {
    const avg = grouped.steps.reduce((sum, metric) => sum + metric.value, 0) / grouped.steps.length;
    const stepsScore = avg >= 8000 ? 0.9 : avg >= 5000 ? 0.7 : 0.5;
    scores.push(stepsScore);
    factors.push(`Daily steps avg ${Math.round(avg)} - ${stepsScore > 0.8 ? 'active lifestyle' : 'consider more movement'}`);
  }

  if (scores.length === 0) {
    scores.push(0.65);
    factors.push('Limited data available - continue logging for more accurate predictions.');
  }

  const compositeScore = scores.reduce((left, right) => left + right, 0) / scores.length;
  const confidence = Math.min(0.95, 0.5 + (metrics.length / 100) * 0.45);
  const trajectory = generate24hTrajectory(compositeScore, metrics);

  const riskLevel: DelphiPrediction['risk_level'] =
    compositeScore >= 0.8 ? 'low' :
      compositeScore >= 0.6 ? 'moderate' :
        compositeScore >= 0.4 ? 'high' : 'critical';

  return {
    prediction_type: 'composite_health',
    predicted_value: compositeScore,
    confidence,
    horizon: '24h',
    risk_level: riskLevel,
    contributing_factors: factors,
    trajectory,
    data_source: 'live',
    metrics_used: metrics.length,
  };
}

function generate24hTrajectory(baseScore: number, metrics: HealthDataPoint[]): TrajectoryPoint[] {
  const now = new Date();
  const points: TrajectoryPoint[] = [];
  const recentMetrics = metrics.slice(-12);

  for (let hour = 0; hour < 24; hour += 1) {
    const time = new Date(now.getTime() + hour * 3600000);
    const circadian = Math.sin((hour - 6) * Math.PI / 12) * 0.06;

    const recentValues = recentMetrics.map((metric) => metric.value);
    let trend = 0;
    if (recentValues.length >= 2) {
      const first = recentValues[0];
      const last = recentValues[recentValues.length - 1];
      if (first !== 0) {
        trend = ((last - first) / first) * 0.001 * hour;
      }
    }

    const value = Math.max(0.15, Math.min(0.98, baseScore + circadian + trend));
    points.push({
      timestamp: time.toISOString(),
      value,
    });
  }

  return points;
}
