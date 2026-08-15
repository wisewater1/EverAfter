/**
 * DHT API helper: shared fetch wrapper for Delphi Health Trajectory endpoints.
 */
import { buildApiUrl } from './env';
import { requestBackendJson } from './backend-request';
import { buildAccessTokenHeaders } from './auth-session';

const BASE = buildApiUrl('');

export interface RiskCard {
    id?: string;
    condition?: string;
    domain: string;
    current_level: string;
    direction: 'up' | 'down' | 'stable';
    delta_30d: number;
    confidence: number;
    what_moved_it?: string[];
    source?: string;
    suggested_action?: string;
}

export interface LeadingIndicator {
    id: string;
    name: string;
    label?: string;
    value: number;
    unit: string;
    variance_from_baseline?: number;
    clinical_significance?: string;
    trend?: 'up' | 'down' | 'stable';
    status?: 'improving' | 'warning' | 'critical' | 'stable';
    impact?: 'positive' | 'negative' | 'neutral';
    delta_7d?: number;
    delta_30d?: number;
}

export interface NextBestMeasurement {
    type: string;
    urgency: 'high' | 'medium' | 'low';
    reason: string;
    label: string;
    uncertainty_reduction_pct?: number;
    suggested_source?: string;
    impact_score: number;
}

export interface OceanMetrics {
    version: number;
    scores: Record<string, number>;
}

export interface BehavioralModifier {
    alert_sensitivity: string;
    intervention_style: string;
    checklist_preference?: boolean;
    alarm_fatigue_risk?: number;
    adherence_risk: number;
    nudge_frequency: string;
    modifiers?: Array<{
        trait: string;
        modifier_value: number;
        impact_area: string;
        description?: string;
    }>;
}

export interface BehavioralModifiersResponse {
    modifiers: BehavioralModifier | null;
    ocean_version?: number;
    scores?: Record<string, number>;
    message?: string;
}

export interface FamilyDHTMap {
    nodes: Array<{ id: string; dht_score: number; name?: string }>;
    edges: Array<{ from_id: string; to_id: string; genetic_weight: number }>;
}

/**
 * A single anomalous reading, as the DHT engine emits it.
 *
 * Field names mirror backend/app/models/dht.py exactly. They are worth reading
 * closely: the backend sends `zscore` with no underscore and `detected_at`
 * rather than `timestamp`, and it sends no unit at all. Consumers that guessed
 * otherwise rendered nothing for those fields.
 */
export interface Anomaly {
    metric: string;
    value: number;
    expected_range: [number, number];
    zscore: number;
    detected_at: string;
    severity: 'minor' | 'moderate' | 'severe';
}

/**
 * The Delphi Health Trajectory itself, as returned under the `dht` key.
 *
 * Mirrors DelphiHealthTrajectory in backend/app/models/dht.py. Sub-objects that
 * nothing in the frontend reads yet are typed loosely rather than invented, so
 * this stays honest about what has actually been checked against the backend.
 */
export interface DelphiHealthTrajectory {
    dht_id: string;
    person_id: string;
    family_id?: string | null;
    computed_at: string;
    data_freshness_seconds: number;
    observation_count: number;
    data_quality: 'rich' | 'moderate' | 'sparse' | 'empty';
    baselines: Record<string, number>;
    rolling_deltas_7d: Record<string, number>;
    rolling_deltas_30d: Record<string, number>;
    variability: Record<string, number>;
    adherence_signals: Record<string, number>;
    trend_breaks: Array<Record<string, unknown>>;
    anomalies: Anomaly[];
    context_tags: string[];
    short_term?: Record<string, unknown> | null;
    mid_term?: Record<string, unknown> | null;
    long_term?: Record<string, unknown> | null;
    overall_direction: string;
    risk_cards: RiskCard[];
    leading_indicators: Array<Record<string, unknown>>;
    next_best_measurement?: NextBestMeasurement | null;
    confidence: number;
    uncertainty_lower: number;
    uncertainty_upper: number;
    saint_notes: string[];
    ocean_version?: number | null;
    behavioral_modifiers?: BehavioralModifier | null;
}

export interface DHTResponse {
    // Was typed DelphiTrajectory, which is an unrelated prediction record in
    // database.types.ts and shares almost no fields with what this endpoint
    // returns. Reading anomalies off it did work at runtime, because the field
    // is really there, but nothing about the shape was actually checked.
    dht: DelphiHealthTrajectory;
    stale?: boolean;
    last_observation_at?: string | null;
}

async function dhtFetch<T = any>(path: string, options?: RequestInit): Promise<T | null> {
    try {
        const headers = await buildAccessTokenHeaders({ 'Content-Type': 'application/json' });
        return await requestBackendJson<T>(`/api/v1/dht${path}`, { ...options, headers }, 'Failed to reach the DHT service');
    } catch (err) {
        console.warn(`DHT request failed for ${path}:`, err);
        return null;
    }
}

