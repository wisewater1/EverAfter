import { useEffect, useState, useCallback } from 'react';
import { Thermometer, Droplets, TrendingUp, AlertCircle, Plus, X, Save, Database } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
    generateDelphiPrediction,
    storeHealthMetrics,
    saveTrajectorySnapshot,
    type DelphiPrediction,
    type ExtractedHealthData,
} from '../lib/raphael/healthDataService';

// ─── Quick Entry Form Types ──────────────────────────────────────────────────

interface QuickEntryField {
    label: string;
    metric_type: string;
    unit: string;
    placeholder: string;
    min?: number;
    max?: number;
    step?: number;
}

const QUICK_ENTRY_FIELDS: QuickEntryField[] = [
    { label: 'Heart Rate', metric_type: 'heart_rate', unit: 'bpm', placeholder: '72', min: 30, max: 220 },
    { label: 'Blood Pressure (Systolic)', metric_type: 'blood_pressure_systolic', unit: 'mmHg', placeholder: '120', min: 70, max: 220 },
    { label: 'Blood Pressure (Diastolic)', metric_type: 'blood_pressure_diastolic', unit: 'mmHg', placeholder: '80', min: 40, max: 140 },
    { label: 'Glucose', metric_type: 'glucose', unit: 'mg/dL', placeholder: '95', min: 30, max: 500 },
    { label: 'Weight', metric_type: 'weight', unit: 'lbs', placeholder: '165', min: 50, max: 500, step: 0.1 },
    { label: 'Sleep', metric_type: 'sleep_duration', unit: 'hours', placeholder: '7.5', min: 0, max: 24, step: 0.5 },
    { label: 'Steps', metric_type: 'steps', unit: 'steps', placeholder: '8000', min: 0, max: 100000 },
    { label: 'SpO2', metric_type: 'oxygen_saturation', unit: '%', placeholder: '98', min: 70, max: 100 },
];

// ─── Main Component ──────────────────────────────────────────────────────────

