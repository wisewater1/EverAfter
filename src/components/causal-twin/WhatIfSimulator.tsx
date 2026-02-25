import React, { useState } from 'react';
import { Sliders, Play, TrendingUp, ArrowRight } from 'lucide-react';
import ConfidenceBadge from './ConfidenceBadge';
import SafetyDisclaimer from './SafetyDisclaimer';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const BEHAVIOR_SLIDERS = [
    { key: 'sleep_hours', label: 'Sleep (hours)', min: 4, max: 10, step: 0.5, default: 7 },
    { key: 'steps', label: 'Daily Steps', min: 2000, max: 15000, step: 500, default: 6000 },
    { key: 'caffeine_cutoff_hour', label: 'Caffeine Cutoff (hour)', min: 10, max: 20, step: 1, default: 14, invert: true },
    { key: 'hydration_liters', label: 'Water (liters)', min: 0.5, max: 4, step: 0.25, default: 2 },
    { key: 'meditation_minutes', label: 'Meditation (min)', min: 0, max: 30, step: 5, default: 0 },
];

export default function WhatIfSimulator() {
    const [values, setValues] = useState<Record<string, number>>(
        Object.fromEntries(BEHAVIOR_SLIDERS.map(s => [s.key, s.default]))
    );
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [selectedHorizon, setSelectedHorizon] = useState('7d');

    async function runSimulation() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/causal-twin/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ behavior_changes: values }),
            });
            const data = await res.json();
            setResult(data);
        } catch (e) {
            console.error('Simulation failed:', e);
        }
        setLoading(false);
    }

    const horizons = ['3d', '7d', '14d', '30d'];

    return (
        <div className="space-y-6">
            <SafetyDisclaimer compact />

            {/* Behavior Sliders */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
                <div className="flex items-center gap-3 mb-5">
                    <Sliders className="w-5 h-5 text-teal-400" />
                    <h3 className="text-lg font-semibold text-white">Adjust Your Behaviors</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {BEHAVIOR_SLIDERS.map(slider => (
                        <div key={slider.key} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-slate-400">{slider.label}</label>
                                <span className="text-sm font-semibold text-teal-300">
                                    {values[slider.key]}{slider.key === 'caffeine_cutoff_hour' ? ':00' : ''}
                                </span>
                            </div>
                            <input
                                type="range"
                                min={slider.min}
                                max={slider.max}
                                step={slider.step}
                                value={values[slider.key]}
                                onChange={(e) => setValues(prev => ({ ...prev, [slider.key]: parseFloat(e.target.value) }))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-400 
                  [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-teal-500/30
                  [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-teal-300"
                            />
                            <div className="flex justify-between text-xs text-slate-600">
                                <span>{slider.min}</span>
                                <span>{slider.max}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={runSimulation}
                    disabled={loading}
                    className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500/20 to-cyan-500/20 
            hover:from-teal-500/30 hover:to-cyan-500/30 text-teal-300 font-semibold transition-all 
            border border-teal-500/20 flex items-center justify-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Results */}
            {result && (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-5 h-5 text-teal-400" />
                            <h3 className="text-lg font-semibold text-white">Projected Outcomes</h3>
                        </div>
                        <ConfidenceBadge
                            score={result.confidence?.score || 0}
                            level={(result.confidence?.level || 'low') as 'high' | 'moderate' | 'low'}
                        />
                    </div>

                    {/* Horizon Selector */}
                    <div className="flex gap-2 mb-4">
                        {horizons.map(h => (
                            <button
                                key={h}
                                onClick={() => setSelectedHorizon(h)}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${selectedHorizon === h
                                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                        : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/5'
                                    }`}
                            >
                                {h.replace('d', ' days')}
                            </button>
                        ))}
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Object.entries(result.projections || {}).map(([metric, horizonData]: [string, any]) => {
                            const data = horizonData[selectedHorizon] || {};
                            const dirColor = data.direction === 'higher_better'
                                ? 'text-emerald-400' : 'text-blue-400';

                            return (
                                <div key={metric} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-teal-500/20 transition-colors">
                                    <span className="text-xs text-slate-500 uppercase tracking-wider block mb-2">
                                        {metric.replace(/_/g, ' ')}
                                    </span>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-2xl font-bold ${dirColor}`}>{data.mid || '—'}</span>
                                        <span className="text-xs text-slate-500">{data.unit || ''}</span>
                                    </div>
                                    <div className="mt-2 h-2 rounded-full bg-slate-700/50 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400"
                                            style={{ width: `${Math.min(100, ((data.mid - data.low) / (data.high - data.low || 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                                        <span>{data.low}</span>
                                        <span>{data.high}</span>
                                    </div>
                                    {data.contributing_behaviors?.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {data.contributing_behaviors.map((b: string) => (
                                                <span key={b} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500">
                                                    {b.replace(/_/g, ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Narrative */}
                    {result.narrative && (
                        <div className="mt-4 p-4 rounded-xl bg-teal-500/5 border border-teal-500/10">
                            <p className="text-sm text-teal-200/80 italic leading-relaxed">
                                "{result.narrative}"
                            </p>
                        </div>
                    )}

                    {/* Evidence type */}
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <ArrowRight className="w-3 h-3" />
                        <span>{result.evidence?.label}</span>
                        {!result.evidence?.is_causal && (
                            <span className="text-amber-500/60">• Correlational only</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
