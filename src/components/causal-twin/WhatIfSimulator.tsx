import { useMemo, useState } from 'react';
import { ArrowRight, Brain, Play, Sliders, Sparkles, TrendingUp } from 'lucide-react';
import ConfidenceBadge from './ConfidenceBadge';
import SafetyDisclaimer from './SafetyDisclaimer';
import { buildApiUrl } from '../../lib/env';

const BEHAVIOR_SLIDERS = [
    { key: 'sleep_hours', label: 'Sleep', min: 4, max: 10, step: 0.5, default: 7, unit: 'hours', group: 'Recovery' },
    { key: 'hydration_liters', label: 'Hydration', min: 0.5, max: 4, step: 0.25, default: 2, unit: 'liters', group: 'Recovery' },
    { key: 'meditation_minutes', label: 'Meditation', min: 0, max: 30, step: 5, default: 5, unit: 'min', group: 'Recovery' },
    { key: 'steps', label: 'Daily Steps', min: 2000, max: 15000, step: 500, default: 6000, unit: 'steps', group: 'Movement' },
    { key: 'strength_sessions_per_week', label: 'Strength Sessions', min: 0, max: 6, step: 1, default: 1, unit: '/wk', group: 'Movement' },
    { key: 'sunlight_minutes', label: 'Sunlight', min: 0, max: 120, step: 10, default: 20, unit: 'min', group: 'Rhythm' },
    { key: 'caffeine_cutoff_hour', label: 'Caffeine Cutoff', min: 10, max: 20, step: 1, default: 15, unit: ':00', group: 'Rhythm' },
    { key: 'evening_screen_hours', label: 'Evening Screen Time', min: 0, max: 5, step: 0.5, default: 2.5, unit: 'hours', group: 'Rhythm' },
    { key: 'meal_regularity_score', label: 'Meal Regularity', min: 1, max: 10, step: 1, default: 5, unit: '/10', group: 'Metabolic' },
    { key: 'stress_load', label: 'Stress Load', min: 1, max: 10, step: 1, default: 5, unit: '/10', group: 'Stress' },
];

const HORIZONS = ['3d', '7d', '14d', '30d'];
const GROUPS = ['Recovery', 'Movement', 'Rhythm', 'Metabolic', 'Stress'];

function prettyMetric(value: string) {
    return value.replace(/_/g, ' ');
}

function formatSliderValue(key: string, value: number, unit: string) {
    if (key === 'caffeine_cutoff_hour') return `${value}:00`;
    if (unit === 'steps') return `${Math.round(value)}`;
    if (Number.isInteger(value)) return `${value}`;
    return value.toFixed(1);
}

