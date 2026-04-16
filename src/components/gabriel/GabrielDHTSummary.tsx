/**
 * GabrielDHTSummary — OCEAN-aware health summary for St. Gabriel.
 *
 * St. Gabriel is the messenger/communicator Saint. He reads the DHT trajectory
 * and OCEAN behavioral modifiers for the user, then produces a tone-calibrated
 * plain-language health summary that respects the user's communication style.
 *
 * Alert style (calm / moderate / direct) is derived from OCEAN Neuroticism + Agreeableness.
 * Plan style (structured / exploratory / supportive) drives how next steps are phrased.
 */
import { useState, useEffect } from 'react';
import { MessageSquare, Brain, Loader2, RefreshCw, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { getDHT, getBehavioralModifiers } from '../../lib/dhtApi';

const DIRECTION_EMOJI: Record<string, string> = {
    improving: '📈', stable: '➡️', declining: '📉', critical: '🚨', unknown: '❓'
};

const TONE_CONFIG: Record<string, { label: string; color: string; tagline: string }> = {
    calm: {
        label: 'Gentle Tone',
        color: '#10b981',
        tagline: 'Gabriel communicates softly, avoiding alarm language.',
    },
    moderate: {
        label: 'Balanced Tone',
        color: '#f59e0b',
        tagline: 'Gabriel speaks directly but with measured language.',
    },
    high: {
        label: 'Direct Tone',
        color: '#ef4444',
        tagline: 'Gabriel communicates clearly and concisely.',
    },
};

function generateSummary(dht: unknown, modifiers: unknown): string {
    if (!dht) return 'No health trajectory data available yet. Complete your Delphi profile to receive personalized health guidance from Gabriel.';

    const dir = dht.overall_direction || 'unknown';
    const conf = Math.round((dht.confidence || 0) * 100);
    const alertStyle = modifiers?.alert_sensitivity || 'moderate';
    const planStyle = modifiers?.intervention_style || 'structured';
    const obs = dht.observation_count || 0;

    const openings: Record<string, string> = {
        calm: `Based on ${obs} data points, your overall health picture looks ${dir === 'improving' ? 'encouraging' : dir === 'stable' ? 'steady' : 'worth paying attention to'}.`,
        moderate: `Your Delphi trajectory (${obs} observations, ${conf}% confidence) shows ${dir} health momentum.`,
        high: `Health status: ${dir.toUpperCase()} — ${conf}% model confidence across ${obs} observations.`,
    };
    const opening = openings[alertStyle] || openings.moderate;

    const riskCount = (dht.risk_cards || []).filter((c: unknown) => ['high', 'critical'].includes(c.current_level)).length;
    const riskLine = riskCount > 0
        ? ` ${riskCount} health domain${riskCount > 1 ? 's' : ''} ${alertStyle === 'calm' ? 'may benefit from attention' : 'showing elevated risk'}.`
        : ` No elevated risk domains detected.`;

    const actionPrefixes: Record<string, string> = {
        structured: 'Recommended next step:',
        exploratory: 'Worth experimenting with:',
        supportive: 'One gentle suggestion:',
    };
    const actionPrefix = actionPrefixes[planStyle] || actionPrefixes.structured;

    const nbm = dht.next_best_measurement;
    const actionLine = nbm
        ? ` ${actionPrefix} measure your ${nbm.label} to reduce trajectory uncertainty by ~${nbm.uncertainty_reduction_pct?.toFixed(0) || 10}%.`
        : '';

    return `${opening}${riskLine}${actionLine}`;
}

interface GabrielDHTSummaryProps {
    personId: string;
}

export default function GabrielDHTSummary({ personId }: GabrielDHTSummaryProps) {
    const [dht, setDht] = useState<unknown>(null);
    const [modifiers, setModifiers] = useState<unknown>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    async function load(soft = false) {
        if (soft) setRefreshing(true); else setLoading(true);
        const [dhtResp, modResp] = await Promise.all([
            getDHT(personId),
            getBehavioralModifiers(personId),
        ]);
        setDht(dhtResp?.dht || null);
        setModifiers(modResp?.modifiers || null);
        setLoading(false);
        setRefreshing(false);
    }

    useEffect(() => { load(); }, [personId]);

    const summary = generateSummary(dht, modifiers);
    const alertStyle = modifiers?.alert_sensitivity || 'moderate';
    const toneCfg = TONE_CONFIG[alertStyle] || TONE_CONFIG.moderate;
    const dir = dht?.overall_direction || 'unknown';
    const DirectionIcon = dir === 'improving' ? TrendingUp : dir === 'declining' ? TrendingDown : Minus;

    return (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-emerald-500/15 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-white">Gabriel's Health Message</p>
                        <p className="text-[10px] text-slate-500">OCEAN-calibrated · Delphi-powered</p>
                    </div>
                </div>
                <button onClick={() => load(true)} disabled={refreshing}
                    className="p-1 text-slate-600 hover:text-slate-400 disabled:opacity-40 transition-colors">
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 p-5 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />Composing message…
                </div>
            ) : (
                <div className="p-5 space-y-4">
                    {/* Tone badge */}
                    <div className="flex items-center gap-2">
                        <Brain className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] text-slate-500">Tone: </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                            style={{ color: toneCfg.color, borderColor: toneCfg.color + '30', backgroundColor: toneCfg.color + '10' }}>
                            {toneCfg.label}
                        </span>
                        <span className="text-[9px] text-slate-600">{toneCfg.tagline}</span>
                    </div>

                    {/* Direction summary bar */}
                    {dht && (
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                            <span className="text-lg">{DIRECTION_EMOJI[dir]}</span>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <DirectionIcon className="w-3 h-3" style={{ color: dir === 'improving' ? '#10b981' : dir === 'declining' ? '#ef4444' : '#f59e0b' }} />
                                    <span className="text-[10px] font-bold text-white capitalize">{dir}</span>
                                    <span className="text-[10px] text-slate-500">·</span>
                                    <span className="text-[10px] text-slate-500">{Math.round((dht.confidence || 0) * 100)}% confidence</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                                    <div className="h-full rounded-full" style={{
                                        width: `${(dht.confidence || 0) * 100}%`,
                                        backgroundColor: dir === 'improving' ? '#10b981' : dir === 'declining' ? '#ef4444' : '#f59e0b'
                                    }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Gabriel's message */}
                    <div className="px-4 py-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 relative">
                        <Sparkles className="w-3 h-3 text-emerald-500/40 absolute top-3 right-3" />
                        <p className="text-xs text-slate-200 leading-relaxed">{summary}</p>
                        <p className="text-[10px] text-emerald-600/60 mt-3 font-medium">— St. Gabriel, Messenger & Health Communicator</p>
                    </div>

                    {/* Plan style badge */}
                    {modifiers?.intervention_style && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span>Plan style:</span>
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-400 capitalize">
                                {modifiers.intervention_style}
                            </span>
                            <span>·</span>
                            <span>Nudge frequency: <span className="text-slate-400 capitalize">{modifiers.nudge_frequency}</span></span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
