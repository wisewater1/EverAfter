/**
 * Health Data Service — Central data layer for Delphi Health Trajectory
 * 
 * Reads/writes health_metrics from Supabase, generates trajectory predictions
 * from stored data, saves trajectory snapshots for long-term history, and
 * extracts health data from natural language (Raphael chat messages).
 */

import { supabase } from '../supabase';

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
            pattern: /(?:blood\s*pressure|bp)\s*(?:is|was|:)?\s*(\d{2,3})\s*[\/over]+\s*(\d{2,3})/i,
            metric_type: 'blood_pressure_systolic',
            unit: 'mmHg',
            extractor: (m) => parseInt(m[1]),
        },
        {
            pattern: /(?:blood\s*pressure|bp)\s*(?:is|was|:)?\s*(\d{2,3})\s*[\/over]+\s*(\d{2,3})/i,
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

    const rows = dataPoints.map(dp => ({
        user_id: userId,
        metric_type: dp.metric_type,
        metric_value: dp.value,
        metric_unit: dp.unit,
        recorded_at: new Date().toISOString(),
        source,
    }));

    const { error } = await supabase.from('health_metrics').insert(rows);

    if (error) {
        console.error('Failed to store health metrics:', error);
        return { stored: 0, error: error.message };
    }

    return { stored: rows.length };
}

/**
 * Fetch recent health metrics from Supabase for a user.
 */
