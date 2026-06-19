/**
 * Health Data Service — Central data layer for Delphi Health Trajectory
 * 
 * Reads/writes health_metrics from Supabase, generates trajectory predictions
 * from stored data, saves trajectory snapshots for long-term history, and
 * extracts health data from natural language (Raphael chat messages).
 */

import { supabase } from '../supabase';
import { apiClient } from '../api-client';
import { requestBackendJson } from '../backend-request';

// ─── Types ───────────────────────────────────────────────────────────────────

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
    /** Forecast uncertainty cone (0..1), widening with the horizon. */
    lower?: number;
    upper?: number;
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

// ─── Health data extraction patterns ─────────────────────────────────────────

const HEALTH_PATTERNS: Array<{
    pattern: RegExp;
    metric_type: string;
    unit: string;
    extractor: (match: RegExpMatchArray) => number;
}> = [
        // Blood pressure: "120/80", "BP 120/80", "blood pressure is 120 over 80"
        {
            pattern: /(?:blood\s*pressure|bp)\s*(?:is|was|:)?\s*(\d{2,3})\s*[/over]+\s*(\d{2,3})/i,
            metric_type: 'blood_pressure_systolic',
            unit: 'mmHg',
            extractor: (m) => parseInt(m[1]),
        },
        {
            pattern: /(?:blood\s*pressure|bp)\s*(?:is|was|:)?\s*(\d{2,3})\s*[/over]+\s*(\d{2,3})/i,
            metric_type: 'blood_pressure_diastolic',
            unit: 'mmHg',
            extractor: (m) => parseInt(m[2]),
        },
        // Heart rate: "heart rate 72", "pulse is 80", "HR 65"
        {
            pattern: /(?:heart\s*rate|pulse|hr|bpm)\s*(?:is|was|:)?\s*(\d{2,3})\s*(?:bpm)?/i,
            metric_type: 'heart_rate',
            unit: 'bpm',
            extractor: (m) => parseInt(m[1]),
        },
        // Also match "72 bpm"
        {
            pattern: /(\d{2,3})\s*bpm/i,
            metric_type: 'heart_rate',
            unit: 'bpm',
            extractor: (m) => parseInt(m[1]),
        },
        // Glucose: "glucose 95", "blood sugar is 110", "A1C 5.7"
        {
            pattern: /(?:glucose|blood\s*sugar|bg)\s*(?:is|was|:)?\s*(\d{2,3})\s*(?:mg\/dl)?/i,
            metric_type: 'glucose',
            unit: 'mg/dL',
            extractor: (m) => parseInt(m[1]),
        },
        {
            pattern: /(?:a1c|hba1c)\s*(?:is|was|:)?\s*(\d+\.?\d*)\s*%?/i,
            metric_type: 'a1c',
            unit: '%',
            extractor: (m) => parseFloat(m[1]),
        },
        // Weight: "weight 185", "I weigh 165 lbs"
        {
            pattern: /(?:weight|weigh)\s*(?:is|was|:)?\s*(\d{2,3})\s*(?:lbs?|pounds?|kg)?/i,
            metric_type: 'weight',
            unit: 'lbs',
            extractor: (m) => parseFloat(m[1]),
        },
        // Temperature: "temp 98.6", "fever 101.2"
        {
            pattern: /(?:temp(?:erature)?|fever)\s*(?:is|was|:)?\s*(\d{2,3}\.?\d*)\s*(?:°?[fF])?/i,
            metric_type: 'temperature',
            unit: '°F',
            extractor: (m) => parseFloat(m[1]),
        },
        // Sleep: "slept 7 hours", "got 6.5 hours of sleep"
        {
            pattern: /(?:slept|sleep|got)\s*(?:for)?\s*(\d+\.?\d*)\s*(?:hours?|hrs?)\s*(?:of\s*sleep)?/i,
            metric_type: 'sleep_duration',
            unit: 'hours',
            extractor: (m) => parseFloat(m[1]),
        },
        // Steps: "walked 8000 steps", "10000 steps today"
        {
            pattern: /(\d{3,6})\s*steps/i,
            metric_type: 'steps',
            unit: 'steps',
            extractor: (m) => parseInt(m[1]),
        },
        // Oxygen: "SpO2 98", "oxygen 97%"
        {
            pattern: /(?:spo2|oxygen|o2\s*sat)\s*(?:is|was|:)?\s*(\d{2,3})\s*%?/i,
            metric_type: 'oxygen_saturation',
            unit: '%',
            extractor: (m) => parseInt(m[1]),
        },
        // Stress/mood: "stress level 7/10", "feeling 8 out of 10"
        {
            pattern: /(?:stress|mood|feeling|pain)\s*(?:level)?\s*(?:is|was|:)?\s*(\d{1,2})\s*(?:\/|out\s*of)\s*10/i,
            metric_type: 'stress_level',
            unit: '/10',
            extractor: (m) => parseInt(m[1]),
        },
    ];

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Extract health data points from a natural-language message.
 * Used by RaphaelChat to detect health data in user messages.
 */
