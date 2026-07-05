/**
 * FamilyVitalityScore
 * Composite 0-100 score across the three contributing Saints, computed live
 * from the signed-in user's real records:
 *   Family continuity   -> St. Joseph (family tree) + St. Anthony (guidance)
 *   Recovery/resilience -> St. Raphael (health metrics)
 *   Financial readiness -> St. Gabriel (budget)
 * St. Michael governs the access layer around all three (shown as a footer)
 * rather than contributing his own bar.
 */
import { useState, useEffect } from 'react';
import { Shield, GitBranch, Heart, Wallet, RefreshCw, Loader2, Lock } from 'lucide-react';
import { trinitySynapse } from './trinityApi';
import { refreshTrinitySignals } from '../../lib/trinity/liveSignals';

interface VitalityBar {
    label: string;
    score: number;
    weight: number;
    source?: string;
}

interface VitalityData {
    vitality_score: number;
    breakdown?: Record<string, VitalityBar>;
    data_source?: { family?: string; recovery?: string; financial?: string };
    access_layer?: { steward: string; label: string; emergency_contacts?: number; vault_items?: number } | null;
    insights?: {
        condition_density?: number;
        savings_rate?: number;
        emergency_months?: number;
        overspent_envelopes?: number;
    };
}

// Map each bar to its data_source key so the UI can show whether the number
// is measured from live records or estimated from the family model.
const BAR_SOURCE_KEY: Record<string, keyof NonNullable<VitalityData['data_source']>> = {
    joseph: 'family',
    raphael: 'recovery',
    gabriel: 'financial',
};

export default function FamilyVitalityScore() {
    const [data, setData] = useState<VitalityData | null>(null);
    const [loading, setLoading] = useState(true);

    async function load(force = false) {
        setLoading(true);
        // Warm the live per-user signals first so the score reflects real
        // health, finance, family, and guidance data rather than the sample.
        await refreshTrinitySignals(force);
        const d = await trinitySynapse('family_vitality', {});
        setData(d);
        setLoading(false);
    }

    useEffect(() => {
        load();
        const onSignals = () => {
            void (async () => {
                const d = await trinitySynapse('family_vitality', {});
                setData(d);
            })();
        };
        window.addEventListener('everafter:trinity-signals-updated', onSignals);
        return () => window.removeEventListener('everafter:trinity-signals-updated', onSignals);
    }, []);

    if (loading && !data) return <div className="flex items-center gap-2 text-xs text-slate-500 p-4"><Loader2 className="w-4 h-4 animate-spin" />Computing Family Vitality...</div>;
    if (!data) return null;

    const score = data.vitality_score || 0;
    const breakdown = data.breakdown || {};
    const access = data.access_layer || null;
    const circumference = 2 * Math.PI * 60;
    const offset = circumference - (score / 100) * circumference;
    const scoreColor = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';

    return (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-6">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-white">Family Vitality Score</span>
                    {data.data_source && (() => {
                        const vals = Object.values(data.data_source);
                        const allLive = vals.length > 0 && vals.every((v) => v === 'live');
                        return (
                            <span
                                className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                                    allLive
                                        ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                                        : 'text-slate-400 border-slate-600/40 bg-slate-700/20'
                                }`}
                                title={allLive ? 'Computed from your live records' : 'Some components are estimated from the family model until live data is linked'}
                            >
                                {allLive ? 'Live' : 'Partly estimated'}
                            </span>
                        );
                    })()}
                </div>
                <button
                    onClick={() => load(true)}
                    aria-label="Recalculate Family Vitality Score"
                    className="p-2 -m-1 text-slate-600 hover:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 rounded-lg"
                >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
                {/* Circular gauge */}
                <div className="relative w-36 h-36 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                        <circle cx="70" cy="70" r="60" stroke="#1e293b" strokeWidth="10" fill="none" />
                        <circle cx="70" cy="70" r="60" stroke={scoreColor} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-white">{score.toFixed(0)}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Vitality</span>
                    </div>
                </div>

                {/* Breakdown */}
                <div className="flex-1 w-full space-y-3">
                    {[
                        { key: 'joseph', icon: GitBranch, color: '#f59e0b', label: breakdown.joseph?.label || 'Family continuity' },
                        { key: 'raphael', icon: Heart, color: '#14b8a6', label: breakdown.raphael?.label || 'Recovery and resilience' },
                        { key: 'gabriel', icon: Wallet, color: '#10b981', label: breakdown.gabriel?.label || 'Financial readiness' },
                    ].map(({ key, icon: Icon, color, label }) => {
                        const s = breakdown[key] || { score: 0, weight: 0 };
                        const srcKey = BAR_SOURCE_KEY[key];
                        const isLive = srcKey ? data.data_source?.[srcKey] === 'live' : false;
                        return (
                            <div key={key}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <Icon className="w-3 h-3" style={{ color }} />
                                        <span className="text-[10px] text-slate-400">{label}</span>
                                        {s.source && <span className="text-[9px] text-slate-600 hidden sm:inline">{s.source}</span>}
                                        <span className={`text-[9px] ${isLive ? 'text-emerald-400/80' : 'text-slate-500'}`}>
                                            {isLive ? 'live' : 'estimated'}
                                        </span>
                                    </div>
                                    <span className="text-xs font-medium text-white">{s.score?.toFixed(0)}/100 <span className="text-slate-600">({s.weight}%)</span></span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.score || 0}%`, backgroundColor: color }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Insights */}
            {data.insights && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-white/5">
                    {[
                        { label: 'Condition Density', value: data.insights.condition_density?.toFixed(1) || '0' },
                        { label: 'Savings Rate', value: `${data.insights.savings_rate?.toFixed(0) || 0}%` },
                        { label: 'Emergency Fund', value: `${data.insights.emergency_months?.toFixed(1) || 0}mo` },
                        { label: 'Overspent', value: data.insights.overspent_envelopes || 0 },
                    ].map(({ label, value }) => (
                        <div key={label} className="text-center">
                            <p className="text-xs font-medium text-white">{value}</p>
                            <p className="text-[9px] text-slate-500">{label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* St. Michael access layer footer */}
            {access && (
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-[10px] text-slate-500">
                    <Lock className="w-3 h-3 text-blue-400" />
                    <span className="text-slate-400">{access.steward}</span>
                    <span>guards access to every score above.</span>
                    {typeof access.vault_items === 'number' && (
                        <span className="ml-auto text-slate-600">
                            {access.vault_items} sealed {access.vault_items === 1 ? 'item' : 'items'}
                            {typeof access.emergency_contacts === 'number' ? `, ${access.emergency_contacts} trusted ${access.emergency_contacts === 1 ? 'contact' : 'contacts'}` : ''}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
