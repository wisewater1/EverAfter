import { useState, useEffect } from 'react';
import { Brain, FileText, Radio, Sparkles, TrendingUp, Lightbulb } from 'lucide-react';
import ConfidenceBadge from './ConfidenceBadge';
import SafetyDisclaimer from './SafetyDisclaimer';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

interface Prediction {
    scenario: Record<string, number>;
    projections: Record<string, any>;
    confidence: { score: number; level: string };
    evidence: { type: string; label: string; is_causal: boolean };
    narrative: string;
}

interface ModelStatus {
    status: string;
    accuracy: number;
    status_description: string;
    predictions_evaluated: number;
}

interface MeasurementRec {
    label: string;
    expected_info_gain: number;
    rationale: string;
    priority_rank: number;
    category: string;
}

export default function CausalTwinDashboard({ memberId }: { memberId?: string }) {
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
    const [measurements, setMeasurements] = useState<MeasurementRec[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        setLoading(true);
        try {
            const params = memberId ? `?member_id=${memberId}` : '';
            const [predRes, modelRes, measRes] = await Promise.all([
                fetch(`${API_BASE}/api/v1/causal-twin/predictions${params}`).then(r => r.json()),
                fetch(`${API_BASE}/api/v1/causal-twin/model-health${params}`).then(r => r.json()),
                fetch(`${API_BASE}/api/v1/causal-twin/next-measurements${params}`).then(r => r.json()),
            ]);
            setPredictions(predRes.predictions || []);
            setModelStatus(modelRes.model_status || null);
            setMeasurements(measRes.recommendations || []);
        } catch (e) {
            console.error('Failed to load Causal Twin dashboard:', e);
        }
        setLoading(false);
    }

    const statusColors: Record<string, string> = {
        stable: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        learning: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        degraded: 'text-red-400 bg-red-500/10 border-red-500/20',
        recalibrating: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-3 text-teal-400">
                    <Brain className="w-6 h-6 animate-pulse" />
                    <span className="text-sm">Loading Causal Twin...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <SafetyDisclaimer compact />

            {/* Model Status Header */}
            {modelStatus && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Radio className="w-5 h-5 text-teal-400" />
                            <span className="text-sm text-slate-300 font-medium">Model Status</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${statusColors[modelStatus.status] || statusColors.stable}`}>
                                {modelStatus.status}
                            </span>
                            <span className="text-xs text-slate-500">
                                Accuracy: {(modelStatus.accuracy * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{modelStatus.status_description}</p>
                </div>
            )}

            {/* Current Predictions */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
                <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="w-5 h-5 text-teal-400" />
                    <h3 className="text-lg font-semibold text-white">Current Predictions</h3>
                </div>

                {predictions.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">
                        No predictions yet. Use the "What If" tab to simulate scenarios.
                    </p>
                ) : (
                    predictions.map((pred, i) => (
                        <div key={i} className="mb-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-teal-400" />
                                    <span className="text-sm text-white font-medium">
                                        Scenario: {Object.entries(pred.scenario).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                    </span>
                                </div>
                                <ConfidenceBadge
                                    score={pred.confidence.score}
                                    level={pred.confidence.level as 'high' | 'moderate' | 'low'}
                                />
                            </div>

                            {/* Metric Projections Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
                                {Object.entries(pred.projections).map(([metric, horizons]: [string, any]) => {
                                    const sevenDay = horizons['7d'] || horizons['3d'] || {};
                                    return (
                                        <div key={metric} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                            <span className="text-xs text-slate-500 uppercase tracking-wider">
                                                {metric.replace(/_/g, ' ')}
                                            </span>
                                            <div className="mt-1">
                                                <span className="text-lg font-bold text-white">{sevenDay.mid || '—'}</span>
                                                <span className="text-xs text-slate-500 ml-1">{sevenDay.unit || ''}</span>
                                            </div>
                                            <div className="text-xs text-slate-600 mt-0.5">
                                                {sevenDay.low}–{sevenDay.high} range
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Evidence Label */}
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <FileText className="w-3 h-3" />
                                <span>{pred.evidence.label}</span>
                                {!pred.evidence.is_causal && (
                                    <span className="text-amber-500/60">• Correlational</span>
                                )}
                            </div>

                            {pred.narrative && (
                                <p className="text-xs text-slate-400 mt-2 italic leading-relaxed">
                                    "{pred.narrative}"
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Next Best Measurements */}
            {measurements.length > 0 && (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
                    <div className="flex items-center gap-3 mb-4">
                        <Lightbulb className="w-5 h-5 text-amber-400" />
                        <h3 className="text-lg font-semibold text-white">Recommended Measurements</h3>
                    </div>

                    <div className="space-y-3">
                        {measurements.slice(0, 3).map((m, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 flex-shrink-0">
                                    <span className="text-xs font-bold text-amber-400">#{m.priority_rank}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-white font-medium">{m.label}</span>
                                        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                            +{(m.expected_info_gain * 100).toFixed(0)}% gain
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{m.rationale}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