export function extractHealthDataFromMessage(text: string): ExtractedHealthData[] {
    const extracted: ExtractedHealthData[] = [];
    const seenTypes = new Set<string>();

    for (const pattern of HEALTH_PATTERNS) {
        const match = text.match(pattern.pattern);
        if (match && !seenTypes.has(pattern.metric_type)) {
            const value = pattern.extractor(match);
            if (isFinite(value) && value > 0) {
                seenTypes.add(pattern.metric_type);
                extracted.push({
                    metric_type: pattern.metric_type,
                    value,
                    unit: pattern.unit,
                    raw_text: match[0],
                });
            }
        }
    }

    return extracted;
}

/**
 * Store health data points to Supabase `health_metrics` table.
 */
export async function storeHealthMetrics(
    userId: string,
    dataPoints: ExtractedHealthData[],
    source: string = 'raphael_chat'
): Promise<{ stored: number; error?: string }> {
    if (!dataPoints.length) return { stored: 0 };

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

/**
 * Fetch recent health metrics from Supabase for a user.
 */
export async function fetchHealthMetrics(
    userId: string,
    lookbackDays: number = 30
): Promise<HealthDataPoint[]> {
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
        })).filter((p) => Number.isFinite(p.value));
    } catch (error) {
        console.warn('Health metrics unavailable:', error);
        return [];
    }
}

/**
 * Generate a Delphi prediction trajectory from stored health data.
 * If real data exists, uses it to build a trend-based prediction.
 * Falls back to simulated data if no real data is available.
 */
export async function generateDelphiPrediction(
    userId: string
): Promise<DelphiPrediction> {
    const metrics = await fetchHealthMetrics(userId, 30);

    if (metrics.length === 0) {
        return generateSimulatedPrediction();
    }

    return generatePredictionFromMetrics(metrics);
}

/**
 * Save a trajectory snapshot for long-term history.
 */
export async function saveTrajectorySnapshot(
    userId: string,
    prediction: DelphiPrediction
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
        // Table may not exist yet — fail silently
        console.warn('Could not save trajectory snapshot:', error.message);
    }
}

/**
 * Fetch historical trajectory snapshots for trend comparison.
 */
export async function fetchTrajectoryHistory(
    userId: string,
    limit: number = 7
): Promise<DelphiPrediction[]> {
    const { data, error } = await supabase
        .from('delphi_trajectories')
        .select('*')
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })
        .limit(limit);

    if (error || !data) return [];

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

// ─── Internal helpers ────────────────────────────────────────────────────────

