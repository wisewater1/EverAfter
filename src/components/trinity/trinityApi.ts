/**
 * Trinity API helper — shared fetch wrapper for all Trinity Synapse actions.
 */
import { API_BASE_URL } from '../../lib/env';

const BASE = import.meta.env.VITE_API_BASE_URL || `${API_BASE_URL}`;

export async function trinitySynapse<T = any>(action: string, body: Record<string, any> = {}): Promise<T | null> {
    try {
        const res = await fetch(`${BASE}/api/v1/trinity/synapse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...body }),
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}
