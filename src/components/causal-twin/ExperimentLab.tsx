import React, { useState, useEffect } from 'react';
import { Beaker, Plus, Play, Pause, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import ConfidenceBadge from './ConfidenceBadge';
import SafetyDisclaimer from './SafetyDisclaimer';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const METRIC_OPTIONS = ['sleep_quality', 'hrv', 'mood', 'energy', 'resting_hr', 'glucose_variability', 'recovery_score'];

export default function ExperimentLab({ memberId }: { memberId?: string }) {
    const [experiments, setExperiments] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Create form
    const [name, setName] = useState('');
    const [intA, setIntA] = useState('');
    const [intB, setIntB] = useState('');
    const [metrics, setMetrics] = useState<string[]>(['sleep_quality', 'mood']);
    const [days, setDays] = useState(14);
    const [createError, setCreateError] = useState('');

    useEffect(() => { loadExperiments(); }, []);

    async function loadExperiments() {
        setLoading(true);
        try {
            const params = memberId ? `?member_id=${memberId}` : '';
            const res = await fetch(`${API_BASE}/api/v1/causal-twin/experiments${params}`);
            const data = await res.json();
            setExperiments(data.experiments || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }

    async function createExperiment() {
        setCreateError('');
        try {
            const params = memberId ? `?member_id=${memberId}` : '';
            const res = await fetch(`${API_BASE}/api/v1/causal-twin/experiments${params}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name, intervention_a: intA, intervention_b: intB,
                    outcome_metrics: metrics, duration_days: days
                }),
            });
            const data = await res.json();
            if (data.error || data.detail) {
                setCreateError(data.error || data.detail);
                return;
            }
            setShowCreate(false);
            setName(''); setIntA(''); setIntB('');
            loadExperiments();
        } catch (e) { setCreateError('Failed to create experiment'); }
    }

    async function updateExperiment(id: string, action: string) {
        try {
            await fetch(`${API_BASE}/api/v1/causal-twin/experiments/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            loadExperiments();
        } catch (e) { console.error(e); }
    }

    const statusIcons: Record<string, React.ReactNode> = {
        draft: <Clock className="w-4 h-4 text-slate-400" />,
        active: <Play className="w-4 h-4 text-emerald-400" />,
        paused: <Pause className="w-4 h-4 text-amber-400" />,
        completed: <CheckCircle className="w-4 h-4 text-teal-400" />,
        cancelled: <XCircle className="w-4 h-4 text-red-400" />,
    };

    const statusColors: Record<string, string> = {
        draft: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
        active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        paused: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        completed: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
        cancelled: 'text-red-400 bg-red-500/10 border-red-500/20',
    };

    return (
        <div className="space-y-6">
            <SafetyDisclaimer compact />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Beaker className="w-5 h-5 text-teal-400" />
                    <h3 className="text-lg font-semibold text-white">Experiment Lab</h3>
                    <span className="text-xs text-slate-500">{experiments.length} experiments</span>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-sm font-medium transition-all border border-teal-500/20"
                >
                    <Plus className="w-4 h-4" /> New Experiment
                </button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-teal-500/10 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
                    <h4 className="text-sm font-semibold text-teal-300 mb-4">Design Your Experiment</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Experiment Name</label>
                            <input value={name} onChange={e => setName(e.target.value)}
                                placeholder="e.g., Late Caffeine vs No Caffeine"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500/30" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-500 block mb-1">Intervention A</label>
                                <input value={intA} onChange={e => setIntA(e.target.value)}
                                    placeholder="e.g., No caffeine after 2pm"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500/30" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 block mb-1">Intervention B</label>
                                <input value={intB} onChange={e => setIntB(e.target.value)}
                                    placeholder="e.g., Normal caffeine intake"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500/30" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-2">Outcome Metrics</label>
                            <div className="flex flex-wrap gap-2">
                                {METRIC_OPTIONS.map(m => (
                                    <button key={m}
                                        onClick={() => setMetrics(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${metrics.includes(m) ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-white/5 text-slate-500 border border-white/5'
                                            }`}>
                                        {m.replace(/_/g, ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Duration: {days} days</label>
                            <input type="range" min={3} max={90} value={days} onChange={e => setDays(parseInt(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-400" />
                        </div>
                        {createError && <p className="text-xs text-red-400">{createError}</p>}
                        <button onClick={createExperiment}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500/20 to-cyan-500/20 hover:from-teal-500/30 hover:to-cyan-500/30 text-teal-300 font-semibold transition-all border border-teal-500/20">
                            Create Experiment
                        </button>
                    </div>
                </div>
            )}

            {/* Experiments List */}
            {loading ? (
                <div className="text-center py-12 text-slate-500 text-sm">Loading experiments...</div>
            ) : experiments.length === 0 ? (
                <div className="text-center py-12">
                    <Beaker className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No experiments yet. Create your first A/B test above.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {experiments.map(exp => {
                        const isExpanded = expandedId === exp.id;
                        const adhered = exp.adherence_log?.length || 0;
                        const progress = Math.round((adhered / exp.duration_days) * 100);

                        return (
                            <div key={exp.id} className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] overflow-hidden">
                                <button onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                                    className="w-full p-5 flex items-center justify-between text-left">
                                    <div className="flex items-center gap-3">
                                        {statusIcons[exp.status]}
                                        <div>
                                            <span className="text-sm font-medium text-white">{exp.name}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusColors[exp.status]}`}>
                                                    {exp.status}
                                                </span>
                                                <span className="text-xs text-slate-600">Day {adhered}/{exp.duration_days}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-20 h-2 rounded-full bg-slate-700">
                                            <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400" style={{ width: `${progress}%` }} />
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-3">
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                                <span className="text-slate-500">Arm A</span>
                                                <p className="text-white mt-1">{exp.intervention_a}</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                                <span className="text-slate-500">Arm B</span>
                                                <p className="text-white mt-1">{exp.intervention_b}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {exp.outcome_metrics?.map((m: string) => (
                                                <span key={m} className="px-2 py-1 rounded-lg text-[10px] bg-teal-500/10 text-teal-300 border border-teal-500/20">
                                                    {m.replace(/_/g, ' ')}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Results */}
                                        {exp.results && (
                                            <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/10">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs text-teal-300 font-medium">Results</span>
                                                    {exp.results.confidence && (
                                                        <ConfidenceBadge score={exp.results.confidence.score} level={exp.results.confidence.level} />
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400">{exp.results.recommendation}</p>
                                                <div className="mt-2 text-xs text-slate-500">
                                                    Adherence: {Math.round(exp.results.adherence_rate * 100)}%
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            {exp.status === 'draft' && (
                                                <button onClick={() => updateExperiment(exp.id, 'start')}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs hover:bg-emerald-500/20 transition-colors border border-emerald-500/20">
                                                    <Play className="w-3 h-3" /> Start
                                                </button>
                                            )}
                                            {exp.status === 'active' && (
                                                <>
                                                    <button onClick={() => updateExperiment(exp.id, 'pause')}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 text-xs hover:bg-amber-500/20 transition-colors border border-amber-500/20">
                                                        <Pause className="w-3 h-3" /> Pause
                                                    </button>
                                                    <button onClick={() => updateExperiment(exp.id, 'complete')}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-300 text-xs hover:bg-teal-500/20 transition-colors border border-teal-500/20">
                                                        <CheckCircle className="w-3 h-3" /> Complete
                                                    </button>
                                                </>
                                            )}
                                            {exp.status === 'paused' && (
                                                <button onClick={() => updateExperiment(exp.id, 'resume')}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs hover:bg-emerald-500/20 transition-colors border border-emerald-500/20">
                                                    <Play className="w-3 h-3" /> Resume
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
