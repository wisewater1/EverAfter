import { useState, useEffect } from 'react';
import { getDHT } from '../../lib/dhtApi';
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, Loader2 } from 'lucide-react';
import DHTPanel from './DHTPanel';

/**
 * DHTScorePanel – Jenkins‑style health score panel.
 *
 * Locked to a single person (personId prop). No family switcher.
 * Shows:
 *  - Big overall health score (confidence × 100)
 *  - Direction badge (Improving / Stable / Declining)
 *  - Category rows for 7‑30d / 3‑12mo / 1‑5yr windows
 *  - Compact DHTPanel for visual trajectory bars
 *  - "Not medical advice" footer guardrail
 */

interface DHTScorePanelProps {
    personId: string;
    memberName?: string;
}

const DIRECTION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
    improving: { icon: TrendingUp, color: '#10b981', label: 'Improving' },
    stable: { icon: Minus, color: '#f59e0b', label: 'Stable' },
    declining: { icon: TrendingDown, color: '#ef4444', label: 'Declining' },
    critical: { icon: AlertTriangle, color: '#dc2626', label: 'Critical' },
    unknown: { icon: Activity, color: '#6b7280', label: 'No Data' },
};

function CategoryRow({ label, window }: { label: string; window: any }) {
    if (!window) return null;
    const dir = window.direction || 'unknown';
    const cfg = DIRECTION_CONFIG[dir] || DIRECTION_CONFIG.unknown;
    const Icon = cfg.icon;
    const pct = Math.round((window.confidence || 0) * 100);
    return (
        <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
            <span className="text-xs text-slate-400 w-28 shrink-0">{label}</span>
            <div className="flex items-center gap-1.5 flex-1">
                <Icon className="w-3 h-3 shrink-0" style={{ color: cfg.color }} />
                <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                </div>
                <span className="text-[10px] text-slate-500 w-8 text-right">{pct}%</span>
            </div>
        </div>
    );
}

export default function DHTScorePanel({ personId, memberName }: DHTScorePanelProps) {
    const [dht, setDht] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            const data = await getDHT(personId);
            if (!cancelled) {
                setDht(data?.dht || null);
                setLoading(false);
            }
        }
        if (personId) load();
        return () => { cancelled = true; };
    }, [personId]);

    const overallScore = dht?.confidence != null ? Math.round(dht.confidence * 100) : null;
    const dir = dht?.overall_direction || 'unknown';
    const cfg = DIRECTION_CONFIG[dir] || DIRECTION_CONFIG.unknown;
    const Icon = cfg.icon;

    return (
        <div className="rounded-xl bg-slate-900/60 border border-white/8 overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-3 pb-2 border-b border-white/5 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: cfg.color + '20' }}>
                    <Activity className="w-3 h-3" style={{ color: cfg.color }} />
                </div>
                <div>
                    <p className="text-xs font-semibold text-white leading-none">Delphi Health Score</p>
                    {memberName && <p className="text-[10px] text-slate-500 mt-0.5">{memberName}</p>}
                </div>
            </div>

            <div className="p-4">
                {loading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Computing trajectory…
                    </div>
                ) : (
                    <>
                        {/* Big score */}
                        <div className="flex items-end gap-3 mb-4">
                            <div className="text-5xl font-bold leading-none"
                                style={{ color: overallScore != null ? cfg.color : '#4b5563' }}>
                                {overallScore != null ? overallScore : 'N/A'}
                            </div>
                            <div className="mb-1">
                                {overallScore != null && (
                                    <>
                                        <div className="text-xs text-slate-500">/ 100</div>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <Icon className="w-3 h-3" style={{ color: cfg.color }} />
                                            <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                                        </div>
                                    </>
                                )}
                                {overallScore == null && (
                                    <div className="text-xs text-slate-500">No data yet</div>
                                )}
                            </div>
                        </div>

                        {/* Category breakdown */}
                        {(dht?.short_term || dht?.mid_term || dht?.long_term) && (
                            <div className="mb-4">
                                <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">Time Horizons</p>
                                <CategoryRow label="7–30 Days" window={dht?.short_term} />
                                <CategoryRow label="3–12 Months" window={dht?.mid_term} />
                                <CategoryRow label="1–5 Years" window={dht?.long_term} />
                            </div>
                        )}

                        {/* Anomaly alert */}
                        {dht?.anomalies?.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
                                <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                                <p className="text-[10px] text-red-300">
                                    {dht.anomalies.length} anomalous reading{dht.anomalies.length !== 1 ? 's' : ''} detected
                                </p>
                            </div>
                        )}

                        {/* Compact trajectory panel (shows empty state nicely) */}
                        <DHTPanel personId={personId} compact={true} showRefresh={false} />
                    </>
                )}
            </div>

            {/* Footer guardrail */}
            <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5">
                <p className="text-[9px] text-slate-600 text-center">
                    ⚠ Not medical advice · For informational purposes only
                </p>
            </div>
        </div>
    );
}
