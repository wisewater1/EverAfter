import { useEffect, useState } from 'react';
import { Loader2, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { fetchHealthMetrics } from '../../lib/raphael/healthDataService';
import { getLeadingIndicators, type LeadingIndicator } from '../../lib/dhtApi';

const IMPACT_STYLES: Record<string, { color: string; border: string; bg: string }> = {
    positive: { color: '#10b981', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
    negative: { color: '#ef4444', border: 'border-rose-500/20', bg: 'bg-rose-500/10' },
    neutral: { color: '#94a3b8', border: 'border-slate-500/20', bg: 'bg-slate-500/10' },
};

const METRIC_LABELS: Record<string, { label: string; unit?: string; summary: string }> = {
    heart_rate: { label: 'Heart rate', unit: 'bpm', summary: 'Short-term cardiovascular load and recovery strain.' },
    sleep_duration: { label: 'Sleep duration', unit: 'hours', summary: 'Daily recovery depth and resilience.' },
    stress_level: { label: 'Stress level', unit: '/10', summary: 'Self-reported emotional and cognitive load.' },
    blood_pressure_systolic: { label: 'Systolic blood pressure', unit: 'mmHg', summary: 'Arterial pressure trend and cardiovascular pressure.' },
    oxygen_saturation: { label: 'Oxygen saturation', unit: '%', summary: 'Oxygen delivery and respiratory resilience.' },
    glucose: { label: 'Glucose', unit: 'mg/dL', summary: 'Metabolic regulation and glycemic pressure.' },
};

function average(values: number[]) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function deriveFallbackIndicators(metrics: Awaited<ReturnType<typeof fetchHealthMetrics>>): LeadingIndicator[] {
    const grouped = metrics.reduce<Record<string, number[]>>((acc, metric) => {
        acc[metric.metric_type] = acc[metric.metric_type] || [];
        acc[metric.metric_type].push(metric.value);
        return acc;
    }, {});

    return Object.entries(grouped)
        .slice(0, 5)
        .map(([metricType, values], index) => {
            const latest = values[values.length - 1];
            const priorAverage = average(values.slice(0, -1));
            const delta = priorAverage ? ((latest - priorAverage) / Math.abs(priorAverage)) * 100 : 0;
            const labelConfig = METRIC_LABELS[metricType] || {
                label: metricType.replaceAll('_', ' '),
                unit: '',
                summary: 'Recent signal contributing to Delphi trajectory.',
            };
            const trend = delta >= 6 ? 'up' : delta <= -6 ? 'down' : 'stable';
            const impact =
                metricType === 'sleep_duration'
                    ? trend === 'down' ? 'negative' : trend === 'up' ? 'positive' : 'neutral'
                    : metricType === 'stress_level'
                        ? trend === 'up' ? 'negative' : trend === 'down' ? 'positive' : 'neutral'
                        : trend === 'up' ? 'positive' : trend === 'down' ? 'negative' : 'neutral';

            return {
                id: `${metricType}-${index}`,
                name: labelConfig.label,
                label: labelConfig.label,
                value: latest,
                unit: labelConfig.unit || '',
                trend,
                impact,
                delta_7d: Number(delta.toFixed(1)),
                clinical_significance: labelConfig.summary,
            };
        });
}

export default function LeadingIndicators({ personId }: { personId: string }) {
    const [indicators, setIndicators] = useState<LeadingIndicator[]>([]);
    const [loading, setLoading] = useState(true);
    const [usingEstimate, setUsingEstimate] = useState(false);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            setLoading(true);
            const [response, metrics] = await Promise.all([
                getLeadingIndicators(personId),
                fetchHealthMetrics(personId, 30),
            ]);

            if (cancelled) return;

            if (response?.indicators?.length) {
                setIndicators(response.indicators);
                setUsingEstimate(false);
            } else {
                setIndicators(deriveFallbackIndicators(metrics));
                setUsingEstimate(true);
            }

            setLoading(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [personId]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-xs text-slate-400 p-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading leading indicators...
            </div>
        );
    }

    if (!indicators.length) {
        return <div className="text-xs text-slate-500 text-center py-4">No leading indicators detected yet.</div>;
    }

    return (
        <div className="space-y-3">
            {usingEstimate && (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-200">
                    Delphi did not return a leading-indicator bundle, so this view is derived from recent Raphael measurements.
                </div>
            )}

            {indicators.map((indicator) => {
                const style = IMPACT_STYLES[indicator.impact || 'neutral'] || IMPACT_STYLES.neutral;
                const Arrow =
                    indicator.trend === 'up'
                        ? TrendingUp
                        : indicator.trend === 'down'
                            ? TrendingDown
                            : Minus;

                return (
                    <div
                        key={indicator.id}
                        className={`rounded-2xl border px-4 py-4 ${style.border} ${style.bg}`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950/40">
                                <Arrow className="h-4 w-4" style={{ color: style.color }} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-white">{indicator.label || indicator.name}</p>
                                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-300">
                                        {indicator.impact || 'neutral'}
                                    </span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-200">
                                    <span>{indicator.value} {indicator.unit}</span>
                                    {typeof indicator.delta_7d === 'number' && (
                                        <span className="text-slate-400">
                                            {indicator.delta_7d > 0 ? '+' : ''}{indicator.delta_7d.toFixed(1)}% over 7d
                                        </span>
                                    )}
                                </div>
                                {indicator.clinical_significance && (
                                    <p className="mt-2 text-xs text-slate-400">{indicator.clinical_significance}</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
