/**
 * DHTPanel — Delphi Health Trajectory main panel.
 * Shows trajectory windows (short/mid/long), confidence, and an overview bar.
 * Used in St. Joseph family member cards and St. Raphael Delphi View.
 */
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { getDHT } from '../../lib/dhtApi';

const DIRECTION_CONFIG: Record<string, { icon: any; color: string; label: string; bg: string }> = {
    improving: { icon: TrendingUp, color: '#10b981', bg: '#10b98115', label: 'Improving' },
    stable: { icon: Minus, color: '#f59e0b', bg: '#f59e0b15', label: 'Stable' },
    declining: { icon: TrendingDown, color: '#ef4444', bg: '#ef444415', label: 'Declining' },
    critical: { icon: AlertTriangle, color: '#dc2626', bg: '#dc262615', label: 'Critical' },
    unknown: { icon: Activity, color: '#6b7280', bg: '#6b728015', label: 'No Data' },
};

const HORIZON_LABELS: Record<string, string> = {
    short: '7–30 Days',
    mid: '3–12 Months',
    long: '1–5 Years',
};

interface DHTWindowProps {
    window: any;
    compact?: boolean;
}

function TrajectoryWindowCard({ window: w, compact }: DHTWindowProps) {
    const cfg = DIRECTION_CONFIG[w.direction] || DIRECTION_CONFIG.unknown;
    const Icon = cfg.icon;
    return (
        <div className={`rounded-xl border p-3 flex flex-col gap-1.5 ${compact ? 'p-2' : 'p-3'}`}
            style={{ borderColor: cfg.color + '25', backgroundColor: cfg.bg }}>
            <div className="flex items-center gap-1.5">
                <Icon className="w-3 h-3" style={{ color: cfg.color }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
                    {HORIZON_LABELS[w.horizon]}
                </span>
            </div>
            <p className="text-sm font-semibold text-white">{cfg.label}</p>
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Confidence: {Math.round(w.confidence * 100)}%</span>
                <div className="h-1 flex-1 mx-2 rounded bg-white/5 overflow-hidden">
                    <div className="h-full rounded transition-all" style={{ width: `${w.confidence * 100}%`, backgroundColor: cfg.color }} />
                </div>
            </div>
            {!compact && w.narrative && (
                <p className="text-[10px] text-slate-400 leading-relaxed">{w.narrative}</p>
            )}
            {!compact && w.key_drivers?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                    {w.key_drivers.slice(0, 3).map((d: string) => (
                        <span key={d} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">{d}</span>
                    ))}
                </div>
            )}
        </div>
    );
}

interface DHTProps {
    personId: string;
    compact?: boolean;
    showRefresh?: boolean;
}

export default function DHTPanel({ personId, compact = false, showRefresh = true }: DHTProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    async function load(showSpinner = true) {
        if (showSpinner) setLoading(true);
        else setRefreshing(true);
        const resp = await getDHT(personId);
        setData(resp?.dht || null);
        setLoading(false);
        setRefreshing(false);
    }

    useEffect(() => { load(); }, [personId]);

    if (loading) return (
        <div className="flex items-center gap-2 text-xs text-slate-500 p-4">
            <Loader2 className="w-4 h-4 animate-spin" />Calculating trajectory…
        </div>
    );

    if (!data) return (
        <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 text-center">
            <Activity className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No health data yet.</p>
            <p className="text-[10px] text-slate-600 mt-1">Add measurements to generate your trajectory.</p>
        </div>
    );

    const overallCfg = DIRECTION_CONFIG[data.overall_direction] || DIRECTION_CONFIG.unknown;
    const OverallIcon = overallCfg.icon;

    return (
        <div className={`rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 ${compact ? 'p-3' : 'p-5'}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: overallCfg.bg }}>
                        <OverallIcon className="w-3.5 h-3.5" style={{ color: overallCfg.color }} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-white">Delphi Trajectory</p>
                        <p className="text-[10px] text-slate-500">
                            {data.observation_count} obs · {data.data_quality} data
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold"
                        style={{ color: overallCfg.color, borderColor: overallCfg.color + '40', backgroundColor: overallCfg.bg }}>
                        {overallCfg.label}
                    </span>
                    {showRefresh && (
                        <button onClick={() => load(false)} disabled={refreshing}
                            className="p-1 rounded-lg text-slate-600 hover:text-slate-400 transition-colors disabled:opacity-50">
                            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                </div>
            </div>

            {/* Confidence bar */}
            <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-slate-500 shrink-0">Overall confidence</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                        width: `${data.confidence * 100}%`,
                        backgroundColor: overallCfg.color,
                    }} />
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{Math.round(data.confidence * 100)}%</span>
            </div>

            {/* Trajectory windows */}
            <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
                {data.short_term && <TrajectoryWindowCard window={data.short_term} compact={compact} />}
                {data.mid_term && <TrajectoryWindowCard window={data.mid_term} compact={compact} />}
                {data.long_term && <TrajectoryWindowCard window={data.long_term} compact={compact} />}
            </div>

            {/* Anomaly badge */}
            {data.anomalies?.length > 0 && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <p className="text-[10px] text-red-300">{data.anomalies.length} anomalous reading{data.anomalies.length !== 1 ? 's' : ''} detected — see risk cards.</p>
                </div>
            )}
        </div>
    );
}
