import { useEffect, useMemo, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    RefreshCw,
    User as UserIcon,
    Users,
} from 'lucide-react';
import {
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts';
import {
    fetchCompareDataset,
    toChartRows,
    USER_LINE_COLOR,
    type NormalizedTrajectory,
    type RiskLevel,
} from '../../lib/joseph/familyTrajectoryCompare';
import { getFamilyMembers, type FamilyMember } from '../../lib/joseph/genealogy';

interface FamilyTrajectoryCompareProps {
    userId: string;
    userName?: string;
}

const RISK_STYLES: Record<RiskLevel, { label: string; cls: string }> = {
    low: { label: 'Low', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
    moderate: {
        label: 'Moderate',
        cls: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    },
    high: { label: 'High', cls: 'bg-orange-500/10 text-orange-300 border-orange-500/30' },
    critical: { label: 'Critical', cls: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
    unknown: { label: 'No data', cls: 'bg-white/5 text-slate-400 border-white/10' },
};

function formatDateLabel(ts: string): string {
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return ts;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ConfidenceBar({ value }: { value: number }) {
    const pct = Math.min(100, Math.max(0, Math.round(value * 100)));
    return (
        <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                    className="h-full rounded-full bg-cyan-400/80"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-[10px] text-slate-500 w-9 text-right tabular-nums">
                {pct}%
            </span>
        </div>
    );
}

function SubjectRow({
    trajectory,
    selected,
    onToggle,
}: {
    trajectory: NormalizedTrajectory;
    selected: boolean;
    onToggle?: () => void;
}) {
    const risk = RISK_STYLES[trajectory.riskLevel];
    const hasData = trajectory.points.length > 0;
    const interactive = typeof onToggle === 'function';

    return (
        <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                selected
                    ? 'border-white/15 bg-white/[0.04]'
                    : 'border-white/5 bg-white/[0.015] opacity-60'
            } ${interactive ? 'cursor-pointer hover:border-white/20' : ''}`}
            onClick={onToggle}
            role={interactive ? 'button' : undefined}
            aria-pressed={interactive ? selected : undefined}
        >
            <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: trajectory.color }}
                aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">
                        {trajectory.isUser ? `${trajectory.subjectName} (You)` : trajectory.subjectName}
                    </span>
                    <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md border uppercase tracking-wider ${risk.cls}`}
                    >
                        {risk.label}
                    </span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                    <ConfidenceBar value={trajectory.confidence} />
                    <span className="text-[10px] text-slate-500">
                        {hasData
                            ? `${trajectory.points.length} pts · ${trajectory.dataSource}`
                            : 'no trajectory yet'}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function FamilyTrajectoryCompare({
    userId,
    userName = 'You',
}: FamilyTrajectoryCompareProps) {
    const familyMembers = useMemo<FamilyMember[]>(
        () => getFamilyMembers().filter((m) => !m.deathDate),
        [],
    );

    const [selectedFamilyIds, setSelectedFamilyIds] = useState<Set<string>>(
        () => new Set(familyMembers.slice(0, 3).map((m) => m.id)),
    );
    const [includeUser, setIncludeUser] = useState(true);
    const [user, setUser] = useState<NormalizedTrajectory | null>(null);
    const [family, setFamily] = useState<NormalizedTrajectory[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const selectedMembers = useMemo(
        () => familyMembers.filter((m) => selectedFamilyIds.has(m.id)),
        [familyMembers, selectedFamilyIds],
    );

    useEffect(() => {
        let cancelled = false;
        if (!userId) return;
        setLoading(true);
        setError(null);

        fetchCompareDataset({ userId, userName, members: selectedMembers })
            .then((data) => {
                if (cancelled) return;
                setUser(data.user);
                setFamily(data.family);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Failed to load comparison.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [userId, userName, selectedMembers, refreshKey]);

    const visibleTrajectories = useMemo<NormalizedTrajectory[]>(() => {
        const list: NormalizedTrajectory[] = [];
        if (includeUser && user) list.push(user);
        for (const t of family) list.push(t);
        return list;
    }, [includeUser, user, family]);

    const chartRows = useMemo(() => toChartRows(visibleTrajectories), [visibleTrajectories]);
    const chartingLines = visibleTrajectories.filter((t) => t.points.length > 0);

    const summary = useMemo(() => {
        const withData = visibleTrajectories.filter((t) => t.points.length > 0);
        const avgConfidence =
            withData.length > 0
                ? withData.reduce((sum, t) => sum + t.confidence, 0) / withData.length
                : 0;
        const elevated = visibleTrajectories.filter((t) =>
            t.riskLevel === 'high' || t.riskLevel === 'critical',
        );
        return { withData, avgConfidence, elevated };
    }, [visibleTrajectories]);

    const toggleMember = (id: string) => {
        setSelectedFamilyIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <div className="space-y-5">
            <header className="rounded-3xl border border-white/5 bg-slate-900/40 p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-cyan-300">
                            <Users className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                                Family Delphi Comparison
                            </span>
                        </div>
                        <h3 className="mt-2 text-xl md:text-2xl font-light text-white">
                            Compare your trajectory against your family
                        </h3>
                        <p className="mt-1 text-sm text-slate-400 max-w-2xl">
                            Each subject's Delphi Health Trajectory is overlaid on a single
                            timeline. Toggle members in or out to focus the comparison.
                        </p>
                    </div>
                    <button
                        onClick={() => setRefreshKey((k) => k + 1)}
                        className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-200 hover:border-white/20 hover:bg-white/[0.06] transition-colors"
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" />
                        ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        Refresh
                    </button>
                </div>

                {error && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-300">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}
            </header>

            {/* Subject pickers */}
            <section className="grid gap-4 md:grid-cols-[minmax(260px,360px)_1fr]">
                <div className="space-y-3">
                    <div>
                        <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2 px-1">
                            You
                        </div>
                        {user ? (
                            <SubjectRow
                                trajectory={user}
                                selected={includeUser}
                                onToggle={() => setIncludeUser((v) => !v)}
                            />
                        ) : (
                            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/5 bg-white/[0.015] text-xs text-slate-500">
                                <UserIcon className="w-3.5 h-3.5" />
                                {loading ? 'Loading your trajectory…' : 'No trajectory available yet.'}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2 px-1">
                            Family ({selectedMembers.length} of {familyMembers.length})
                        </div>
                        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 cv-auto">
                            {familyMembers.length === 0 ? (
                                <div className="px-3 py-4 text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">
                                    No living family members on file yet.
                                </div>
                            ) : (
                                familyMembers.map((member, index) => {
                                    const existing = family.find((f) => f.subjectId === member.id);
                                    const placeholder: NormalizedTrajectory = existing || {
                                        subjectId: member.id,
                                        subjectName: `${member.firstName} ${member.lastName}`,
                                        isUser: false,
                                        color: `hsl(${(index * 47) % 360} 70% 65%)`,
                                        riskLevel: 'unknown',
                                        confidence: 0,
                                        predictedValue: null,
                                        dataSource: 'unknown',
                                        points: [],
                                    };
                                    return (
                                        <SubjectRow
                                            key={member.id}
                                            trajectory={placeholder}
                                            selected={selectedFamilyIds.has(member.id)}
                                            onToggle={() => toggleMember(member.id)}
                                        />
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Overlay chart */}
                <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-4 md:p-6 min-h-[360px]">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-slate-300">
                            <Activity className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-wider">
                                Overlaid trajectories
                            </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                            {chartingLines.length} subject{chartingLines.length === 1 ? '' : 's'} plotted
                        </span>
                    </div>

                    {chartingLines.length === 0 ? (
                        <div className="h-[300px] flex flex-col items-center justify-center text-center text-xs text-slate-500 gap-2">
                            <CheckCircle2 className="w-5 h-5 opacity-50" />
                            <span>
                                {loading
                                    ? 'Loading trajectories…'
                                    : 'Select at least one subject with stored health signals to draw the chart.'}
                            </span>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart
                                data={chartRows}
                                margin={{ top: 8, right: 16, bottom: 0, left: -12 }}
                            >
                                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="ts"
                                    tickFormatter={formatDateLabel}
                                    stroke="rgba(255,255,255,0.25)"
                                    tick={{ fontSize: 10 }}
                                />
                                <YAxis
                                    stroke="rgba(255,255,255,0.25)"
                                    tick={{ fontSize: 10 }}
                                    width={36}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(15,23,42,0.95)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: 12,
                                        fontSize: 12,
                                    }}
                                    labelFormatter={formatDateLabel}
                                />
                                {chartingLines.map((t) => (
                                    <Line
                                        key={t.subjectId}
                                        type="monotone"
                                        dataKey={t.subjectId}
                                        name={
                                            t.isUser
                                                ? `${t.subjectName} (You)`
                                                : t.subjectName
                                        }
                                        stroke={t.color}
                                        strokeWidth={t.isUser ? 2.5 : 1.8}
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                        strokeOpacity={t.isUser ? 1 : 0.85}
                                        connectNulls={false}
                                        isAnimationActive={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </section>

            {/* Comparison table */}
            <section className="rounded-3xl border border-white/5 bg-slate-900/40 overflow-hidden">
                <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Side-by-side summary
                    </div>
                    <div className="text-[10px] text-slate-500">
                        avg confidence {Math.round(summary.avgConfidence * 100)}% ·{' '}
                        {summary.elevated.length} elevated risk
                    </div>
                </div>
                <div className="divide-y divide-white/5">
                    {visibleTrajectories.length === 0 ? (
                        <div className="px-4 py-6 text-xs text-slate-500 text-center">
                            Toggle yourself or any family member on the left to compare.
                        </div>
                    ) : (
                        visibleTrajectories.map((t) => {
                            const risk = RISK_STYLES[t.riskLevel];
                            const hasData = t.points.length > 0;
                            return (
                                <div
                                    key={t.subjectId}
                                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: t.color }}
                                            aria-hidden="true"
                                        />
                                        <span className="text-sm text-white truncate">
                                            {t.isUser ? `${t.subjectName} (You)` : t.subjectName}
                                        </span>
                                    </div>
                                    <span
                                        className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] uppercase tracking-wider ${risk.cls}`}
                                    >
                                        {risk.label}
                                    </span>
                                    <span className="text-[11px] text-slate-400 tabular-nums w-20 text-right hidden sm:inline">
                                        {hasData && t.predictedValue !== null
                                            ? `pred ${t.predictedValue.toFixed(1)}`
                                            : '—'}
                                    </span>
                                    <ConfidenceBar value={t.confidence} />
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            <p className="text-[10px] text-slate-500 px-1">
                Family trajectories are derived from each member's Digital Hereditary
                Trait profile. Your own line is computed from your stored health
                metrics. This view is informational and is not medical advice.
            </p>
        </div>
    );
}
