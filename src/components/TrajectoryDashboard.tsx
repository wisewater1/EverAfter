import React, { useEffect, useState } from 'react';
import { Thermometer, Droplets, TrendingUp, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface PredictionPoint {
    timestamp: string;
    value: number;
}

interface PredictionResult {
    prediction_type: string;
    predicted_value: number;
    confidence: number;
    horizon: string;
    risk_level: string;
    contributing_factors: string[];
    trajectory?: PredictionPoint[];
}

const TrajectoryDashboard: React.FC<{ userId: string }> = ({ userId }) => {
    const [predictions, setPredictions] = useState<PredictionResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPredictions = async () => {
            try {
                const response = await axios.get(`/api/v1/health/predictions/${userId}`);
                setPredictions(response.data);
            } catch (error) {
                console.error('Error fetching predictions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPredictions();
    }, [userId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    const prediction = predictions[0]; // Primary Delphi trajectory

    return (
        <div className="p-6 space-y-8 max-w-5xl mx-auto">
            {/* Header section with glassmorphism */}
            <div className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 -m-8 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl group-hover:bg-cyan-500/30 transition-all duration-700"></div>

                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
                            Delphi Health Trajectory
                        </h1>
                        <p className="text-zinc-400 font-medium">Predictive AI-derived physiological insights</p>
                    </div>
                    <div className={`px-4 py-2 rounded-full border ${prediction?.risk_level === 'low' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'} flex items-center gap-2`}>
                        <TrendingUp size={18} />
                        <span className="uppercase tracking-wider text-xs font-bold">{prediction?.risk_level || 'Calculating...'} Risk</span>
                    </div>
                </div>

                {/* The Graph (SVG implementation for maximum style control) */}
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

                        {/* The Actual Line with Gradient and Glow */}
                        <defs>
                            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#06b6d4" />
                                <stop offset="100%" stopColor="#3b82f6" />
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
                            <path
                                d={`M ${prediction.trajectory.map((p, i) => `${(i / 23) * 1000},${200 - p.value * 200}`).join(' L ')}`}
                                fill="none"
                                stroke="url(#lineGradient)"
                                strokeWidth="4"
                                strokeLinecap="round"
                                filter="url(#glow)"
                                className="drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                            />
                        )}

                        {/* Area under the line */}
                        {prediction?.trajectory && (
                            <path
                                d={`M 0,200 L ${prediction.trajectory.map((p, i) => `${(i / 23) * 1000},${200 - p.value * 200}`).join(' L ')} L 1000,200 Z`}
                                fill="url(#lineGradient)"
                                fillOpacity="0.05"
                            />
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

            {/* Grid of details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Insight Card */}
                <div className="backdrop-blur-lg bg-zinc-900/40 border border-white/10 rounded-2xl p-6 hover:bg-zinc-900/60 transition-colors">
                    <div className="flex items-center gap-3 mb-4 text-cyan-400">
                        <AlertCircle size={20} />
                        <h3 className="font-semibold uppercase tracking-widest text-xs">Primary Insight</h3>
                    </div>
                    <p className="text-zinc-300 text-sm leading-relaxed">
                        {prediction?.contributing_factors?.[0] || "Deep-layer metabolic analysis in progress..."}
                    </p>
                </div>

                {/* Confidence Card */}
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
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(prediction?.confidence || 0) * 100}%` }}></div>
                    </div>
                </div>

                {/* Actionable items */}
                <div className="backdrop-blur-lg bg-zinc-900/40 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4 text-indigo-400">
                        <Droplets size={20} />
                        <h3 className="font-semibold uppercase tracking-widest text-xs">Raphael's Focus</h3>
                    </div>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-2 text-zinc-400 text-xs">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1 shrink-0"></div>
                            Prioritize REM sleep phase optimization
                        </li>
                        <li className="flex items-start gap-2 text-zinc-400 text-xs">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1 shrink-0"></div>
                            Adjust hydration for 14:00 glucose dip
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default TrajectoryDashboard;