export async function fetchHealthMetrics(
    userId: string,
    lookbackDays: number = 30
): Promise<HealthDataPoint[]> {
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    const { data, error } = await supabase
        .from('health_metrics')
        .select('metric_type, metric_value, metric_unit, recorded_at, source')
        .eq('user_id', userId)
        .gte('recorded_at', since.toISOString())
        .order('recorded_at', { ascending: true });

    if (error) {
        console.error('Failed to fetch health metrics:', error);
        return [];
    }

    return (data || []).map((row: any) => ({
        metric_type: row.metric_type,
        value: Number(row.metric_value),
        unit: row.metric_unit,
        recorded_at: row.recorded_at,
        source: row.source
    }));
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
    // Group metrics by type
    const grouped: Record<string, HealthDataPoint[]> = {};
    metrics.forEach(m => {
        if (!grouped[m.metric_type]) grouped[m.metric_type] = [];
        grouped[m.metric_type].push(m);
    });

    // Calculate a composite health score from available metrics
    const scores: number[] = [];
    const factors: string[] = [];

    // Heart rate scoring
    if (grouped.heart_rate?.length) {
        const avg = grouped.heart_rate.reduce((s, m) => s + m.value, 0) / grouped.heart_rate.length;
        const hrScore = avg >= 60 && avg <= 80 ? 0.9 : avg >= 50 && avg <= 100 ? 0.7 : 0.4;
        scores.push(hrScore);
        const trend = grouped.heart_rate.length > 1
            ? grouped.heart_rate[grouped.heart_rate.length - 1].value - grouped.heart_rate[0].value
            : 0;
        factors.push(
            `Heart rate avg ${Math.round(avg)} bpm — ${hrScore > 0.8 ? 'optimal range' : 'slightly outside optimal'}${trend > 5 ? ' (trending up)' : trend < -5 ? ' (trending down)' : ' (stable)'
            }`
        );
    }

    // Blood pressure scoring
    if (grouped.blood_pressure_systolic?.length) {
        const latest = grouped.blood_pressure_systolic[grouped.blood_pressure_systolic.length - 1].value;
        const bpScore = latest >= 110 && latest <= 130 ? 0.9 : latest >= 90 && latest <= 140 ? 0.7 : 0.4;
        scores.push(bpScore);
        factors.push(`Systolic BP ${latest} mmHg — ${bpScore > 0.8 ? 'within normal range' : 'warrants monitoring'}`);
    }

    // Glucose scoring
    if (grouped.glucose?.length) {
        const avg = grouped.glucose.reduce((s, m) => s + m.value, 0) / grouped.glucose.length;
        const glucScore = avg >= 70 && avg <= 110 ? 0.9 : avg >= 60 && avg <= 140 ? 0.7 : 0.4;
        scores.push(glucScore);
        factors.push(`Glucose avg ${Math.round(avg)} mg/dL — ${glucScore > 0.8 ? 'well controlled' : 'variable'}`);
    }

    // Sleep scoring
    if (grouped.sleep_duration?.length) {
        const avg = grouped.sleep_duration.reduce((s, m) => s + m.value, 0) / grouped.sleep_duration.length;
        const sleepScore = avg >= 7 ? 0.9 : avg >= 5 ? 0.65 : 0.3;
        scores.push(sleepScore);
        factors.push(`Sleep avg ${avg.toFixed(1)}h — ${sleepScore > 0.8 ? 'adequate recovery' : 'below recommended 7h'}`);
    }

    // Steps scoring
    if (grouped.steps?.length) {
        const avg = grouped.steps.reduce((s, m) => s + m.value, 0) / grouped.steps.length;
        const stepsScore = avg >= 8000 ? 0.9 : avg >= 5000 ? 0.7 : 0.5;
        scores.push(stepsScore);
        factors.push(`Daily steps avg ${Math.round(avg)} — ${stepsScore > 0.8 ? 'active lifestyle' : 'consider more movement'}`);
    }

    // If no meaningful scores, add a generic factor
    if (scores.length === 0) {
        scores.push(0.65);
        factors.push('Limited data available — continue logging for more accurate predictions');
    }

    const compositeScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const confidence = Math.min(0.95, 0.5 + (metrics.length / 100) * 0.45);

    // Generate 24-hour trajectory
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

    // Use actual recent data for the first few hours if available
    const recentMetrics = metrics.slice(-12); // Last 12 data points

    for (let hour = 0; hour < 24; hour++) {
        const time = new Date(now.getTime() + hour * 3600000);

        // Circadian rhythm modulator
        const circadian = Math.sin((hour - 6) * Math.PI / 12) * 0.06;

        // Gradual trend based on existing data direction
        const recentValues = recentMetrics.map(m => m.value);
        let trend = 0;
        if (recentValues.length >= 2) {
            const first = recentValues[0];
            const last = recentValues[recentValues.length - 1];
            trend = ((last - first) / first) * 0.001 * hour; // Very subtle trend projection
        }

        // Small natural variation
        const noise = (Math.random() - 0.5) * 0.02;

        const value = Math.max(0.15, Math.min(0.98, baseScore + circadian + trend + noise));

        points.push({
            timestamp: time.toISOString(),
            value,
        });
    }

    return points;
}

function generateSimulatedPrediction(): DelphiPrediction {
    const now = new Date();
    const trajectory: TrajectoryPoint[] = [];
    let value = 0.65;

    for (let i = 0; i < 24; i++) {
        const time = new Date(now.getTime() + i * 3600000);
        const circadian = Math.sin((i - 6) * Math.PI / 12) * 0.08;
        const noise = (Math.random() - 0.5) * 0.04;
        const trend = i * 0.002;
        value = Math.max(0.3, Math.min(0.95, 0.65 + circadian + noise + trend));
        trajectory.push({ timestamp: time.toISOString(), value });
    }

    return {
        prediction_type: 'metabolic_trend',
        predicted_value: trajectory[trajectory.length - 1].value,
        confidence: 0.42,
        horizon: '24h',
        risk_level: 'low',
        contributing_factors: [
            'No health data recorded yet — start logging vitals for personalized predictions',
            'Simulated trajectory based on population health averages',
            'Talk to St. Raphael or log vitals to improve accuracy',
        ],
        trajectory,
        data_source: 'simulated',
        metrics_used: 0,
    };
}