function normalizeDirection(value?: string | null): 'up' | 'down' | 'stable' {
    const normalized = String(value || '').trim().toLowerCase();
    if (['up', '↑', 'â†‘', 'improving', 'increase', 'rising'].includes(normalized)) return 'up';
    if (['down', '↓', 'â†“', 'declining', 'decrease', 'falling'].includes(normalized)) return 'down';
    return 'stable';
}

function normalizeRiskCard(card: any): RiskCard {
    return {
        id: card?.id || `${card?.domain || 'domain'}-${card?.current_level || 'unknown'}`,
        condition: card?.condition || card?.domain,
        domain: card?.domain || 'general',
        current_level: card?.current_level || 'low',
        direction: normalizeDirection(card?.direction),
        delta_30d: Number(card?.delta_30d || 0),
        confidence: Number(card?.confidence || 0),
        what_moved_it: Array.isArray(card?.what_moved_it) ? card.what_moved_it : [],
        source: card?.source,
        suggested_action: card?.suggested_action,
    };
}

function normalizeImpact(value: any, trend: 'up' | 'down' | 'stable'): 'positive' | 'negative' | 'neutral' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'positive' || normalized === 'negative' || normalized === 'neutral') {
        return normalized as 'positive' | 'negative' | 'neutral';
    }
    if (normalized === 'improving') return 'positive';
    if (normalized === 'critical' || normalized === 'warning') return 'negative';
    if (trend === 'up') return 'positive';
    if (trend === 'down') return 'negative';
    return 'neutral';
}

function normalizeLeadingIndicator(indicator: any, index: number): LeadingIndicator {
    const trend = normalizeDirection(indicator?.trend);
    return {
        id: indicator?.id || indicator?.metric || `indicator-${index}`,
        name: indicator?.label || indicator?.name || indicator?.metric || 'Unknown signal',
        label: indicator?.label || indicator?.name || indicator?.metric || 'Unknown signal',
        value: Number(indicator?.value || 0),
        unit: indicator?.unit || '',
        variance_from_baseline: indicator?.variance_from_baseline,
        clinical_significance: indicator?.clinical_significance,
        trend,
        status: indicator?.status,
        impact: normalizeImpact(indicator?.impact || indicator?.status, trend),
        delta_7d: typeof indicator?.delta_7d === 'number' ? indicator.delta_7d : undefined,
        delta_30d: typeof indicator?.delta_30d === 'number' ? indicator.delta_30d : undefined,
    };
}

export async function getDHT(personId: string): Promise<DHTResponse | null> {
    return dhtFetch<DHTResponse>(`/${personId}`);
}

export async function getRiskCards(personId: string): Promise<{ risk_cards: RiskCard[] } | null> {
    const response = await dhtFetch<{ risk_cards: any[] }>(`/${personId}/risk-cards`);
    if (!response) return null;
    return {
        ...response,
        risk_cards: Array.isArray(response.risk_cards) ? response.risk_cards.map(normalizeRiskCard) : [],
    };
}

export async function getLeadingIndicators(personId: string): Promise<{ indicators: LeadingIndicator[] } | null> {
    const response = await dhtFetch<{ indicators: any[] }>(`/${personId}/leading-indicators`);
    if (!response) return null;
    return {
        ...response,
        indicators: Array.isArray(response.indicators)
            ? response.indicators.map((indicator, index) => normalizeLeadingIndicator(indicator, index))
            : [],
    };
}

export async function getNextBestMeasurement(personId: string): Promise<{ next_best: NextBestMeasurement } | null> {
    return dhtFetch<{ next_best: NextBestMeasurement }>(`/${personId}/next-best-measurement`);
}

export async function getOcean(personId: string): Promise<{ latest: OceanMetrics } | null> {
    return dhtFetch<{ latest: OceanMetrics }>(`/ocean/${personId}`);
}

export async function getBehavioralModifiers(personId: string): Promise<BehavioralModifiersResponse | null> {
    const response = await dhtFetch<any>(`/ocean/${personId}/behavioral-modifiers`);
    if (!response) return null;
    return {
        ...response,
        modifiers: response?.modifiers || null,
    };
}

export async function getFamilyDHTMap(familyId: string): Promise<FamilyDHTMap | null> {
    return dhtFetch<FamilyDHTMap>(`/family/${familyId}/map`);
}

export async function observeDataPoint(personId: string, metric: string, value: number, unit: string, category: string = 'vital'): Promise<boolean | null> {
    return dhtFetch<boolean>('/observe', {
        method: 'POST',
        body: JSON.stringify({ person_id: personId, metric, value, unit, category }),
    });
}

export async function logUserEvent(personId: string, type: string, severity: string = 'moderate', note?: string): Promise<boolean | null> {
    return dhtFetch<boolean>('/event', {
        method: 'POST',
        body: JSON.stringify({ person_id: personId, type, severity, note }),
    });
}

export function subscribeToDHTStream(personId: string, onUpdate: (payload: any) => void): () => void {
    const wsBase = BASE.replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsBase}/api/v1/dht/stream/${personId}`);
    ws.onmessage = (e) => {
        try { onUpdate(JSON.parse(e.data)); } catch { }
    };
    return () => ws.close();
}
