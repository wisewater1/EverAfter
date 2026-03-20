/**
 * GenerationalTimeline
 * ====================
 * 4-generation horizontal timeline combining:
 * - Joseph layer: genealogy events (birth, death, conditions, milestones)
 * - Raphael layer: live biometrics for living members
 * - Gabriel layer: generational net worth / wealth trend
 *
 * Called via POST /api/v1/trinity/synapse { action: "timeline" }
 */

import { useState, useEffect } from 'react';
import {
    GitBranch, Heart, Wallet, Activity, TrendingUp,
    TrendingDown, Minus, Loader2, AlertCircle
} from 'lucide-react';
import { requestBackendJson } from '../../lib/backend-request';

interface GenMember {
    member_id: string;
    name: string;
    generation: number;
    birth_year: number | null;
    death_year: number | null;
    current_age: number | null;
    is_living: boolean;
    conditions: string[];
    occupation: string | null;
    health: {
        wellness_score: number;
        risk_level: string;
        trend: string;
        trend_arrow: string;
        colour: string;
    } | null;
}

interface Generation {
    generation: number;
    generation_label: string;
    members: GenMember[];
}

interface TimelineData {
    timeline: Generation[];
    wealth_trend: {
        current: number;
        direction: string;
        percent_change: number;
    } | null;
    total_members: number;
    living_members: number;
}

interface Props {
    familyMembers?: any[];
    liveHeatmap?: any[];
    netWorthHistory?: any[];
}

const RISK_COLORS: Record<string, string> = {
    low: '#10b981',
    moderate: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626',
};

const GENERATION_ACCENT: Record<number, { bg: string; border: string; text: string }> = {
    [-3]: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-300' },
    [-2]: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-300' },
    [-1]: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-300' },
    [0]: { bg: 'bg-teal-500/10', border: 'border-teal-500/20', text: 'text-teal-300' },
    [1]: { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-300' },
    [2]: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-300' },
};

const DEFAULT_ACCENT = { bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-300' };

export default function GenerationalTimeline({ familyMembers = [], liveHeatmap, netWorthHistory }: Props) {
    const [data, setData] = useState<TimelineData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (familyMembers.length === 0) {
            setLoading(false);
            return;
        }
        loadTimeline();
    }, [familyMembers.length]);

    async function loadTimeline() {
        setLoading(true);
        setError(null);
        try {
            const result = await requestBackendJson<TimelineData>(
                '/api/v1/trinity/synapse',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'timeline',
                        family_members: familyMembers,
                        live_heatmap: liveHeatmap,
                        net_worth_history: netWorthHistory,
                    }),
                },
                'Failed to load generational timeline.',
            );
            setData(result);
        } catch (err: any) {
            setError('Generational timeline unavailable');
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Building generational timeline…
            </div>
        );
    }

    if (error || !data || data.timeline.length === 0) {
        return null;
    }

    return (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5 shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-white">Generational Timeline</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-slate-500">
                    <span>{data.total_members} members · {data.living_members} living</span>
                    {data.wealth_trend && (
                        <div className="flex items-center gap-1">
                            <Wallet className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">
                                {data.wealth_trend.direction === 'rising' ? '↑' : data.wealth_trend.direction === 'falling' ? '↓' : '→'}
                                {' '}{Math.abs(data.wealth_trend.percent_change)}% wealth
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Layer legend */}
            <div className="flex items-center gap-4 mb-4 pb-3 border-b border-white/5">
                {[
                    { icon: GitBranch, color: 'text-amber-400', label: 'Joseph (genealogy)' },
                    { icon: Activity, color: 'text-teal-400', label: 'Raphael (live health)' },
                    { icon: Wallet, color: 'text-emerald-400', label: 'Gabriel (wealth)' },
                ].map(({ icon: Icon, color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                        <Icon className={`w-3 h-3 ${color}`} />
                        <span className="text-[10px] text-slate-500">{label}</span>
                    </div>
                ))}
            </div>

            {/* Timeline generations */}
            <div className="space-y-4">
                {data.timeline.map(gen => {
                    const acc = GENERATION_ACCENT[gen.generation] || DEFAULT_ACCENT;
                    return (
                        <div key={gen.generation}>
                            {/* Generation label */}
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${acc.bg} border ${acc.border} mb-2`}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${acc.text}`}>
                                    {gen.generation_label}
                                </span>
                            </div>

                            {/* Members row */}
                            <div className="flex flex-wrap gap-2">
                                {gen.members.map(member => (
                                    <div
                                        key={member.member_id}
                                        className={`flex flex-col p-3 rounded-xl bg-white/[0.02] border ${member.is_living ? 'border-white/8' : 'border-white/[0.03]'} min-w-[140px] max-w-[180px]`}
                                    >
                                        {/* Joseph layer — Name + dates */}
                                        <div className="flex items-start justify-between mb-1.5">
                                            <div>
                                                <p className={`text-xs font-medium ${member.is_living ? 'text-white' : 'text-slate-500'}`}>
                                                    {member.name}
                                                    {!member.is_living && <span className="ml-1 text-slate-600">†</span>}
                                                </p>
                                                <p className="text-[10px] text-slate-600">
                                                    {member.birth_year}
                                                    {member.death_year ? ` – ${member.death_year}` : member.current_age ? ` · ${member.current_age}y` : ''}
                                                </p>
                                            </div>
                                            {member.occupation && (
                                                <span className="text-[8px] px-1 py-0.5 bg-amber-500/10 text-amber-400/70 rounded border border-amber-500/10 shrink-0">
                                                    {member.occupation.slice(0, 8)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Known conditions (Joseph layer) */}
                                        {member.conditions.length > 0 && (
                                            <div className="flex flex-wrap gap-0.5 mb-1.5">
                                                {member.conditions.slice(0, 2).map((c, i) => (
                                                    <span key={i} className="text-[8px] px-1 py-0.5 bg-rose-500/10 text-rose-400/70 rounded border border-rose-500/10">
                                                        {c.length > 12 ? c.slice(0, 10) + '…' : c}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Raphael layer — live health */}
                                        {member.health && (
                                            <div className="flex items-center gap-1.5 mt-auto pt-1.5 border-t border-white/5">
                                                <div
                                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: member.health.colour }}
                                                />
                                                <span className="text-[10px] text-slate-400">
                                                    {member.health.wellness_score.toFixed(0)}/100
                                                </span>
                                                <span className="text-[10px] text-slate-500 ml-auto">
                                                    {member.health.trend_arrow}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Generation separator bar (visual timeline line) */}
                            {data.timeline.indexOf(gen) < data.timeline.length - 1 && (
                                <div className="ml-3 mt-3 h-px w-12 bg-white/5" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Gabriel layer — wealth trend footer */}
            {data.wealth_trend && (
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs text-slate-400 font-medium">Generational Wealth</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-white font-medium">
                            ${data.wealth_trend.current.toLocaleString()}
                        </span>
                        <span className={
                            data.wealth_trend.direction === 'rising' ? 'text-emerald-400'
                                : data.wealth_trend.direction === 'falling' ? 'text-rose-400'
                                    : 'text-slate-500'
                        }>
                            {data.wealth_trend.direction === 'rising' ? <TrendingUp className="w-3.5 h-3.5" />
                                : data.wealth_trend.direction === 'falling' ? <TrendingDown className="w-3.5 h-3.5" />
                                    : <Minus className="w-3.5 h-3.5" />}
                        </span>
                        <span className="text-slate-500 text-[10px]">
                            {data.wealth_trend.percent_change > 0 ? '+' : ''}{data.wealth_trend.percent_change}%
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