function generatePredictionFromMetrics(metrics: HealthDataPoint[]): DelphiPrediction {
    // Group by type, each sorted oldest → newest.
    const grouped: Record<string, HealthDataPoint[]> = {};
    for (const m of metrics) (grouped[m.metric_type] ||= []).push(m);
    for (const k in grouped) {
        grouped[k].sort((a, b) => +new Date(a.recorded_at) - +new Date(b.recorded_at));
    }

    // Human-readable per-metric factors (average + observed direction).
    const factors: string[] = [];
    const describe = (type: string, label: string, unit: string, fmt: (n: number) => string) => {
        const arr = grouped[type];
        if (!arr?.length) return;
        const avg = arr.reduce((s, m) => s + m.value, 0) / arr.length;
        const sub = metricSubScore(type, avg) ?? 0.65;
        const delta = arr.length > 1 ? arr[arr.length - 1].value - arr[0].value : 0;
        const dir = Math.abs(delta) < 1e-6 ? 'stable' : delta > 0 ? 'trending up' : 'trending down';
        const quality = sub > 0.8 ? 'optimal range' : sub > 0.55 ? 'acceptable' : 'warrants monitoring';
        factors.push(`${label} avg ${fmt(avg)}${unit ? ' ' + unit : ''} — ${quality} (${dir})`);
    };
    describe('heart_rate', 'Heart rate', 'bpm', (n) => `${Math.round(n)}`);
    describe('blood_pressure_systolic', 'Systolic BP', 'mmHg', (n) => `${Math.round(n)}`);
    describe('glucose', 'Glucose', 'mg/dL', (n) => `${Math.round(n)}`);
    describe('sleep_duration', 'Sleep', 'h', (n) => n.toFixed(1));
    describe('steps', 'Daily steps', '', (n) => `${Math.round(n)}`);
    describe('oxygen_saturation', 'SpO₂', '%', (n) => `${Math.round(n)}`);

    // Build a daily composite sub-score series so we can fit a *real* trend
    // (not just averages) and project it forward.
    const t0 = Math.min(...metrics.map((m) => +new Date(m.recorded_at)));
    const byDay = new Map<number, number[]>();
    for (const m of metrics) {
        const s = metricSubScore(m.metric_type, m.value);
        if (s == null || !Number.isFinite(s)) continue;
        const day = Math.floor((+new Date(m.recorded_at) - t0) / 86400000);
        let bucket = byDay.get(day);
        if (!bucket) { bucket = []; byDay.set(day, bucket); }
        bucket.push(s);
    }
    const series = [...byDay.entries()]
        .map(([x, arr]) => ({ x, y: arr.reduce((a, b) => a + b, 0) / arr.length }))
        .sort((a, b) => a.x - b.x);

    const level = clamp(series.length ? series[series.length - 1].y : 0.65, 0.05, 0.99);
    const { slope: slopePerDay, residualStd } = leastSquaresSlope(series);

    // Confidence = data density × trend stability (a steadier history earns more trust).
    const density = clamp(0.45 + (metrics.length / 120) * 0.45, 0.3, 0.9);
    const stability = 1 - clamp(residualStd / 0.25, 0, 1) * 0.4;
    const confidence = clamp(density * (0.7 + 0.3 * stability), 0.3, 0.95);

    const trajectory = forecastTrajectory(level, slopePerDay, residualStd, seedFromMetrics(metrics), confidence);
    const projected = trajectory[trajectory.length - 1].value;
    const band = Math.round(((trajectory[trajectory.length - 1].upper ?? projected) - projected) * 100);

    if (factors.length === 0) {
        factors.push('Limited data — continue logging for more accurate predictions');
    }
    // Lead with the directional forecast so "Primary Insight" is genuinely predictive.
    const dirWord = Math.round(level * 100) === Math.round(projected * 100) ? 'holding steady' : projected > level ? 'improving' : 'easing lower';
    factors.unshift(
        `Composite health ${dirWord}: ${Math.round(level * 100)}% now → ${Math.round(projected * 100)}% in 24h ` +
        `(${series.length}-day trend, ±${band}%).`,
    );

    // risk_level reflects the CURRENT composite (present-state band); predicted_value is the 24h forecast.
    const riskLevel: DelphiPrediction['risk_level'] =
        level >= 0.8 ? 'low' : level >= 0.6 ? 'moderate' : level >= 0.4 ? 'high' : 'critical';

    return {
        prediction_type: 'composite_health',
        predicted_value: projected,
        confidence,
        horizon: '24h',
        risk_level: riskLevel,
        contributing_factors: factors,
        trajectory,
        data_source: 'live',
        metrics_used: metrics.length,
    };
}

/**
 * Deterministic PRNG (mulberry32). Same seed → same sequence, so a trajectory
 * built from the same metrics is reproducible across refreshes. This is what
 * makes the forecast "predictable" instead of a fresh random walk each time.
 */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Stable FNV-1a hash of the observation values → PRNG seed. */
