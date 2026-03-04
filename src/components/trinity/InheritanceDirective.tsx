/**
 * InheritanceDirective — Option 9
 * Estate + prognosis + heir plan.
 */
import { useState, useEffect } from 'react';
import { FileText, Heart, Wallet, GitBranch, Loader2, Shield } from 'lucide-react';
import { trinitySynapse } from './trinityApi';

export default function InheritanceDirective() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { (async () => { setData(await trinitySynapse('inheritance_directive', {})); setLoading(false); })(); }, []);

    if (loading) return <div className="flex items-center gap-2 text-xs text-slate-500 p-4"><Loader2 className="w-4 h-4 animate-spin" />Generating directive…</div>;
    if (!data) return null;

    const urgencyColors: Record<string, string> = { high: 'text-rose-400', moderate: 'text-amber-400', low: 'text-teal-400' };

    return (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-semibold text-white">Inheritance & Health Directive</span>
                </div>
                <span className={`text-[10px] font-bold uppercase ${urgencyColors[data.urgency] || 'text-slate-400'}`}>{data.urgency} urgency</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Raphael: Prognosis */}
                <div className="p-3 rounded-xl bg-teal-500/5 border border-teal-500/10">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Heart className="w-3.5 h-3.5 text-teal-400" />
                        <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider">Health Prognosis</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">Risk: <span className="text-white font-medium">{data.prognosis?.risk_level}</span></p>
                    <p className="text-xs text-slate-400 mb-1">Trajectory: <span className="text-white font-medium">{data.prognosis?.trajectory}</span></p>
                    {data.prognosis?.active_conditions?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {data.prognosis.active_conditions.map((c: string, i: number) => (
                                <span key={i} className="text-[8px] px-1 py-0.5 rounded bg-teal-500/10 text-teal-400/70">{c}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Gabriel: Estate */}
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Estate Summary</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">Value: <span className="text-white font-medium">${data.estate?.total_value?.toLocaleString() || 0}</span></p>
                    <p className="text-xs text-slate-400 mb-1">Ready: <span className={data.estate?.distribution_ready ? 'text-emerald-400' : 'text-rose-400'}>{data.estate?.distribution_ready ? 'Yes' : 'No'}</span></p>
                </div>

                {/* Joseph: Heirs */}
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <div className="flex items-center gap-1.5 mb-2">
                        <GitBranch className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Heir Plan</span>
                    </div>
                    {data.heir_plan?.heirs?.length > 0 ? (
                        <div className="space-y-1">
                            {data.heir_plan.heirs.slice(0, 4).map((h: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400">{h.name} <span className="text-slate-600">({h.relationship})</span></span>
                                    <span className="text-amber-400/70">{h.share_percent}%</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-rose-400/70">No heirs designated</p>
                    )}
                </div>
            </div>

            {data.action_items?.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <Shield className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action Items</span>
                    </div>
                    <div className="space-y-1">
                        {data.action_items.map((a: string, i: number) => (
                            <p key={i} className="text-xs text-slate-400 flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-amber-400/60 shrink-0" /> {a}
                            </p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
