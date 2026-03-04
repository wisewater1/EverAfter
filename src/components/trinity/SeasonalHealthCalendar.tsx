/**
 * SeasonalHealthCalendar — Option 5
 * 12-month grid showing Joseph family events, Raphael risk, Gabriel spending.
 */
import { useState, useEffect } from 'react';
import { Calendar, Loader2, AlertTriangle } from 'lucide-react';
import { trinitySynapse } from './trinityApi';

export default function SeasonalHealthCalendar() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const d = await trinitySynapse('seasonal_calendar', {});
            setData(d);
            setLoading(false);
        })();
    }, []);

    if (loading) return <div className="flex items-center gap-2 text-xs text-slate-500 p-4"><Loader2 className="w-4 h-4 animate-spin" />Building seasonal calendar…</div>;
    if (!data) return null;

    const calendar = data.calendar || [];
    const highRisk = data.high_risk_months || [];

    return (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-semibold text-white">Seasonal Health Calendar</span>
                </div>
                {highRisk.length > 0 && (
                    <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/10">
                        <AlertTriangle className="w-2.5 h-2.5 inline mr-1" />{highRisk.length} high-risk months
                    </span>
                )}
            </div>

            <div className="grid grid-cols-4 gap-2">
                {calendar.map((m: any) => {
                    const riskLevel = m.combined_risk >= 2 ? 'high' : m.combined_risk === 1 ? 'moderate' : 'low';
                    const borderColor = riskLevel === 'high' ? 'border-rose-500/30' : riskLevel === 'moderate' ? 'border-amber-500/20' : 'border-white/5';
                    const bgColor = riskLevel === 'high' ? 'bg-rose-500/5' : riskLevel === 'moderate' ? 'bg-amber-500/5' : 'bg-white/[0.02]';
                    return (
                        <div key={m.month} className={`p-3 rounded-xl border ${borderColor} ${bgColor} group cursor-default`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-white">{m.month_name}</span>
                                {m.combined_risk > 0 && (
                                    <span className={`w-2 h-2 rounded-full ${riskLevel === 'high' ? 'bg-rose-400' : 'bg-amber-400'}`} />
                                )}
                            </div>
                            <div className="space-y-1 text-[9px]">
                                {m.joseph?.event_count > 0 && <p className="text-amber-400/70">🧬 {m.joseph.event_count} family event{m.joseph.event_count > 1 ? 's' : ''}</p>}
                                {m.raphael?.avg_risk_score && <p className="text-teal-400/70">💓 Risk: {m.raphael.avg_risk_score.toFixed(0)}</p>}
                                {m.gabriel?.pressure === 'high' && <p className="text-emerald-400/70">💰 High spend</p>}
                                {m.risk_flags?.length === 0 && <p className="text-slate-600">No flags</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
