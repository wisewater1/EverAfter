/**
 * Live, per-user signals behind the Trinity Dashboard.
 *
 * The Family Vitality Score and its component bars must reflect the signed-in
 * user's real records, not fixtures. This module gathers those records from
 * the stores each Saint actually writes to:
 *
 *   St. Raphael  -> public.health_metrics (recent vitals)
 *   St. Gabriel  -> the finance budget API (with its local cache)
 *   St. Anthony  -> public.daily_question_responses (guidance engagement)
 *   St. Michael  -> public.emergency_contacts + public.vault_items counts
 *                   (the protection/access layer around the other three)
 *
 * Demo sessions return null so the seeded sample family drives the demo
 * experience instead. Results are cached for two minutes and refreshed in
 * the background; listeners get 'everafter:trinity-signals-updated'.
 */

import { supabase } from '../supabase';
import { isDemoAuthEnabled } from '../demo-auth';
import { financeApi, type BudgetEnvelope } from '../gabriel/finance';

export interface LiveHealthSignals {
    restingHr: number | null;
    steps: number | null;
    sleepEfficiency: number | null;
    hrv: number | null;
    metricCount: number;
    lastRecordedAt: string | null;
}

export interface LiveFinanceSignals {
    envelopes: Array<{ category_name: string; assigned: number; available: number }>;
    totalAssigned: number;
    overspentEnvelopes: number;
    healthBudget: number;
    elderBudget: number;
    source: 'live' | 'none';
}

export interface LiveTrinitySignals {
    userId: string;
    health: LiveHealthSignals;
    finance: LiveFinanceSignals;
    engagement: { responses30d: number; totalResponses: number };
    protection: { emergencyContacts: number; vaultItems: number };
    fetchedAt: number;
}

const EMPTY_FINANCE: LiveFinanceSignals = {
    envelopes: [],
    totalAssigned: 0,
    overspentEnvelopes: 0,
    healthBudget: 0,
    elderBudget: 0,
    source: 'none',
};

let cache: LiveTrinitySignals | null = null;
let inflight: Promise<LiveTrinitySignals | null> | null = null;

export function getCachedTrinitySignals(): LiveTrinitySignals | null {
    return cache;
}

function average(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((s, v) => s + v, 0) / values.length;
}

/** 0-100 wellness from real vitals; null when no live metrics exist. */
export function wellnessFromLiveHealth(health: LiveHealthSignals): number | null {
    const parts: number[] = [];
    if (health.restingHr !== null) {
        parts.push(Math.max(30, Math.min(98, 100 - (health.restingHr - 55) * 2.2)));
    }
    if (health.steps !== null) {
        parts.push(Math.max(20, Math.min(100, (health.steps / 9000) * 100)));
    }
    if (health.sleepEfficiency !== null) {
        parts.push(Math.max(20, Math.min(100, ((health.sleepEfficiency - 60) / 32) * 100)));
    }
    if (health.hrv !== null) {
        parts.push(Math.max(20, Math.min(100, (health.hrv / 65) * 100)));
    }
    const avg = average(parts);
    return avg === null ? null : Math.round(avg);
}

async function loadFinanceSignals(): Promise<LiveFinanceSignals> {
    try {
        const cached = financeApi.getCachedBudget();
        const budget: BudgetEnvelope[] = cached.length > 0
            ? cached
            : await Promise.race<BudgetEnvelope[]>([
                financeApi.getBudget(),
                new Promise<BudgetEnvelope[]>((_, reject) =>
                    setTimeout(() => reject(new Error('finance budget timeout')), 4000),
                ),
            ]);
        if (!budget || budget.length === 0) return EMPTY_FINANCE;
        const envelopes = budget.map((env) => ({
            category_name: String(env.category_name || ''),
            assigned: Number(env.assigned || 0),
            available: Number(env.available || 0),
        }));
        const totalAssigned = envelopes.reduce((s, e) => s + e.assigned, 0);
        return {
            envelopes,
            totalAssigned,
            overspentEnvelopes: envelopes.filter((e) => e.available < 0).length,
            healthBudget: envelopes
                .filter((e) => /health|medical|wellness|pharmacy|therapy/i.test(e.category_name))
                .reduce((s, e) => s + e.assigned, 0),
            elderBudget: envelopes
                .filter((e) => /elder|senior|care|parent/i.test(e.category_name))
                .reduce((s, e) => s + e.assigned, 0),
            source: 'live',
        };
    } catch {
        return EMPTY_FINANCE;
    }
}

export async function refreshTrinitySignals(force = false): Promise<LiveTrinitySignals | null> {
    if (!supabase || isDemoAuthEnabled()) return null;
    if (cache && !force && Date.now() - cache.fetchedAt < 120_000) return cache;
    if (inflight) return inflight;

    inflight = (async (): Promise<LiveTrinitySignals | null> => {
        try {
            const { data: sess } = await supabase!.auth.getSession();
            const userId = sess.session?.user?.id;
            if (!userId) return null;

            const since14d = new Date(Date.now() - 14 * 86_400_000).toISOString();
            const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString();

            const [metricsRes, totalRes, recentRes, contactsRes, vaultRes, finance] = await Promise.all([
                supabase!
                    .from('health_metrics')
                    .select('metric_type, metric_value, recorded_at')
                    .eq('user_id', userId)
                    .gte('recorded_at', since14d)
                    .order('recorded_at', { ascending: false })
                    .limit(500),
                supabase!.from('daily_question_responses').select('id', { count: 'exact', head: true }).eq('user_id', userId),
                supabase!
                    .from('daily_question_responses')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .gte('created_at', since30d),
                supabase!.from('emergency_contacts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
                supabase!.from('vault_items').select('id', { count: 'exact', head: true }).eq('user_id', userId),
                loadFinanceSignals(),
            ]);

            const byType = new Map<string, number[]>();
            let lastRecordedAt: string | null = null;
            for (const row of metricsRes.data || []) {
                const type = String((row as { metric_type: string }).metric_type || '');
                const value = Number((row as { metric_value: number }).metric_value);
                if (!Number.isFinite(value)) continue;
                if (!byType.has(type)) byType.set(type, []);
                byType.get(type)!.push(value);
                const at = String((row as { recorded_at: string }).recorded_at || '');
                if (at && (!lastRecordedAt || at > lastRecordedAt)) lastRecordedAt = at;
            }
            const avgOf = (...types: string[]): number | null => {
                for (const t of types) {
                    const avg = average(byType.get(t) || []);
                    if (avg !== null) return avg;
                }
                return null;
            };

            const signals: LiveTrinitySignals = {
                userId,
                health: {
                    restingHr: avgOf('resting_hr', 'resting_heart_rate', 'heart_rate'),
                    steps: avgOf('steps'),
                    sleepEfficiency: avgOf('sleep_efficiency', 'sleep_score'),
                    hrv: avgOf('hrv'),
                    metricCount: (metricsRes.data || []).length,
                    lastRecordedAt,
                },
                finance,
                engagement: {
                    responses30d: recentRes.count || 0,
                    totalResponses: totalRes.count || 0,
                },
                protection: {
                    emergencyContacts: contactsRes.count || 0,
                    vaultItems: vaultRes.count || 0,
                },
                fetchedAt: Date.now(),
            };
            cache = signals;
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('everafter:trinity-signals-updated'));
            }
            return signals;
        } catch (error) {
            console.warn('Trinity live signals refresh failed', error);
            return cache;
        } finally {
            inflight = null;
        }
    })();

    return inflight;
}