function seedFromMetrics(metrics: HealthDataPoint[]): number {
    let h = 2166136261;
    for (const m of metrics) {
        const token = `${m.metric_type}:${Math.round(m.value * 10)}`;
        for (let i = 0; i < token.length; i++) {
            h ^= token.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
    }
    return h >>> 0;
}

/**
 * Map one observation to a 0..1 health sub-score (higher = healthier) using
 * clinically-motivated comfort bands. Returns null for metrics we don't score
 * (e.g. raw weight) so they never distort the composite.
 */
function metricSubScore(type: string, value: number): number | null {
    if (!Number.isFinite(value)) return null; // drop malformed observations
    const band = (v: number, lo: number, hi: number, soft: number): number => {
        if (v >= lo && v <= hi) return 1;
        const d = v < lo ? lo - v : v - hi;
        return Math.max(0.2, 1 - d / soft);
    };
    switch (type) {
        case 'heart_rate': return band(value, 55, 80, 40);
        case 'blood_pressure_systolic': return band(value, 105, 125, 35);
        case 'blood_pressure_diastolic': return band(value, 65, 85, 30);
        case 'glucose': return band(value, 70, 110, 60);
        case 'sleep_duration': return band(value, 7, 9, 4);
        case 'steps': return Math.max(0.3, Math.min(1, value / 10000));
        case 'oxygen_saturation': return band(value, 96, 100, 6);
        case 'temperature': return band(value, 97, 99.3, 3);
        case 'stress_level': return Math.max(0.2, 1 - value / 10);
        default: return null;
    }
}

/** Ordinary least-squares slope of y over x, plus residual std-dev. */
function leastSquaresSlope(pts: Array<{ x: number; y: number }>): { slope: number; residualStd: number } {
    const n = pts.length;
    if (n < 2) return { slope: 0, residualStd: 0 };
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const p of pts) { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; }
    const denom = n * sxx - sx * sx;
    const slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
    const intercept = (sy - slope * sx) / n;
    let ss = 0;
    for (const p of pts) { const e = p.y - (slope * p.x + intercept); ss += e * e; }
    return { slope, residualStd: Math.sqrt(ss / n) };
}

function clamp(v: number, lo: number, hi: number): number {
    if (!Number.isFinite(v)) return lo; // NaN/Infinity backstop — never poison the trajectory
    return Math.max(lo, Math.min(hi, v));
}

/**
 * Deterministic 24h forecast: damped-trend projection (Holt-style) + circadian
 * modulation + a reproducible seeded micro-texture, with an uncertainty cone
 * that widens with the horizon. Same inputs → identical curve, every time.
 */
function forecastTrajectory(
    level: number,
    slopePerDay: number,
    residualStd: number,
    seed: number,
    confidence: number,
): TrajectoryPoint[] {
    const rand = mulberry32(seed);
    const startedAt = Date.now();
    const slopePerHour = slopePerDay / 24;
    const phi = 0.92; // per-hour trend damping → projection stays bounded
    const baseSigma = clamp(0.03 + residualStd * 0.6 + (1 - confidence) * 0.05, 0.02, 0.14);
    const points: TrajectoryPoint[] = [];

    let dampedTrend = 0;
    let phiPow = 1;
    for (let hour = 0; hour < 24; hour++) {
        if (hour > 0) { phiPow *= phi; dampedTrend += slopePerHour * phiPow; }
        const circadian = Math.sin(hour * Math.PI / 12) * 0.04; // 0 at "now", gentle ripple
        const micro = (rand() - 0.5) * 0.012; // deterministic, seeded
        const value = clamp(level + dampedTrend + circadian + micro, 0.05, 0.99);
        const sigma = baseSigma * Math.sqrt(hour / 6); // cone pinched at "now", fanning out with the horizon
        points.push({
            timestamp: new Date(startedAt + hour * 3600000).toISOString(),
            value,
            lower: clamp(value - sigma, 0.02, 0.99),
            upper: clamp(value + sigma, 0.02, 0.99),
        });
    }
    return points;
}

export function generateSimulatedPrediction(): DelphiPrediction {
    // Deterministic baseline (fixed seed) so even the no-data view is reproducible.
    const trajectory = forecastTrajectory(0.65, 0, 0.04, 0x5eed51, 0.42);
    return {
        prediction_type: 'metabolic_trend',
        predicted_value: trajectory[trajectory.length - 1].value,
        confidence: 0.42,
        horizon: '24h',
        risk_level: 'low',
        contributing_factors: [
            'No health data recorded yet — start logging vitals for personalized predictions',
            'Baseline trajectory from population health averages (no live signal)',
            'Talk to St. Raphael or log vitals to improve accuracy',
        ],
        trajectory,
        data_source: 'simulated',
        metrics_used: 0,
    };
}
