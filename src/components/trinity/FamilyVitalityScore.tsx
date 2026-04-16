/**
 * FamilyVitalityScore — Option 3
 * Composite 0-100 score across Joseph + Raphael + Gabriel.
 */
import { useState, useEffect } from 'react';
import { Shield, GitBranch, Heart, Wallet, RefreshCw, Loader2 } from 'lucide-react';
import { trinitySynapse } from './trinityApi';

export default function FamilyVitalityScore() {
    const [data, setData] = useState<unknown>(null);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        const d = await trinitySynapse('family_vitality', {});
        setData(d);
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    if (loading) return <div className="flex items-center gap-2 text-xs text-slate-500 p-4"><Loader2 className="w-4 h-4 animate-spin" />Computing Family Vitality…</div>;
    if (!data) return null;

    const score = data.vitality_score || 0;
    const breakdown = data.breakdown || {};
    const circumference = 2 * Math.PI * 60;
    const offset = circumference - (score / 100) * circumference;
    const scoreColor = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';

    return (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-6">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-white">Family Vitality Score</span>
                </div>
                <button onClick={load} className="p-1 text-slate-600 hover:text-slate-400"><RefreshCw className="w-3.5 h-3.5" /></button>
            </div>

            <div className="flex items-center gap-8">
                {/* Circular gauge */}
                <div className="relative w-36 h-36">
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
                <div className="flex-1 space-y-3">
                    {[
                        { key: 'joseph', icon: GitBranch, color: '#f59e0b', label: breakdown.joseph?.label || 'Generational Health' },
                        { key: 'raphael', icon: Heart, color: '#14b8a6', label: breakdown.raphael?.label || 'Current Wellness' },
                        { key: 'gabriel', icon: Wallet, color: '#10b981', label: breakdown.gabriel?.label || 'Financial Health' },
                    ].map(({ key, icon: Icon, color, label }) => {
                        const s = breakdown[key] || { score: 0, weight: 0 };
                        return (
                            <div key={key}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <Icon className="w-3 h-3" style={{ color }} />
                                        <span className="text-[10px] text-slate-400">{label}</span>
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
                <div className="grid grid-cols-4 gap-3 mt-4 pt-3 border-t border-white/5">
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
        </div>
    );
}
