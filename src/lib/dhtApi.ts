/**
 * DHT API helper — shared fetch wrapper for Delphi Health Trajectory endpoints.
 */
import { API_BASE_URL } from './env';
import type { DelphiTrajectory } from '../types/database.types';

const BASE = import.meta.env.VITE_API_BASE_URL || API_BASE_URL;

export interface RiskCard {
    id: string;
    condition: string;
    domain: string;
    current_level: string;
    direction: 'up' | 'down' | 'stable';
    delta_30d: string;
    confidence: number;
    what_moved_it?: string[];
    suggested_action?: string;
}

export interface LeadingIndicator {
    id: string;
    name: string;
    value: number;
    unit: string;
    variance_from_baseline: number;
    clinical_significance?: string;
    trend?: 'up' | 'down' | 'stable';
    status?: 'improving' | 'warning' | 'critical' | 'stable';
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
    adherence_risk: number;
    nudge_frequency: string;
    modifiers: Array<{
        trait: string;
        modifier_value: number;
        impact_area: string;
        description?: string;
    }>;
}

export interface FamilyDHTMap {
    nodes: Array<{ id: string; dht_score: number; name?: string }>;
    edges: Array<{ from_id: string; to_id: string; genetic_weight: number }>;
}

async function dhtFetch<T = any>(path: string, options?: RequestInit): Promise<T | null> {
    try {
        const res = await fetch(`${BASE}/api/v1/dht${path}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

export async function getDHT(personId: string): Promise<DelphiTrajectory | null> {
    return dhtFetch<DelphiTrajectory>(`/${personId}`);
}

export async function getRiskCards(personId: string): Promise<{ risk_cards: RiskCard[] } | null> {
    return dhtFetch<{ risk_cards: RiskCard[] }>(`/${personId}/risk-cards`);
}

export async function getLeadingIndicators(personId: string): Promise<{ indicators: LeadingIndicator[] } | null> {
    return dhtFetch<{ indicators: LeadingIndicator[] }>(`/${personId}/leading-indicators`);
}

export async function getNextBestMeasurement(personId: string): Promise<{ next_best: NextBestMeasurement } | null> {
    return dhtFetch<{ next_best: NextBestMeasurement }>(`/${personId}/next-best-measurement`);
}

export async function getOcean(personId: string): Promise<{ latest: OceanMetrics } | null> {
    return dhtFetch<{ latest: OceanMetrics }>(`/ocean/${personId}`);
}

export async function getBehavioralModifiers(personId: string): Promise<BehavioralModifier | null> {
    return dhtFetch<BehavioralModifier>(`/ocean/${personId}/behavioral-modifiers`);
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
