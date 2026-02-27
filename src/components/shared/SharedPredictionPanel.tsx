import { useState, useEffect, useCallback } from 'react';
import {
    Activity, TrendingUp, TrendingDown, Minus, AlertTriangle,
    Shield, Brain, Beaker, ChevronRight, RefreshCw
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

/* ── Types ──────────────────────────────────────────────────────── */

interface RiskFactor {
    factor: string;
    weight: number;
    source: string;
}

interface UncertaintyMeta {
    confidence_score: number;
    confidence_level: 'high' | 'moderate' | 'low';
    evidence_type: string;
    data_days: number;
    data_completeness: number;
    explanation: string;
}

interface TrajectoryPoint {
    timestamp: string;
    value: number;
    confidence: number;
}

interface PredictionBundle {
    user_id: string;
    metric: string;
    predicted_value: number;
    risk_level: 'low' | 'moderate' | 'high' | 'critical';
    trend: 'improving' | 'declining' | 'stable' | 'unknown';
    risk_factors: RiskFactor[];
    trajectory: TrajectoryPoint[];
    uncertainty: UncertaintyMeta;
    recommendations: string[];
    generated_at: string;
}

interface EarlyWarning {
    warning_id: string;
    metric: string;
    severity: string;
    trend: string;
    message: string;
    recommended_action: string;
    confidence: number;
}

interface SimulationResult {
    scenario_id: string;
    predicted_outcome: Record<string, number>;
    risk_change: Record<string, string>;
    confidence_interval: Record<string, number[]>;
    narrative: string;
    uncertainty: UncertaintyMeta;
}

/* ── Props ──────────────────────────────────────────────────────── */

interface SharedPredictionPanelProps {
    /** Which saint is embedding this panel */
    saint: 'raphael' | 'joseph';
    /** Optional: metrics history for individual prediction */
    metricsHistory?: any[];
    /** Optional: user profile context */
    profile?: Record<string, any>;
    /** Compact mode for embedding in smaller spaces */
    compact?: boolean;
}

/* ── Helpers ────────────────────────────────────────────────────── */

const RISK_COLORS: Record<string, string> = {
    low: '#10b981',
    moderate: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626',
};

const CONFIDENCE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
    high: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'High confidence' },
    moderate: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Moderate confidence' },
    low: { bg: 'bg-rose-500/15', text: 'text-rose-400', label: 'Low confidence' },
};

const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'improving') return <TrendingDown className="w-4 h-4 text-emerald-400" />;
    if (trend === 'declining') return <TrendingUp className="w-4 h-4 text-rose-400" />;
    return <Minus className="w-4 h-4 text-slate-500" />;
};

/* ═══════════════════════════════════════════════════════════════ */

