import { useEffect, useState } from 'react';
import { CheckCircle, Crosshair, Loader2 } from 'lucide-react';
import { fetchHealthMetrics } from '../../lib/raphael/healthDataService';
import { getNextBestMeasurement, type NextBestMeasurement as NextBestMeasurementType } from '../../lib/dhtApi';

function deriveMeasurementGap(metrics: Awaited<ReturnType<typeof fetchHealthMetrics>>) {
    if (!metrics.length) {
        return {
            label: 'Establish a Delphi baseline',
            reason: 'Raphael does not have enough recent measurements to reduce trajectory uncertainty yet.',
            suggested_source: 'manual / wearable',
            uncertainty_reduction_pct: 35,
        };
    }

    const metricTypes = new Set(metrics.map(metric => metric.metric_type));
    if (!metricTypes.has('sleep_duration')) {
        return {
            label: 'Sleep duration',
            reason: 'Sleep is missing from the recent health record and is one of the fastest ways to reduce uncertainty in recovery forecasts.',
            suggested_source: 'wearable / sleep log',
            uncertainty_reduction_pct: 22,
        };
    }

    if (!metricTypes.has('stress_level')) {
        return {
            label: 'Stress check-in',
            reason: 'Raphael has physiological data but no current stress signal, which weakens the behavioral interpretation of the trajectory.',
            suggested_source: 'manual self-report',
            uncertainty_reduction_pct: 18,
        };
    }

    return null;
}

export default function NextBestMeasurement({ personId }: { personId: string }) {
    const [nextBest, setNextBest] = useState<NextBestMeasurementType | null>(null);
    const [loading, setLoading] = useState(true);
    const [fallbackGap, setFallbackGap] = useState<ReturnType<typeof deriveMeasurementGap>>(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            setLoading(true);
            const [response, metrics] = await Promise.all([
                getNextBestMeasurement(personId),
                fetchHealthMetrics(personId, 30),
            ]);

            if (cancelled) return;

            setNextBest(response?.next_best || null);
            setFallbackGap(response?.next_best ? null : deriveMeasurementGap(metrics));
            setLoading(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [personId]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 p-3 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading next measurement...
            </div>
        );
    }

    if (!nextBest && !fallbackGap) {
        return (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                <p className="text-xs text-emerald-300">All key measurements are up to date.</p>
            </div>
        );
    }

    const measurement = nextBest || fallbackGap;
    if (!measurement) return null;

    return (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 px-4 py-3">
            <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-500/20">
                    <Crosshair className="h-4 w-4 text-teal-400" />
                </div>
                <div className="flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                        <p className="text-xs font-semibold text-white">Next best measurement</p>
                        <span className="rounded bg-teal-500/20 px-1.5 py-0.5 text-[9px] font-bold text-teal-400">
                            -{measurement.uncertainty_reduction_pct?.toFixed(0)}% uncertainty
                        </span>
                    </div>
                    <p className="text-sm font-bold text-teal-300">{measurement.label}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{measurement.reason}</p>
                    {measurement.suggested_source && (
                        <p className="mt-1 text-[10px] text-slate-500">Suggested source: {measurement.suggested_source}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
