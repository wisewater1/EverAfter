/**
 * DHT API helper — shared fetch wrapper for Delphi Health Trajectory endpoints.
 */
import { API_BASE_URL } from '../../lib/env';

const BASE = import.meta.env.VITE_API_BASE_URL || API_BASE_URL;

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

export async function getDHT(personId: string): Promise<any | null> {
    return dhtFetch(`/${personId}`);
}

export async function getRiskCards(personId: string): Promise<any | null> {
    return dhtFetch(`/${personId}/risk-cards`);
}

export async function getLeadingIndicators(personId: string): Promise<any | null> {
    return dhtFetch(`/${personId}/leading-indicators`);
}

export async function getNextBestMeasurement(personId: string): Promise<any | null> {
    return dhtFetch(`/${personId}/next-best-measurement`);
}

export async function getOcean(personId: string): Promise<any | null> {
    return dhtFetch(`/ocean/${personId}`);
}

export async function getBehavioralModifiers(personId: string): Promise<any | null> {
    return dhtFetch(`/ocean/${personId}/behavioral-modifiers`);
}

export async function getFamilyDHTMap(familyId: string): Promise<any | null> {
    return dhtFetch(`/family/${familyId}/map`);
}

export async function observeDataPoint(personId: string, metric: string, value: number, unit: string, category: string = 'vital'): Promise<any | null> {
    return dhtFetch('/observe', {
        method: 'POST',
        body: JSON.stringify({ person_id: personId, metric, value, unit, category }),
    });
}

export async function logUserEvent(personId: string, type: string, severity: string = 'moderate', note?: string): Promise<any | null> {
    return dhtFetch('/event', {
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