const TrajectoryDashboard: React.FC<{ userId: string }> = ({ userId }) => {
    const { user } = useAuth();
    const [prediction, setPrediction] = useState<DelphiPrediction | null>(null);
    const [loading, setLoading] = useState(true);
    const [showQuickEntry, setShowQuickEntry] = useState(false);
    const [quickEntryValues, setQuickEntryValues] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const effectiveUserId = userId || user?.id || '';

    const loadPrediction = useCallback(async () => {
        if (!effectiveUserId) return;
        setLoading(true);
        try {
            const pred = await generateDelphiPrediction(effectiveUserId);
            setPrediction(pred);

            // Save snapshot for long-term history (fire-and-forget)
            saveTrajectorySnapshot(effectiveUserId, pred).catch(() => { });
        } catch (error) {
            console.error('Error generating Delphi prediction:', error);
        } finally {
            setLoading(false);
        }
    }, [effectiveUserId]);

    useEffect(() => {
        loadPrediction();
    }, [loadPrediction]);

    const handleQuickEntrySave = async () => {
        if (!effectiveUserId) return;
        setSaving(true);
        setSaveMessage('');

        const dataPoints: ExtractedHealthData[] = [];
        for (const field of QUICK_ENTRY_FIELDS) {
            const val = quickEntryValues[field.metric_type];
            if (val && val.trim()) {
                const numVal = parseFloat(val);
                if (isFinite(numVal) && numVal > 0) {
                    dataPoints.push({
                        metric_type: field.metric_type,
                        value: numVal,
                        unit: field.unit,
                        raw_text: `${field.label}: ${numVal} ${field.unit}`,
                    });
                }
            }
        }

        if (dataPoints.length === 0) {
            setSaveMessage('Enter at least one value');
            setSaving(false);
            return;
        }

        const result = await storeHealthMetrics(effectiveUserId, dataPoints, 'manual_entry');

        if (result.error) {
            setSaveMessage(`Error: ${result.error}`);
        } else {
            setSaveMessage(`✓ Saved ${result.stored} metric${result.stored > 1 ? 's' : ''}`);
            setQuickEntryValues({});
            // Refresh prediction with new data
            await loadPrediction();
            setTimeout(() => {
                setShowQuickEntry(false);
                setSaveMessage('');
            }, 1500);
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest">Initializing Delphi...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header section with glassmorphism */}
            <div className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 -m-8 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl group-hover:bg-cyan-500/30 transition-all duration-700"></div>

                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
                            Delphi Health Trajectory
                        </h1>
                        <p className="text-zinc-400 font-medium">Predictive AI-derived physiological insights</p>
                        <div className="flex items-center gap-3 mt-2">
                            {prediction?.data_source === 'simulated' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                                    Simulated — Log vitals for live predictions
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                    <Database size={10} /> Live Data — {prediction?.metrics_used} metrics
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowQuickEntry(!showQuickEntry)}
                            className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-sm font-medium transition-all ${showQuickEntry
                                ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                                }`}
                        >
                            {showQuickEntry ? <X size={16} /> : <Plus size={16} />}
                            {showQuickEntry ? 'Close' : 'Log Vitals'}
                        </button>
                        <div className={`px-4 py-2 rounded-full border ${prediction?.risk_level === 'low' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : prediction?.risk_level === 'moderate' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            } flex items-center gap-2`}>
                            <TrendingUp size={18} />
                            <span className="uppercase tracking-wider text-xs font-bold">{prediction?.risk_level || 'Calculating...'} Risk</span>
                        </div>
                    </div>
                </div>

                {/* Quick Entry Form */}
                {showQuickEntry && (
                    <div className="mt-6 p-6 bg-zinc-900/60 rounded-2xl border border-white/10 relative z-10">
                        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest mb-4">Record Health Data</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {QUICK_ENTRY_FIELDS.map(field => (
                                <div key={field.metric_type}>
                                    <label className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">{field.label} ({field.unit})</label>
                                    <input
                                        type="number"
                                        placeholder={field.placeholder}
                                        min={field.min}
                                        max={field.max}
                                        step={field.step || 1}
                                        value={quickEntryValues[field.metric_type] || ''}
                                        onChange={(e) => setQuickEntryValues(prev => ({ ...prev, [field.metric_type]: e.target.value }))}
                                        className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:border-cyan-500/50 focus:outline-none transition-colors"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-xs text-zinc-500">{saveMessage}</span>
                            <button
                                onClick={handleQuickEntrySave}
                                disabled={saving}
                                className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50"
                            >
                                <Save size={14} />
                                {saving ? 'Saving...' : 'Save & Recalculate'}
                            </button>
                        </div>
                    </div>
                )}

                {/* The Graph */}
                <div className="mt-12 h-64 w-full relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
                        {/* Grid Lines */}
                        {[0, 25, 50, 75, 100].map(y => (
                            <line
                                key={y}
                                x1="0" y1={200 - y * 2} x2="1000" y2={200 - y * 2}
                                stroke="white"
                                strokeOpacity="0.05"
                                strokeDasharray="4 4"
                            />
                        ))}

                        {/* Y-axis labels */}
                        {[0, 25, 50, 75, 100].map(y => (
                            <text
                                key={`label-${y}`}
                                x="-5" y={200 - y * 2 + 4}
                                fill="white"
                                fillOpacity="0.3"
                                fontSize="10"
                                textAnchor="end"
                            >
                                {y}%
                            </text>
                        ))}

                        <defs>
                            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#06b6d4" />
                                <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                            </linearGradient>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {prediction?.trajectory && (
                            <>
                                {/* Area fill */}
                                <path
                                    d={`M 0,200 L ${prediction.trajectory.map((p, i) => `${(i / (prediction.trajectory.length - 1)) * 1000},${200 - p.value * 200}`).join(' L ')} L 1000,200 Z`}
                                    fill="url(#areaGradient)"
                                />
                                {/* Main line */}
                                <path
                                    d={`M ${prediction.trajectory.map((p, i) => `${(i / (prediction.trajectory.length - 1)) * 1000},${200 - p.value * 200}`).join(' L ')}`}
                                    fill="none"
                                    stroke="url(#lineGradient)"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    filter="url(#glow)"
                                />
                                {/* Data points */}
                                {prediction.trajectory.filter((_, i) => i % 4 === 0 || i === prediction.trajectory.length - 1).map((p, idx) => {
                                    const i = prediction.trajectory.indexOf(p);
                                    return (
                                        <circle
                                            key={idx}
                                            cx={(i / (prediction.trajectory.length - 1)) * 1000}
                                            cy={200 - p.value * 200}
                                            r="4"
                                            fill="#06b6d4"
                                            stroke="#0a0f15"
                                            strokeWidth="2"
                                            className="drop-shadow-[0_0_4px_rgba(6,182,212,0.6)]"
                                        />
                                    );
                                })}
                            </>
                        )}
                    </svg>

                    <div className="flex justify-between mt-4 text-[10px] uppercase tracking-tighter text-zinc-500">
                        <span>Now</span>
                        <span>+6h</span>
                        <span>+12h</span>
                        <span>+18h</span>
                        <span>+24h</span>
                    </div>
                </div>
            </div>

            {/* Grid of detail cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Primary Insight */}
                <div className="backdrop-blur-lg bg-zinc-900/40 border border-white/10 rounded-2xl p-6 hover:bg-zinc-900/60 transition-colors">
                    <div className="flex items-center gap-3 mb-4 text-cyan-400">
                        <AlertCircle size={20} />
                        <h3 className="font-semibold uppercase tracking-widest text-xs">Primary Insight</h3>
                    </div>
                    <p className="text-zinc-300 text-sm leading-relaxed">
                        {prediction?.contributing_factors?.[0] || "Deep-layer metabolic analysis in progress..."}
                    </p>
                    {prediction?.contributing_factors && prediction.contributing_factors.length > 1 && (
                        <ul className="mt-3 space-y-2">
                            {prediction.contributing_factors.slice(1, 4).map((factor, i) => (
                                <li key={i} className="flex items-start gap-2 text-zinc-500 text-xs">
                                    <div className="w-1 h-1 bg-cyan-500/50 rounded-full mt-1.5 shrink-0"></div>
                                    {factor}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Model Trust */}
                <div className="backdrop-blur-lg bg-zinc-900/40 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4 text-blue-400">
                        <Thermometer size={20} />
                        <h3 className="font-semibold uppercase tracking-widest text-xs">Model Trust</h3>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-white">
                            {prediction?.confidence != null ? (prediction.confidence * 100).toFixed(0) : '0'}%
                        </span>
                        <span className="text-zinc-500 text-xs mb-1">Delphi Convergence</span>
                    </div>
                    <div className="mt-4 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${(prediction?.confidence || 0) * 100}%` }}
                        ></div>
                    </div>
                    <p className="text-zinc-600 text-[10px] mt-2 uppercase tracking-widest">
                        Based on {prediction?.metrics_used || 0} data points · {prediction?.data_source === 'live' ? 'Real data' : 'Simulated'}
                    </p>
                </div>

                {/* Raphael's Focus */}
                <div className="backdrop-blur-lg bg-zinc-900/40 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4 text-indigo-400">
                        <Droplets size={20} />
                        <h3 className="font-semibold uppercase tracking-widest text-xs">Raphael's Focus</h3>
                    </div>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-2 text-zinc-400 text-xs">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1 shrink-0"></div>
                            {prediction?.data_source === 'live'
                                ? 'Monitoring active health metrics for anomalies'
                                : 'Log vitals via chat or quick-entry for personalized insights'}
                        </li>
                        <li className="flex items-start gap-2 text-zinc-400 text-xs">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1 shrink-0"></div>
                            Prioritize REM sleep phase optimization
                        </li>
                        <li className="flex items-start gap-2 text-zinc-400 text-xs">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1 shrink-0"></div>
                            Monitor HRV during afternoon recovery window
                        </li>
                    </ul>
                </div>
            </div>

            {/* Prediction metadata */}
            <div className="flex items-center justify-between text-zinc-600 text-[10px] uppercase tracking-widest px-2">
                <span>Horizon: {prediction?.horizon || '24h'}</span>
                <span>Model: Delphi v1 Transformer</span>
                <span>Type: {prediction?.prediction_type || 'composite_health'}</span>
            </div>
        </div>
    );
};

export default TrajectoryDashboard;
