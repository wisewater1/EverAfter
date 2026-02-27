import React, { useState, useEffect } from 'react';
import { Radio, TrendingUp, AlertTriangle, RefreshCw, CheckCircle, Activity } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export default function ModelHealthPanel({ memberId }: { memberId?: string }) {
    const [health, setHealth] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadHealth(); }, []);

    async function loadHealth() {
        setLoading(true);
        try {
            const params = memberId ? `?member_id=${memberId}` : '';
            const res = await fetch(`${API_BASE}/api/v1/causal-twin/model-health${params}`);
            const data = await res.json();
            setHealth(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Radio className="w-6 h-6 text-teal-400 animate-pulse" />
            </div>
        );
    }

    if (!health) return null;

    const ms = health.model_status || {};
    const trend = ms.accuracy_trend || [];
    const driftHistory = health.drift_history || [];

    const statusConfig: Record<string, { color: string; icon: React.ReactNode; bg: string }> = {
        stable: { color: 'text-emerald-400', icon: <CheckCircle className="w-6 h-6" />, bg: 'from-emerald-500/10 to-green-500/10 border-emerald-500/20' },
        learning: { color: 'text-blue-400', icon: <Activity className="w-6 h-6" />, bg: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20' },
        degraded: { color: 'text-red-400', icon: <AlertTriangle className="w-6 h-6" />, bg: 'from-red-500/10 to-rose-500/10 border-red-500/20' },
        recalibrating: { color: 'text-amber-400', icon: <RefreshCw className="w-6 h-6 animate-spin" />, bg: 'from-amber-500/10 to-orange-500/10 border-amber-500/20' },
    };

    const sc = statusConfig[ms.status] || statusConfig.stable;

    // Compute simple sparkline from accuracy trend
    const maxAcc = Math.max(...trend.map((t: any) => t.accuracy), 0.5);
    const minAcc = Math.min(...trend.map((t: any) => t.accuracy), 0);
    const range = maxAcc - minAcc || 0.1;

    return (
        <div className="space-y-6">
            {/* Status Header */}
            <div className={`p-6 rounded-3xl bg-gradient-to-br ${sc.bg} border shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]`}>
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-black/20 flex items-center justify-center ${sc.color}`}>
                        {sc.icon}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-white capitalize">{ms.status}</h3>
                            <span className="text-sm text-slate-400">
                                {(ms.accuracy * 100).toFixed(1)}% accuracy
                            </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{ms.status_description}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-slate-600 block">Predictions evaluated</span>
                        <span className="text-2xl font-bold text-white">{ms.predictions_evaluated}</span>
                    </div>
                </div>
            </div>

            {/* Accuracy Trend */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
                <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="w-5 h-5 text-teal-400" />
                    <h3 className="text-sm font-semibold text-white">Prediction Accuracy Trend</h3>
                </div>

                {/* Sparkline */}
                <div className="h-32 flex items-end gap-[2px]">
                    {trend.slice(-60).map((point: any, i: number) => {
                        const height = ((point.accuracy - minAcc) / range) * 100;
                        const isRecent = i >= trend.length - 5;
                        return (
                            <div
                                key={i}
                                className={`flex-1 rounded-t-sm transition-all ${point.accuracy >= 0.8 ? 'bg-emerald-500/40' :
                                    point.accuracy >= 0.6 ? 'bg-amber-500/40' :
                                        'bg-red-500/40'
                                    } ${isRecent ? 'opacity-100' : 'opacity-60'}`}
                                style={{ height: `${Math.max(height, 4)}%` }}
                                title={`${(point.accuracy * 100).toFixed(1)}% — ${new Date(point.timestamp).toLocaleDateString()}`}
                            />
                        );
                    })}
                </div>
                <div className="flex justify-between text-xs text-slate-600 mt-2">
                    <span>30 days ago</span>
                    <span>Today</span>
                </div>
            </div>

            {/* Drift History */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
                <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-semibold text-white">Drift Events</h3>
                </div>

                {driftHistory.length === 0 ? (
                    <div className="text-center py-8">
                        <CheckCircle className="w-8 h-8 text-emerald-500/30 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">No drift events detected. Model is performing well.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {driftHistory.map((event: any) => (
                            <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <div className={`w-2 h-2 rounded-full ${event.status === 'resolved' ? 'bg-emerald-400' :
                                    event.status === 'recalibrating' ? 'bg-amber-400 animate-pulse' :
                                        'bg-red-400'
                                    }`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white">
                                        Accuracy dropped from {(event.old_accuracy * 100).toFixed(1)}% to {(event.new_accuracy * 100).toFixed(1)}%
                                    </p>
                                    <span className="text-[10px] text-slate-600">
                                        {new Date(event.created_at).toLocaleDateString()} · {event.status}
                                    </span>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${event.status === 'resolved' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' :
                                    'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                                    }`}>{event.status}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
