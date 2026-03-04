/**
 * CrossSaintWhatIf — Option 10
 * Simulate the impact of a life decision across all 3 Saints.
 */
import { useState } from 'react';
import { Beaker, Heart, Wallet, GitBranch, Loader2, Play } from 'lucide-react';
import { trinitySynapse } from './trinityApi';

const SCENARIOS = [
    { type: 'career', label: 'High-Stress Career Change', placeholder: 'e.g. Take a VP role at a startup' },
    { type: 'relocation', label: 'Relocation', placeholder: 'e.g. Move to a new city for a job' },
    { type: 'retirement', label: 'Retirement', placeholder: 'e.g. Retire at 58 and focus on health' },
    { type: 'default', label: 'Other', placeholder: 'Describe your scenario…' },
];

export default function CrossSaintWhatIf() {
    const [scenario, setScenario] = useState('');
    const [scenarioType, setScenarioType] = useState('career');
    const [months, setMonths] = useState(12);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    async function simulate() {
        if (!scenario.trim()) return;
        setLoading(true);
        const d = await trinitySynapse('cross_saint_whatif', {
            scenario, scenario_type: scenarioType, duration_months: months,
        });
        setResult(d);
        setLoading(false);
    }

    const proj = result?.projections || {};

    return (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-4">
                <Beaker className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-semibold text-white">Cross-Saint What-If</span>
            </div>

            {/* Input */}
            <div className="space-y-3 mb-4">
                <div className="flex gap-2 flex-wrap">
                    {SCENARIOS.map(s => (
                        <button key={s.type} onClick={() => setScenarioType(s.type)} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${scenarioType === s.type ? 'bg-violet-500/20 text-violet-400 border border-violet-500/20' : 'text-slate-500 hover:text-slate-300 border border-white/5'}`}>
                            {s.label}
                        </button>
                    ))}
                </div>
                <input value={scenario} onChange={e => setScenario(e.target.value)} placeholder={SCENARIOS.find(s => s.type === scenarioType)?.placeholder} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/30" />
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

            {/* Results */}
            {result && (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Raphael */}
                        <div className="p-3 rounded-xl bg-teal-500/5 border border-teal-500/10">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Heart className="w-3.5 h-3.5 text-teal-400" />
                                <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider">Health Impact</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-1">{proj.raphael?.narrative}</p>
                            <div className="grid grid-cols-3 gap-1 mt-2 text-center">
                                <div><p className="text-xs font-medium text-white">{proj.raphael?.stress_12mo?.toFixed(0)}</p><p className="text-[8px] text-slate-500">Stress</p></div>
                                <div><p className="text-xs font-medium text-white">{proj.raphael?.hrv_12mo?.toFixed(0)}</p><p className="text-[8px] text-slate-500">HRV</p></div>
                                <div><p className="text-xs font-medium text-white">{proj.raphael?.sleep_12mo?.toFixed(1)}</p><p className="text-[8px] text-slate-500">Sleep</p></div>
                            </div>
                        </div>

                        {/* Gabriel */}
                        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Financial Impact</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-1">{proj.gabriel?.narrative}</p>
                            <div className="grid grid-cols-2 gap-1 mt-2 text-center">
                                <div><p className="text-xs font-medium text-white">${proj.gabriel?.projected_net_worth?.toLocaleString()}</p><p className="text-[8px] text-slate-500">Net Worth</p></div>
                                <div><p className="text-xs font-medium text-white">${proj.gabriel?.healthcare_cost_monthly?.toFixed(0)}/mo</p><p className="text-[8px] text-slate-500">Healthcare</p></div>
                            </div>
                        </div>

                        {/* Joseph */}
                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                            <div className="flex items-center gap-1.5 mb-2">
                                <GitBranch className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Family Precedent</span>
                            </div>
                            <p className="text-xs text-slate-400">{proj.joseph?.narrative}</p>
                            {proj.joseph?.similar_ancestors?.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                    {proj.joseph.similar_ancestors.slice(0, 3).map((a: any, i: number) => (
                                        <p key={i} className="text-[10px] text-amber-400/60">{a.name} — {a.occupation}{a.lifespan ? `, lived ${a.lifespan}y` : ''}</p>
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
