/**
 * CrossSaintWhatIf - Option 10
 * Simulate the impact of a life decision across all 3 Saints.
 */
import { useMemo, useState } from 'react';
import { Beaker, Heart, Wallet, GitBranch, Loader2, Play, Shield, Sparkles, Clock3, Users } from 'lucide-react';
import { getStoredTrinityWhatIfHistory, getTrinitySummarySnapshot, trinitySynapse } from './trinityApi';

const SCENARIOS = [
    { type: 'career', label: 'High-Stress Career Change', placeholder: 'e.g. Take a VP role at a startup', example: 'Take a VP role at a startup' },
    { type: 'relocation', label: 'Relocation', placeholder: 'e.g. Move to a new city for a job', example: 'Move to Austin for a new role and rebuild local routines' },
    { type: 'retirement', label: 'Retirement', placeholder: 'e.g. Retire at 58 and focus on health', example: 'Retire early and shift time into health, family, and elder care' },
    { type: 'default', label: 'Other', placeholder: 'Describe your scenario...', example: 'Take on a major life change while trying to protect recovery and family stability' },
];

export default function CrossSaintWhatIf() {
    const [scenarioType, setScenarioType] = useState('career');
    const [scenario, setScenario] = useState(SCENARIOS[0].example);
    const [months, setMonths] = useState(12);
    const [result, setResult] = useState<any>(() => getStoredTrinityWhatIfHistory()[0]?.result || null);
    const [history, setHistory] = useState(() => getStoredTrinityWhatIfHistory());
    const [loading, setLoading] = useState(false);

    const snapshot = useMemo(() => getTrinitySummarySnapshot(), []);
    const activeScenario = useMemo(
        () => SCENARIOS.find(item => item.type === scenarioType) || SCENARIOS[0],
        [scenarioType],
    );

    async function simulate() {
        if (!scenario.trim()) return;
        setLoading(true);
        const d = await trinitySynapse('cross_saint_whatif', {
            scenario,
            scenario_type: scenarioType,
            duration_months: months,
        });
        if (d) {
            setResult(d);
            setHistory(getStoredTrinityWhatIfHistory());
        }
        setLoading(false);
    }

    function applyScenario(type: string) {
        const next = SCENARIOS.find(item => item.type === type) || SCENARIOS[0];
        setScenarioType(next.type);
        setScenario(next.example);
    }

    const proj = result?.projections || {};

    return (
        <div className="space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Beaker className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-semibold text-white">Cross-Saint What-If</span>
                </div>

                <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                        {SCENARIOS.map(item => (
                            <button key={item.type} onClick={() => applyScenario(item.type)} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${scenarioType === item.type ? 'bg-violet-500/20 text-violet-400 border border-violet-500/20' : 'text-slate-500 hover:text-slate-300 border border-white/5'}`}>
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <input value={scenario} onChange={e => setScenario(e.target.value)} placeholder={activeScenario.placeholder} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/30" />
                    <div className="flex items-center gap-3">
                        <label className="text-[10px] text-slate-500">Duration:</label>
                        <select value={months} onChange={e => setMonths(Number(e.target.value))} className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white">
                            <option value={6}>6 months</option>
                            <option value={12}>12 months</option>
                            <option value={24}>24 months</option>
                        </select>
                        <button onClick={simulate} disabled={loading || !scenario.trim()} className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium hover:bg-violet-500/20 disabled:opacity-50">
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Simulate
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[10px] uppercase tracking-wider text-slate-500">Family System</span>
                    </div>
                    <p className="text-xl font-semibold text-white">{snapshot.livingMembers}</p>
                    <p className="text-[11px] text-slate-500">{snapshot.elderMembers} elder support lane{snapshot.elderMembers === 1 ? '' : 's'}</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-3.5 h-3.5 text-teal-400" />
                        <span className="text-[10px] uppercase tracking-wider text-slate-500">Vitality</span>
                    </div>
                    <p className="text-xl font-semibold text-white">{snapshot.vitalityScore}</p>
                    <p className="text-[11px] text-slate-500">cross-Saint baseline score</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] uppercase tracking-wider text-slate-500">Runway</span>
                    </div>
                    <p className="text-xl font-semibold text-white">{snapshot.emergencyFundMonths}mo</p>
                    <p className="text-[11px] text-slate-500">${Math.round(snapshot.projectedNetWorth).toLocaleString()} family net worth</p>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock3 className="w-3.5 h-3.5 text-violet-400" />
                        <span className="text-[10px] uppercase tracking-wider text-slate-500">Care Gap</span>
                    </div>
                    <p className="text-xl font-semibold text-white">${Math.round(snapshot.elderGap).toLocaleString()}</p>
                    <p className="text-[11px] text-slate-500">monthly elder-care exposure</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-4">
                <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-semibold text-white">What Trinity weighs</span>
                    </div>
                    <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-teal-500/5 border border-teal-500/10">
                            <p className="text-[10px] font-bold text-teal-300 uppercase tracking-wider mb-1">Raphael</p>
                            <p className="text-xs text-slate-400">Will the decision raise stress, reduce sleep, or make recovery rituals harder to maintain?</p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                            <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">Gabriel</p>
                            <p className="text-xs text-slate-400">Can the household absorb the downside with cash runway, health spend, and care coverage intact?</p>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                            <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">Joseph</p>
                            <p className="text-xs text-slate-400">Is there a family precedent for the change, and who in the lineage is affected by the choice?</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock3 className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-semibold text-white">Recent Simulations</span>
                    </div>
                    <div className="space-y-2">
                        {history.length === 0 && (
                            <p className="text-xs text-slate-500">Run one scenario and Trinity will keep the latest simulations here for comparison.</p>
                        )}
                        {history.map((entry, index) => (
                            <button
                                key={`${entry.scenario}-${entry.generated_at}-${index}`}
                                onClick={() => {
                                    setResult(entry.result);
                                    setScenario(entry.scenario);
                                    setScenarioType(entry.scenario_type);
                                    setMonths(entry.duration_months);
                                }}
                                className="w-full text-left p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
                            >
                                <div className="flex items-center justify-between gap-3 mb-1">
                                    <p className="text-xs font-medium text-white truncate">{entry.scenario}</p>
                                    <span className="text-[10px] text-slate-500 shrink-0">{entry.duration_months}mo</span>
                                </div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{entry.scenario_type}</p>
                                <p className="text-[11px] text-slate-400 line-clamp-2">{entry.overall_recommendation}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {result && (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-teal-500/5 border border-teal-500/10">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Heart className="w-3.5 h-3.5 text-teal-400" />
                                <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider">Health Impact</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-1">{proj.raphael?.narrative}</p>
                            <div className="grid grid-cols-3 gap-1 mt-2 text-center">
                                <div><p className="text-xs font-medium text-white">{proj.raphael?.stress_12mo?.toFixed?.(0) ?? '--'}</p><p className="text-[8px] text-slate-500">Stress</p></div>
                                <div><p className="text-xs font-medium text-white">{proj.raphael?.hrv_12mo?.toFixed?.(0) ?? '--'}</p><p className="text-[8px] text-slate-500">HRV</p></div>
                                <div><p className="text-xs font-medium text-white">{proj.raphael?.sleep_12mo?.toFixed?.(1) ?? '--'}</p><p className="text-[8px] text-slate-500">Sleep</p></div>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Financial Impact</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-1">{proj.gabriel?.narrative}</p>
                            <div className="grid grid-cols-2 gap-1 mt-2 text-center">
                                <div><p className="text-xs font-medium text-white">${proj.gabriel?.projected_net_worth?.toLocaleString?.() ?? '--'}</p><p className="text-[8px] text-slate-500">Net Worth</p></div>
                                <div><p className="text-xs font-medium text-white">${proj.gabriel?.healthcare_cost_monthly?.toFixed?.(0) ?? '--'}/mo</p><p className="text-[8px] text-slate-500">Healthcare</p></div>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                            <div className="flex items-center gap-1.5 mb-2">
                                <GitBranch className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Family Precedent</span>
                            </div>
                            <p className="text-xs text-slate-400">{proj.joseph?.narrative}</p>
                            {proj.joseph?.similar_ancestors?.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                    {proj.joseph.similar_ancestors.slice(0, 3).map((ancestor: any, index: number) => (
                                        <p key={index} className="text-[10px] text-amber-400/60">{ancestor.name} - {ancestor.occupation}{ancestor.lifespan ? `, lived ${ancestor.lifespan}y` : ''}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <p className="text-xs text-slate-300"><span className="text-white font-medium">Recommendation:</span> {result.overall_recommendation}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
