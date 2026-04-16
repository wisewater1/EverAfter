import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Loader2, Minus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { getDHT } from '../../lib/dhtApi';

const DIRECTION_CONFIG: Record<string, { icon: typeof Activity; color: string; label: string; bg: string }> = {
    improving: { icon: TrendingUp, color: '#10b981', bg: '#10b98115', label: 'Improving' },
    stable: { icon: Minus, color: '#f59e0b', bg: '#f59e0b15', label: 'Stable' },
    declining: { icon: TrendingDown, color: '#ef4444', bg: '#ef444415', label: 'Declining' },
    critical: { icon: AlertTriangle, color: '#dc2626', bg: '#dc262615', label: 'Critical' },
    unknown: { icon: Activity, color: '#6b7280', bg: '#6b728015', label: 'No data' },
};

const HORIZON_LABELS: Record<string, string> = {
    short: '7-30 days',
    mid: '3-12 months',
    long: '1-5 years',
};

function TrajectoryWindowCard({ window: trajectoryWindow, compact = false }: { window: unknown; compact?: boolean }) {
    const config = DIRECTION_CONFIG[trajectoryWindow.direction] || DIRECTION_CONFIG.unknown;
    const Icon = config.icon;

    return (
        <div
            className={`flex flex-col gap-2 rounded-2xl border ${compact ? 'p-3' : 'p-4'}`}
            style={{ borderColor: `${config.color}25`, backgroundColor: config.bg }}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950/35">
                        <Icon className="h-4 w-4" style={{ color: config.color }} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: config.color }}>
                            {HORIZON_LABELS[trajectoryWindow.horizon] || trajectoryWindow.horizon}
                        </span>
                        <p className="text-sm font-semibold text-white">{config.label}</p>
                    </div>
                </div>
                <span className="text-[10px] text-slate-400">{Math.round((trajectoryWindow.confidence || 0) * 100)}%</span>
            </div>

            <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Confidence</span>
                    <span>{Math.round((trajectoryWindow.confidence || 0) * 100)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                        className="h-full rounded-full transition-all"
                        style={{
                            width: `${(trajectoryWindow.confidence || 0) * 100}%`,
                            backgroundColor: config.color,
                        }}
                    />
                </div>
            </div>

            {!compact && trajectoryWindow.narrative && (
                <p className="text-[11px] leading-relaxed text-slate-300">{trajectoryWindow.narrative}</p>
            )}

            {!compact && trajectoryWindow.key_drivers?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {trajectoryWindow.key_drivers.slice(0, 3).map((driver: string) => (
                        <span key={driver} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300">
                            {driver}
                        </span>
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
    const [data, setData] = useState<unknown>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    async function load(showSpinner = true) {
        if (showSpinner) setLoading(true);
        else setRefreshing(true);

        const response = await getDHT(personId);
        setData(response?.dht || null);
        setLoading(false);
        setRefreshing(false);
    }

    useEffect(() => {
        load();
    }, [personId]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating trajectory...
            </div>
        );
    }

    if (!data) {
        return (
            <div className="rounded-3xl border border-dashed border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-900/60 p-8 text-center">
                <Activity className="mx-auto mb-3 h-8 w-8 text-slate-600" />
                <p className="text-sm font-medium text-white">Delphi is waiting for health data</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Add recent measurements in Raphael to generate short-, mid-, and long-horizon trajectory guidance.
                </p>
            </div>
        );
    }

    const overallConfig = DIRECTION_CONFIG[data.overall_direction] || DIRECTION_CONFIG.unknown;
    const OverallIcon = overallConfig.icon;

    return (
        <div className={`rounded-3xl border border-white/5 bg-gradient-to-br from-[#181b25] via-[#171c28] to-[#121721] ${compact ? 'p-4' : 'p-6'}`}>
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: overallConfig.bg }}>
                        <OverallIcon className="h-5 w-5" style={{ color: overallConfig.color }} />
                    </div>
                    <div>
                        <p className="text-base font-semibold text-white">Delphi trajectory</p>
                        <p className="mt-1 text-xs text-slate-400">
                            {data.observation_count} observations, {data.data_quality} data quality, {overallConfig.label.toLowerCase()} current direction.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span
                        className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                        style={{
                            color: overallConfig.color,
                            borderColor: `${overallConfig.color}40`,
                            backgroundColor: overallConfig.bg,
                        }}
                    >
                        {overallConfig.label}
                    </span>
                    {showRefresh && (
                        <button
                            type="button"
                            onClick={() => load(false)}
                            disabled={refreshing}
                            className="rounded-xl border border-white/8 bg-white/[0.03] p-2 text-slate-500 transition-colors hover:text-slate-300 disabled:opacity-50"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-5 rounded-2xl border border-white/5 bg-slate-950/35 p-4">
                <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Overall confidence</span>
                    <span>{Math.round((data.confidence || 0) * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                        className="h-full rounded-full transition-all"
                        style={{
                            width: `${(data.confidence || 0) * 100}%`,
                            backgroundColor: overallConfig.color,
                        }}
                    />
                </div>
            </div>

            <div className={`grid gap-3 ${compact ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-3'}`}>
                {data.short_term && <TrajectoryWindowCard window={data.short_term} compact={compact} />}
                {data.mid_term && <TrajectoryWindowCard window={data.mid_term} compact={compact} />}
                {data.long_term && <TrajectoryWindowCard window={data.long_term} compact={compact} />}
            </div>

            {data.anomalies?.length > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                    <p className="text-xs text-red-200">
                        {data.anomalies.length} anomalous reading{data.anomalies.length !== 1 ? 's' : ''} detected. Use Risk Cards for domain-level context.
                    </p>
                </div>
            )}
        </div>
    );
}