export default function WhatIfSimulator({ memberId }: { memberId?: string }) {
    const [values, setValues] = useState<Record<string, number>>(Object.fromEntries(BEHAVIOR_SLIDERS.map((slider) => [slider.key, slider.default])));
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [selectedHorizon, setSelectedHorizon] = useState('14d');

    const groupedSliders = useMemo(() => {
        return GROUPS.map((group) => ({
            group,
            sliders: BEHAVIOR_SLIDERS.filter((slider) => slider.group === group),
        }));
    }, []);

    async function runSimulation() {
        setLoading(true);
        try {
            const params = memberId ? `?member_id=${memberId}` : '';
            const response = await fetch(buildApiUrl(`/api/v1/causal-twin/simulate${params}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ behavior_changes: values }),
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error('Simulation failed:', error);
        } finally {
            setLoading(false);
        }
    }

    const selectedComposite = result?.composite_indices?.[selectedHorizon] || {};
    const downstreamEquations = result?.downstream_equations || {};
    const behaviorDeltas = result?.behavior_deltas || {};

    return (
        <div className="space-y-6">
            <SafetyDisclaimer compact />

            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
                <div className="flex items-center gap-3 mb-2">
                    <Sliders className="w-5 h-5 text-teal-400" />
                    <h3 className="text-lg font-semibold text-white">Multivariable Decision Simulator</h3>
                </div>
                <p className="text-sm text-slate-400 mb-6">
                    Model behavior targets against your current baseline, then feed the result into Raphael trajectory, alert, experiment, and oracle priority equations.
                </p>

                <div className="space-y-6">
                    {groupedSliders.map(({ group, sliders }) => (
                        <div key={group} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-4">{group}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {sliders.map((slider) => (
                                    <div key={slider.key} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm text-slate-300">{slider.label}</label>
                                            <span className="text-sm font-semibold text-teal-300">
                                                {formatSliderValue(slider.key, values[slider.key], slider.unit)}
                                                {slider.key === 'caffeine_cutoff_hour' ? '' : ` ${slider.unit}`}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min={slider.min}
                                            max={slider.max}
                                            step={slider.step}
                                            value={values[slider.key]}
                                            onChange={(event) => setValues((prev) => ({ ...prev, [slider.key]: parseFloat(event.target.value) }))}
                                            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-400 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-teal-500/30 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-teal-300"
                                        />
                                        <div className="flex justify-between text-xs text-slate-600">
                                            <span>{slider.min}</span>
                                            <span>{slider.max}</span>
                                        </div>
                                        {result?.behavior_baselines?.[slider.key] != null && (
                                            <div className="text-[11px] text-slate-500">
                                                Baseline {result.behavior_baselines[slider.key]} {slider.unit} · Delta {behaviorDeltas[slider.key] > 0 ? '+' : ''}{behaviorDeltas[slider.key] ?? 0}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={runSimulation}
                    disabled={loading}
                    className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500/20 to-cyan-500/20 hover:from-teal-500/30 hover:to-cyan-500/30 text-teal-300 font-semibold transition-all border border-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                            Simulating...
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4" />
                            Simulate Future
                        </>
                    )}
                </button>
            </div>

            {result && (
                <div className="space-y-6">
                    <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-5 h-5 text-teal-400" />
                                <h3 className="text-lg font-semibold text-white">Projected Outcomes</h3>
                            </div>
                            <ConfidenceBadge score={result.confidence?.score || 0} level={(result.confidence?.level || 'low') as 'high' | 'moderate' | 'low'} />
                        </div>

                        <div className="flex gap-2 mb-4 flex-wrap">
                            {HORIZONS.map((horizon) => (
                                <button
                                    key={horizon}
                                    onClick={() => setSelectedHorizon(horizon)}
                                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                                        selectedHorizon === horizon
                                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                            : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/5'
                                    }`}
                                >
                                    {horizon.replace('d', ' days')}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {Object.entries(result.projections || {}).map(([metric, horizonData]: [string, any]) => {
                                const data = horizonData[selectedHorizon] || {};
                                return (
                                    <div key={metric} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-teal-500/20 transition-colors">
                                        <span className="text-xs text-slate-500 uppercase tracking-wider block mb-2">{prettyMetric(metric)}</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-2xl font-bold ${data.direction === 'lower_better' ? 'text-blue-400' : 'text-emerald-400'}`}>{data.mid ?? '—'}</span>
                                            <span className="text-xs text-slate-500">{data.unit || ''}</span>
                                        </div>
                                        <div className="mt-2 h-2 rounded-full bg-slate-700/50 overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400" style={{ width: `${Math.min(100, ((data.mid - data.low) / (data.high - data.low || 1)) * 100)}%` }} />
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-600 mt-1">
                                            <span>{data.low}</span>
                                            <span>{data.high}</span>
                                        </div>
                                        {data.contributing_behaviors?.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {data.contributing_behaviors.map((behavior: string) => (
                                                    <span key={`${metric}-${behavior}`} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500">
                                                        {prettyMetric(behavior)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                        {Object.entries(selectedComposite).map(([key, value]: [string, any]) => (
                            <div key={key} className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#171721] to-[#12121a] p-4">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{prettyMetric(key)}</div>
                                <div className="mt-3 flex items-end gap-2">
                                    <span className="text-3xl font-bold text-white">{value}</span>
                                    <span className="text-xs text-slate-500 mb-1">/ 100</span>
                                </div>
                                <div className="mt-3 h-2 rounded-full bg-slate-700/50 overflow-hidden">
                                    <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-teal-400" style={{ width: `${Math.min(100, value)}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-[#1a1a24] to-[#13131a] p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <Brain className="w-5 h-5 text-fuchsia-400" />
                            <h3 className="text-lg font-semibold text-white">Downstream Equations</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            {Object.entries(downstreamEquations).map(([key, entry]: [string, any]) => (
                                <div key={key} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{entry.label || prettyMetric(key)}</div>
                                            <div className="mt-2 text-3xl font-bold text-white">{entry.score}</div>
                                        </div>
                                        <Sparkles className="w-4 h-4 text-fuchsia-300" />
                                    </div>
                                    <p className="mt-3 text-xs text-slate-400">{entry.summary}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {result.narrative && (
                        <div className="rounded-2xl border border-teal-500/10 bg-teal-500/5 p-4">
                            <p className="text-sm text-teal-200/80 italic leading-relaxed">"{result.narrative}"</p>
                        </div>
                    )}

                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                            <ArrowRight className="w-3 h-3" />
                            <span>{result.evidence?.label}</span>
                            {!result.evidence?.is_causal && <span className="text-amber-500/70">Correlational only</span>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                            <div className="rounded-xl border border-white/5 bg-black/10 p-3">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">History days</div>
                                <div className="mt-2 text-white font-semibold">{result.history_days}</div>
                            </div>
                            <div className="rounded-xl border border-white/5 bg-black/10 p-3">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Data completeness</div>
                                <div className="mt-2 text-white font-semibold">{Math.round((result.completeness || 0) * 100)}%</div>
                            </div>
                            <div className="rounded-xl border border-white/5 bg-black/10 p-3">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Trajectory equation</div>
                                <div className="mt-2 text-white font-semibold">Uses recovery + autonomic + routine</div>
                            </div>
                            <div className="rounded-xl border border-white/5 bg-black/10 p-3">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Alert equation</div>
                                <div className="mt-2 text-white font-semibold">Uses short-term recovery + clarity</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
