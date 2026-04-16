/**
 * TrinitySynapsePanel
 * ===================
 * Cross-Saint insight card that surfaces Joseph × Raphael × Gabriel
 * data through the Trinity Synapse backend service.
 *
 * Can be embedded in any Saint's dashboard as a standalone card.
 * Shows: ancestry risk context, live family trends, personality profile match,
 * financial health correlation, and contagion alerts.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    GitBranch, Heart, Wallet, AlertTriangle, Sparkles,
    TrendingUp, TrendingDown, Minus, RefreshCw, ChevronDown, ChevronUp,
    Brain, Users, Shield
} from 'lucide-react';
import { requestBackendJson } from '../../lib/backend-request';

interface AncestryInsight {
    member_id: string;
    ancestry_risk_score: number;
    ancestry_risk_level: string;
    active_hereditary_conditions: Array<{
        condition: string;
        description: string;
        risk_weight: number;
    }>;
}

interface FinancialInsight {
    health_spend_monthly: number;
    financial_stress_level: string;
    health_investment_roi: string | null;
    emergency_status: string;
    emergency_alert: string | null;
    financial_stress_alert: string | null;
    hrv_trend: string;
    sleep_trend: string;
}

interface ContagionAlert {
    type: string;
    severity: string;
    source: string;
    at_risk_members: string[];
    message: string;
}

interface TrinityInsights {
    ancestry: AncestryInsight | null;
    financial: FinancialInsight | null;
    contagion_alerts: ContagionAlert[];
    personality_note: string | null;
}

interface Props {
    memberId?: string;
    birthYear?: number;
    oceanScores?: Record<string, number>;
    metricsHistory?: unknown[];
    familyMembers?: unknown[];
    budgetEnvelopes?: unknown[];
    healthRiskScore?: number;
    saint?: 'joseph' | 'raphael' | 'gabriel';
    compact?: boolean;
}

const RISK_COLORS: Record<string, string> = {
    low: '#10b981',
    moderate: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626',
};

const _TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'rising' || trend === 'falling')
        return trend === 'rising'
            ? <TrendingUp className="w-3.5 h-3.5" />
            : <TrendingDown className="w-3.5 h-3.5" />;
    return <Minus className="w-3.5 h-3.5" />;
};

export default function TrinitySynapsePanel({
    memberId,
    birthYear,
    oceanScores,
    metricsHistory = [],
    familyMembers = [],
    budgetEnvelopes = [],
    healthRiskScore = 50,
    saint = 'raphael',
    compact = false,
}: Props) {
    const [insights, setInsights] = useState<TrinityInsights>({
        ancestry: null,
        financial: null,
        contagion_alerts: [],
        personality_note: null,
    });
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(!compact);
    const [error, setError] = useState<string | null>(null);

    const ACCENT: Record<string, { color: string; bg: string; border: string }> = {
        joseph: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        raphael: { color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
        gabriel: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    };
    const accent = ACCENT[saint];

    const loadInsights = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const results: TrinityInsights = {
                ancestry: null,
                financial: null,
                contagion_alerts: [],
                personality_note: null,
            };

            const post = <T,>(action: string, body: object) =>
                requestBackendJson<T>(
                    '/api/v1/trinity/synapse',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action, ...body }),
                    },
                    `Failed to load Trinity Synapse ${action} insight.`,
                );

            const tasks: Promise<void>[] = [];

            // 1. Ancestry priors
            if (memberId && familyMembers.length > 0) {
                tasks.push(
                    post('ancestry_priors', {
                        member_id: memberId,
                        birth_year: birthYear,
                        metrics_history: metricsHistory,
                        family_members: familyMembers,
                    })
                        .then(d => { if (d) results.ancestry = d; })
                        .catch((err) => console.error('[TrinitySynapsePanel]', err))
                );
            }

            // 2. Financial bridge
            if (budgetEnvelopes.length > 0 || healthRiskScore) {
                tasks.push(
                    post('financial_bridge', {
                        member_id: memberId || 'user',
                        budget_envelopes: budgetEnvelopes,
                        metrics_history: metricsHistory,
                        net_worth: 0,
                        health_risk_score: healthRiskScore,
                    })
                        .then(d => { if (d) results.financial = d; })
                        .catch((err) => console.error('[TrinitySynapsePanel]', err))
                );
            }

            // 3. Contagion alerts (if family members present)
            if (familyMembers.length > 1) {
                tasks.push(
                    post('contagion', {
                        family_members: familyMembers,
                        relationships: [],
                        metrics_by_member: {},
                    })
                        .then(d => {
                            if (d?.household_alerts) results.contagion_alerts = d.household_alerts;
                        })
                        .catch((err) => console.error('[TrinitySynapsePanel]', err))
                );
            }

            // 4. Personality interventions note
            if (oceanScores && Object.keys(oceanScores).length > 0) {
                tasks.push(
                    post('personality_rx', {
                        ocean_scores: oceanScores,
                        biometrics: {},
                        base_recommendations: [],
                    })
                        .then(d => {
                            if (d?.personality_note) results.personality_note = d.personality_note;
                        })
                        .catch((err) => console.error('[TrinitySynapsePanel]', err))
                );
            }

            await Promise.all(tasks);
            setInsights(results);
        } catch (_err) {
            setError('Trinity Synapse offline — insights unavailable');
        }
        setLoading(false);
    }, [memberId, birthYear, metricsHistory, familyMembers, budgetEnvelopes, healthRiskScore, oceanScores]);

    useEffect(() => { loadInsights(); }, [loadInsights]);

    const hasContent =
        insights.ancestry || insights.financial ||
        insights.contagion_alerts.length > 0 || insights.personality_note;

    if (loading) {
        return (
            <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-4 animate-pulse">
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <Sparkles className="w-4 h-4" />
                    Trinity Synapse connecting Saints…
                </div>
            </div>
        );
    }

    if (error || !hasContent) {
        return null;  // Fail silently — this panel is additive, not critical
    }

    return (
        <div className={`rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border ${accent.border} shadow-lg`}>
            {/* Header */}
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between p-4"
                id="trinity-synapse-toggle"
            >
                <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg ${accent.bg} flex items-center justify-center`}>
                        <Sparkles className={`w-4 h-4 ${accent.color}`} />
                    </div>
                    <span className="text-sm font-semibold text-white">Trinity Insights</span>
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                        Joseph × Raphael × Gabriel
                    </span>
                    {insights.contagion_alerts.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/20">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {insights.contagion_alerts.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={e => { e.stopPropagation(); loadInsights(); }}
                        className="p-1 rounded text-slate-600 hover:text-slate-400 transition-colors"
                    >
                        <RefreshCw className="w-3 h-3" />
                    </button>
                    {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-3">

                    {/* Ancestry Risk (Joseph → Raphael) */}
                    {insights.ancestry && insights.ancestry.active_hereditary_conditions.length > 0 && (
                        <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <GitBranch className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-xs font-semibold text-amber-300">Hereditary Context</span>
                                <span
                                    className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded"
                                    style={{ color: RISK_COLORS[insights.ancestry.ancestry_risk_level] }}
                                >
                                    {insights.ancestry.ancestry_risk_level.toUpperCase()} ancestry risk
                                </span>
                            </div>
                            <div className="space-y-1">
                                {insights.ancestry.active_hereditary_conditions.slice(0, compact ? 1 : 3).map((c, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60 mt-1.5 flex-shrink-0" />
                                        <span>{c.description}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Financial Health Bridge (Gabriel) */}
                    {insights.financial && (
                        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-xs font-semibold text-emerald-300">Financial × Health</span>
                                {insights.financial.health_spend_monthly > 0 && (
                                    <span className="ml-auto text-[10px] text-emerald-400 font-medium">
                                        ${insights.financial.health_spend_monthly.toFixed(0)}/mo health spend
                                    </span>
                                )}
                            </div>
                            {insights.financial.health_investment_roi && (
                                <p className="text-xs text-slate-400 mb-1.5">{insights.financial.health_investment_roi}</p>
                            )}
                            <div className="flex items-center gap-3 text-[10px]">
                                <div className="flex items-center gap-1">
                                    <Heart className="w-3 h-3 text-slate-500" />
                                    <span className="text-slate-500">HRV:</span>
                                    <span className={insights.financial.hrv_trend === 'falling' ? 'text-rose-400' : insights.financial.hrv_trend === 'rising' ? 'text-emerald-400' : 'text-slate-400'}>
                                        {insights.financial.hrv_trend}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-slate-500">Emergency:</span>
                                    <span className={insights.financial.emergency_status === 'strong' ? 'text-emerald-400' : insights.financial.emergency_status === 'insufficient' ? 'text-rose-400' : 'text-amber-400'}>
                                        {insights.financial.emergency_status}
                                    </span>
                                </div>
                            </div>
                            {(insights.financial.emergency_alert || insights.financial.financial_stress_alert) && (
                                <div className="mt-2 text-[10px] text-rose-400/80 bg-rose-500/5 rounded-lg p-2 border border-rose-500/10">
                                    {insights.financial.emergency_alert || insights.financial.financial_stress_alert}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Contagion Alerts (Joseph → ContagionEngine) */}
                    {insights.contagion_alerts.length > 0 && (
                        <div className="rounded-xl bg-rose-500/5 border border-rose-500/10 p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="w-3.5 h-3.5 text-rose-400" />
                                <span className="text-xs font-semibold text-rose-300">Household Alerts</span>
                            </div>
                            {insights.contagion_alerts.slice(0, 2).map((alert, i) => (
                                <div key={i} className="text-xs text-slate-400 mb-1">{alert.message}</div>
                            ))}
                        </div>
                    )}

                    {/* Personality Profile (Joseph → BehavioralForecaster) */}
                    {insights.personality_note && !compact && (
                        <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/10 p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-xs font-semibold text-indigo-300">Personality Context</span>
                            </div>
                            <p className="text-xs text-slate-400">{insights.personality_note}</p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                        <Shield className="w-3 h-3 text-slate-600" />
                        <span className="text-[9px] text-slate-600">
                            Powered by Trinity Synapse · Joseph × Raphael × Gabriel
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
