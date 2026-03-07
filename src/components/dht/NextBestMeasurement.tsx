/**
 * NextBestMeasurement — shows the single measurement with highest uncertainty reduction.
 */
import { useState, useEffect } from 'react';
import { Crosshair, Loader2, CheckCircle } from 'lucide-react';
import { getNextBestMeasurement, NextBestMeasurement as NBMType } from '../../lib/dhtApi';

export default function NextBestMeasurement({ personId }: { personId: string }) {
    const [nbm, setNbm] = useState<NBMType | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const resp = await getNextBestMeasurement(personId);
            setNbm(resp?.next_best || null);
            setLoading(false);
        })();
    }, [personId]);

    if (loading) return <div className="flex items-center gap-2 text-xs text-slate-500 p-3"><Loader2 className="w-3.5 h-3.5 animate-spin" /></div>;
    if (!nbm) return (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-300">All key measurements are up to date.</p>
        </div>
    );

    return (
        <div className="px-4 py-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0">
                    <Crosshair className="w-4 h-4 text-teal-400" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-white">Next Best Measurement</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 font-bold">
                            -{nbm.uncertainty_reduction_pct?.toFixed(0)}% uncertainty
                        </span>
                    </div>
                    <p className="text-sm font-bold text-teal-300">{nbm.label}</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{nbm.reason}</p>
                    {nbm.suggested_source && (
                        <p className="text-[10px] text-slate-500 mt-1">📍 via {nbm.suggested_source}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