export default function SharedPredictionPanel({
    saint,
    metricsHistory = [],
    profile,
    compact = false,
}: SharedPredictionPanelProps) {
    const [prediction, setPrediction] = useState<PredictionBundle | null>(null);
    const [warnings, setWarnings] = useState<EarlyWarning[]>([]);
    const [simulation, setSimulation] = useState<SimulationResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [simulating, setSimulating] = useState(false);
    const [showSim, setShowSim] = useState(false);
    const [simMetric, setSimMetric] = useState('heart_rate');
    const [simChange, setSimChange] = useState(5);

    /* ── Fetch prediction ─────────────────────────────────────── */

    const fetchPrediction = useCallback(async () => {
        setLoading(true);
        try {
            const [predRes, warnRes] = await Promise.all([
                fetch(`${API_BASE}/api/v1/health-predictions/predict`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        metrics_history: metricsHistory,
                        profile: profile || {},
                    }),
                }),
                fetch(`${API_BASE}/api/v1/health-predictions/early-warnings`),
            ]);
            if (predRes.ok) {
                const data = await predRes.json();
                setPrediction(data);
            }
            if (warnRes.ok) {
                const data = await warnRes.json();
                setWarnings(data.warnings || []);
            }
        } catch (err) {
            console.error('SharedPredictionPanel: fetch failed', err);
        }
        setLoading(false);
    }, [metricsHistory, profile]);

    useEffect(() => { fetchPrediction(); }, [fetchPrediction]);

    /* ── Simulate scenario ────────────────────────────────────── */

    const runSimulation = async () => {
        setSimulating(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/health-predictions/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenarios: [{ metric: simMetric, change_type: 'increase', change_value: simChange, duration_days: 30 }],
                    baseline_metrics: metricsHistory,
                }),
            });
            if (res.ok) setSimulation(await res.json());
        } catch (err) {
            console.error('Simulation failed:', err);
        }
        setSimulating(false);
    };

    /* ── Render ────────────────────────────────────────────────── */

    const accent = saint === 'raphael' ? 'teal' : 'amber';

    if (loading) {
        return (
            <div className="rounded-2xl bg-[#13131a] border border-white/5 p-6 animate-pulse">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Activity className="w-4 h-4" />
                    Analyzing health predictions…
                </div>
            </div>
        );
    }

    if (!prediction) return null;

    const badge = CONFIDENCE_BADGE[prediction.uncertainty.confidence_level] || CONFIDENCE_BADGE.low;
    const riskColor = RISK_COLORS[prediction.risk_level] || RISK_COLORS.moderate;

    return (
        <div className="space-y-4">
            {/* ── Main Prediction Card ─────────────────────────── */}
            <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5 shadow-lg">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Brain className={`w-4 h-4 text-${accent}-400`} />
                        <span className="text-sm font-semibold text-white">Health Prediction</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${badge.bg} ${badge.text} font-medium`}>
                            {badge.label}
                        </span>
                    </div>
                    <button onClick={fetchPrediction} className="p-1.5 rounded-lg hover:bg-white/5 transition text-slate-500 hover:text-white">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Risk overview */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold" style={{ color: riskColor }}>
                            {prediction.predicted_value.toFixed(0)}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">Risk Score</div>
                    </div>
                    <div className="text-center flex flex-col items-center">
                        <TrendIcon trend={prediction.trend} />
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">
                            {prediction.trend}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-white">
                            {prediction.uncertainty.confidence_score.toFixed(0)}%
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">Confidence</div>
                    </div>
                </div>

                {/* Mini trajectory sparkline */}
                {prediction.trajectory.length > 0 && (
                    <div className="h-12 flex items-end gap-px mb-4 px-1">
                        {prediction.trajectory.map((pt, i) => {
                            const maxVal = Math.max(...prediction.trajectory.map(p => p.value), 1);
                            const height = (pt.value / maxVal) * 100;
                            return (
                                <div
                                    key={i}
                                    className="flex-1 rounded-t transition-all"
                                    style={{
                                        height: `${height}%`,
                                        backgroundColor: riskColor,
                                        opacity: 0.3 + pt.confidence * 0.7,
                                    }}
                                />
                            );
                        })}
                    </div>
                )}

                {/* Risk factors */}
                {prediction.risk_factors.length > 0 && !compact && (
                    <div className="space-y-1.5 mb-4">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Risk Factors</div>
                        {prediction.risk_factors.slice(0, 3).map((f, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${f.weight * 100}%`, backgroundColor: riskColor }} />
                                </div>
                                <span className="text-xs text-slate-400">{f.factor}</span>
                                <span className="text-[9px] text-slate-600 ml-auto">{f.source.replace('_', ' ')}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Recommendations */}
                {prediction.recommendations.length > 0 && (
                    <div className="space-y-1.5">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Recommendations</div>
                        {prediction.recommendations.slice(0, compact ? 1 : 3).map((rec, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                <ChevronRight className="w-3 h-3 text-slate-600 mt-0.5 flex-shrink-0" />
                                {rec}
                            </div>
                        ))}
                    </div>
                )}

                {/* Evidence type badge */}
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                    <Shield className="w-3 h-3 text-slate-600" />
                    <span className="text-[10px] text-slate-600">
                        Evidence: {prediction.uncertainty.evidence_type.replace('_', ' ')} · {prediction.uncertainty.data_days} days of data
                    </span>
                </div>
            </div>

            {/* ── Early Warnings ───────────────────────────────── */}
            {warnings.length > 0 && (
                <div className="rounded-2xl bg-rose-500/[0.05] border border-rose-500/10 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span className="text-sm font-semibold text-rose-300">Early Warnings</span>
                    </div>
                    {warnings.slice(0, 3).map(w => (
                        <div key={w.warning_id} className="mb-2 last:mb-0">
                            <p className="text-xs text-rose-200">{w.message}</p>
                            <p className="text-[10px] text-rose-400/60 mt-0.5">{w.recommended_action}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── What-If Simulator ───────────────────────────── */}
            {!compact && (
                <div className="rounded-2xl bg-[#13131a] border border-white/5 p-4">
                    <button
                        onClick={() => setShowSim(!showSim)}
                        className="flex items-center gap-2 w-full text-left"
                    >
                        <Beaker className={`w-4 h-4 text-${accent}-400`} />
                        <span className="text-sm font-semibold text-white">What-If Scenario</span>
                        <ChevronRight className={`w-3.5 h-3.5 text-slate-500 ml-auto transition-transform ${showSim ? 'rotate-90' : ''}`} />
                    </button>

                    {showSim && (
                        <div className="mt-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Metric</label>
                                    <select
                                        value={simMetric}
                                        onChange={e => setSimMetric(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-white/20"
                                    >
                                        <option value="heart_rate">Heart Rate</option>
                                        <option value="glucose">Glucose</option>
                                        <option value="stress_index">Stress Index</option>
                                        <option value="sleep_quality">Sleep Quality</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Change</label>
                                    <input
                                        type="number"
                                        value={simChange}
                                        onChange={e => setSimChange(Number(e.target.value))}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-white/20"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={runSimulation}
                                disabled={simulating}
                                className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${simulating
                                    ? 'bg-white/5 text-slate-500'
                                    : `bg-${accent}-500/20 text-${accent}-400 hover:bg-${accent}-500/30 border border-${accent}-500/20`
                                    }`}
                            >
                                {simulating ? 'Simulating…' : 'Run Scenario'}
                            </button>

                            {/* Simulation result */}
                            {simulation && (
                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2">
                                    <p className="text-xs text-slate-300">{simulation.narrative}</p>
                                    {Object.entries(simulation.risk_change).map(([metric, change]) => (
                                        <div key={metric} className="flex items-center gap-2 text-[11px]">
                                            <span className="text-slate-500">{metric.replace('_', ' ')}:</span>
                                            <span className={
                                                change === 'improved' ? 'text-emerald-400' :
                                                    change === 'worsened' ? 'text-rose-400' :
                                                        'text-slate-400'
                                            }>
                                                {change}
                                            </span>
                                            {simulation.confidence_interval[metric] && (
                                                <span className="text-slate-600 ml-auto">
                                                    [{simulation.confidence_interval[metric].join(' – ')}]
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                                        <Shield className="w-3 h-3 text-slate-600" />
                                        <span className="text-[9px] text-slate-600">
                                            Medical Twin projection · {simulation.uncertainty.confidence_score.toFixed(0)}% confidence
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
