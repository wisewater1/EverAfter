/**
 * LeadingIndicators — top health signals driving current risk/resilience.
 */
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { getLeadingIndicators, LeadingIndicator } from '../../lib/dhtApi';

const IMPACT_COLORS: Record<string, string> = {
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#6b7280',
};

export default function LeadingIndicators({ personId }: { personId: string }) {
    const [indicators, setIndicators] = useState<LeadingIndicator[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const resp = await getLeadingIndicators(personId);
            setIndicators(resp?.indicators || []);
            setLoading(false);
        })();
    }, [personId]);

    if (loading) return <div className="flex items-center gap-2 text-xs text-slate-500 p-4"><Loader2 className="w-4 h-4 animate-spin" />Loading indicators…</div>;
    if (!indicators.length) return <div className="text-xs text-slate-500 text-center py-4">No indicators detected yet.</div>;

    return (
        <div className="space-y-1.5">
            {indicators.map((ind, i) => {
                const color = IMPACT_COLORS[ind.impact] || '#6b7280';
                const Arrow = ind.trend === '↑' ? TrendingUp : ind.trend === '↓' ? TrendingDown : Minus;
                return (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + '15' }}>
                            <Arrow className="w-3 h-3" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white">{ind.label}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-400">{ind.value} {ind.unit}</span>
                                {ind.delta_7d !== undefined && ind.delta_7d !== 0 && (
                                    <span className="text-[9px]" style={{ color: ind.delta_7d > 0 ? '#10b981' : '#ef4444' }}>
                                        {ind.delta_7d > 0 ? '+' : ''}{ind.delta_7d?.toFixed(1)}% (7d)
                                    </span>
                                )}
                            </div>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase"
                            style={{ color, backgroundColor: color + '15' }}>{ind.impact}</span>
                    </div>
                );
            })}
        </div>
    );
}
