/**
 * DHTAnomalyAlertChain — St. Michael's DHT anomaly → security alert bridge.
 *
 * Polls the DHT API for anomalies on the current user's trajectory, then
 * renders them as Guardian-styled health security alerts that Michael can
 * escalate to the EmergencyAlertChain or log as audit events.
 */
import { useState, useEffect } from 'react';
import { AlertTriangle, Activity, Loader2, RefreshCw, CheckCircle, ExternalLink } from 'lucide-react';
import { getRiskCards, getDHT } from '../../lib/dhtApi';
import { useNavigate } from 'react-router-dom';

const LEVEL_COLORS: Record<string, { text: string; bg: string; border: string; glow: string }> = {
    critical: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', glow: 'shadow-rose-500/20' },
    high: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', glow: 'shadow-orange-500/10' },
    moderate: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: 'shadow-amber-500/10' },
    low: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: '' },
};

interface DHTAnomalyAlertChainProps {
    personId: string;
}

export default function DHTAnomalyAlertChain({ personId }: DHTAnomalyAlertChainProps) {
    const [anomalies, setAnomalies] = useState<any[]>([]);
    const [riskCards, setRiskCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastScan, setLastScan] = useState<Date>(new Date());
    const navigate = useNavigate();

    async function load(soft = false) {
        if (soft) setRefreshing(true); else setLoading(true);
        const [dht, cards] = await Promise.all([
            getDHT(personId),
            getRiskCards(personId),
        ]);
        setAnomalies(dht?.dht?.anomalies || []);
        setRiskCards((cards?.risk_cards || []).filter((c: any) => c.current_level === 'high' || c.current_level === 'critical'));
        setLastScan(new Date());
        setLoading(false);
        setRefreshing(false);
    }

    useEffect(() => { load(); }, [personId]);

    // Re-poll every 90 seconds (aligned with DHT recompute latency target)
    useEffect(() => {
        const interval = setInterval(() => load(true), 90_000);
        return () => clearInterval(interval);
    }, [personId]);

    const totalAlerts = anomalies.length + riskCards.length;

    return (
        <div className="rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-rose-500/15 rounded-xl flex items-center justify-center">
                        <Activity className="w-4 h-4 text-rose-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">DHT Health Anomaly Chain</h3>
                        <p className="text-[10px] text-slate-500">Delphi → Michael alert bridge · syncs every 90s</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {totalAlerts > 0 ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                            {totalAlerts} ACTIVE
                        </span>
                    ) : (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            CLEAR
                        </span>
                    )}
                    <button onClick={() => load(true)} disabled={refreshing}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 transition-colors disabled:opacity-40">
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 p-5 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />Scanning Delphi trajectory for anomalies…
                </div>
            ) : (
                <div className="p-4 space-y-3">
                    {/* Anomalous data points */}
                    {anomalies.map((a, i) => {
                        const cfg = LEVEL_COLORS[a.severity] || LEVEL_COLORS.moderate;
                        return (
                            <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${cfg.bg} ${cfg.border} shadow-lg ${cfg.glow}`}>
                                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.text}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`text-[9px] uppercase font-black tracking-widest ${cfg.text}`}>
                                            DHT ANOMALY — {a.severity?.toUpperCase() || 'MODERATE'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-300">
                                        <span className="font-semibold">{a.metric}</span>: {a.value} {a.unit}
                                        {a.z_score && <span className="text-slate-500 ml-1">(z={a.z_score?.toFixed(1)})</span>}
                                    </p>
                                    {a.timestamp && (
                                        <p className="text-[10px] text-slate-600 mt-0.5">
                                            {new Date(a.timestamp).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                                <button onClick={() => navigate('/health')}
                                    className={`text-[10px] font-bold ${cfg.text} flex items-center gap-1 shrink-0`}>
                                    <ExternalLink className="w-3 h-3" /> Delphi
                                </button>
                            </div>
                        );
                    })}

                    {/* Elevated risk cards from DHT */}
                    {riskCards.map((card, i) => {
                        const cfg = LEVEL_COLORS[card.current_level] || LEVEL_COLORS.moderate;
                        return (
                            <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.text}`} />
                                <div className="flex-1 min-w-0">
                                    <span className={`text-[9px] uppercase font-black tracking-widest ${cfg.text}`}>
                                        ELEVATED RISK — {card.domain?.toUpperCase()}
                                    </span>
                                    <p className="text-xs text-slate-300 mt-0.5">{card.current_level} risk · {Math.round(card.confidence * 100)}% confidence</p>
                                    {card.suggested_action && (
                                        <p className="text-[10px] text-slate-500 mt-1">💡 {card.suggested_action}</p>
                                    )}
                                </div>
                                <button onClick={() => navigate('/health')}
                                    className={`text-[10px] font-bold ${cfg.text} flex items-center gap-1 shrink-0`}>
                                    <ExternalLink className="w-3 h-3" /> Review
                                </button>
                            </div>
                        );
                    })}

                    {totalAlerts === 0 && (
                        <div className="flex items-center gap-3 px-4 py-5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-emerald-300">All health trajectories normal</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    Last scan: {lastScan.toLocaleTimeString()} · No anomalies or elevated risks detected.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
