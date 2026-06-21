import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
import {
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    fetchCompareDataset,
    toChartRows,
    type NormalizedTrajectory,
    type RiskLevel,
} from '../../lib/joseph/familyTrajectoryCompare';
import type { FamilyMember } from '../../lib/joseph/genealogy';

interface FamilyTrajectoryMiniProps {
    userId: string;
    userName?: string;
    member: FamilyMember;
}

const RISK_BADGE: Record<RiskLevel, { label: string; cls: string }> = {
    low: { label: 'Low', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
    moderate: { label: 'Moderate', cls: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
    high: { label: 'High', cls: 'bg-orange-500/10 text-orange-300 border-orange-500/30' },
    critical: { label: 'Critical', cls: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
    unknown: { label: 'No data', cls: 'bg-white/5 text-slate-400 border-white/10' },
};

function shortDate(ts: string): string {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function MiniSubjectRow({ t }: { t: NormalizedTrajectory }) {
    const risk = RISK_BADGE[t.riskLevel];
    const pctConf = Math.round(Math.min(100, Math.max(0, t.confidence * 100)));
    return (
        <div className="flex items-center gap-2 min-w-0">
            <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: t.color }}
                aria-hidden="true"
            />
            <span className="text-xs text-white truncate">
                {t.isUser ? `${t.subjectName} (You)` : t.subjectName}
            </span>
            <span
                className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md border text-[9px] uppercase tracking-wider ${risk.cls}`}
            >
                {risk.label}
            </span>
            <span className="ml-auto text-[10px] text-slate-500 tabular-nums shrink-0">
                {pctConf}%
            </span>
        </div>
    );
}

export default function FamilyTrajectoryMini({
    userId,
    userName = 'You',
    member,
}: FamilyTrajectoryMiniProps) {
    const [user, setUser] = useState<NormalizedTrajectory | null>(null);
    const [memberTrajectory, setMemberTrajectory] = useState<NormalizedTrajectory | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (!userId || !member?.id) return;
        setLoading(true);
        setError(null);

        fetchCompareDataset({ userId, userName, members: [member] })
            .then((data) => {
                if (cancelled) return;
                setUser(data.user);
                setMemberTrajectory(data.family[0] ?? null);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Failed to load trajectory.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [userId, userName, member]);

    const lines = useMemo(() => {
        const list: NormalizedTrajectory[] = [];
        if (user) list.push(user);
        if (memberTrajectory) list.push(memberTrajectory);
        return list;
    }, [user, memberTrajectory]);

    const chartRows = useMemo(() => toChartRows(lines), [lines]);
    const chartable = lines.filter((t) => t.points.length > 0);

    return (
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 space-y-3">
            <header className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-300">
                    <Activity className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase tracking-wider">
                        Delphi trajectory vs you
                    </span>
                </div>
                {loading && (
                    <span className="text-[9px] text-slate-500">Loading…</span>
                )}
            </header>

            {error ? (
                <div className="flex items-center gap-2 text-xs text-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{error}</span>
                </div>
            ) : chartable.length === 0 ? (
                <div className="h-[112px] flex items-center justify-center text-[11px] text-slate-500 text-center px-2">
                    {loading
                        ? 'Drawing your shared trajectory…'
                        : 'No trajectory data yet for this person. Their line will appear once they have stored signals.'}
                </div>
            ) : (
                <div className="h-[140px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartRows}
                            margin={{ top: 4, right: 4, left: -22, bottom: 0 }}
                        >
                            <XAxis
                                dataKey="ts"
                                tickFormatter={shortDate}
                                stroke="rgba(255,255,255,0.18)"
                                tick={{ fontSize: 9 }}
                                interval="preserveStartEnd"
                                minTickGap={28}
                            />
                            <YAxis
                                stroke="rgba(255,255,255,0.18)"
                                tick={{ fontSize: 9 }}
                                width={28}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'rgba(15,23,42,0.95)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 8,
                                    fontSize: 11,
                                    padding: '6px 8px',
                                }}
                                labelFormatter={shortDate}
                            />
                            {chartable.map((t) => (
                                <Line
                                    key={t.subjectId}
                                    type="monotone"
                                    dataKey={t.subjectId}
                                    name={t.isUser ? `${t.subjectName} (You)` : t.subjectName}
                                    stroke={t.color}
                                    strokeWidth={t.isUser ? 2 : 1.6}
                                    strokeOpacity={t.isUser ? 1 : 0.85}
                                    dot={false}
                                    activeDot={{ r: 3 }}
                                    connectNulls={false}
                                    isAnimationActive={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="space-y-1.5">
                {user && <MiniSubjectRow t={user} />}
                {memberTrajectory && <MiniSubjectRow t={memberTrajectory} />}
            </div>
        </section>
    );
}
