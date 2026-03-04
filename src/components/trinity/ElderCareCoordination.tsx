/**
 * ElderCareCoordination — Option 7
 * Elder member care planning across all 3 Saints.
 */
import { useState, useEffect } from 'react';
import { Users, Heart, Wallet, AlertTriangle, Loader2 } from 'lucide-react';
import { trinitySynapse } from './trinityApi';

export default function ElderCareCoordination() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { (async () => { setData(await trinitySynapse('elder_care', {})); setLoading(false); })(); }, []);

    if (loading) return <div className="flex items-center gap-2 text-xs text-slate-500 p-4"><Loader2 className="w-4 h-4 animate-spin" />Analyzing elder care needs…</div>;
    if (!data) return null;

    const elders = data.elder_members || [];

    return (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-white">Elder Care Coordination</span>
                    <span className="text-[10px] text-slate-500">{data.total_elders} elder{data.total_elders !== 1 ? 's' : ''}</span>
                </div>
                {data.family_coverage_gap > 0 && (
                    <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/10">
                        Gap: ${data.family_coverage_gap?.toLocaleString()}/mo
                    </span>
                )}
            </div>

            {elders.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No family members aged 65+ detected in the tree.</p>
            ) : (
                <div className="space-y-3">
                    {elders.map((e: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <p className="text-sm font-medium text-white">{e.name}, {e.age}</p>
                                    <p className="text-[10px] text-slate-500">{e.care_type} care · {e.health_trajectory} trajectory</p>
                                </div>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${e.coverage_status === 'funded' ? 'text-emerald-400 bg-emerald-500/10' : e.coverage_status === 'underfunded' ? 'text-amber-400 bg-amber-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                                    {e.coverage_status}
                                </span>
                            </div>
                            {e.conditions?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {e.conditions.slice(0, 3).map((c: string, j: number) => (
                                        <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400/70 border border-rose-500/10">{c}</span>
                                    ))}
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div><p className="text-xs font-medium text-white">${e.estimated_monthly_cost?.toLocaleString()}</p><p className="text-[9px] text-slate-500">Est. Cost/mo</p></div>
                                <div><p className="text-xs font-medium text-white">${e.current_budget?.toLocaleString()}</p><p className="text-[9px] text-slate-500">Budgeted</p></div>
                                <div><p className="text-xs font-medium text-white">{(e.coverage_ratio * 100).toFixed(0)}%</p><p className="text-[9px] text-slate-500">Coverage</p></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
