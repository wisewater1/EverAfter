/**
 * OceanBehavioralLayer — shows OCEAN personality scores and derived behavioral
 * health modifiers. Used in St. Joseph Personality Tab and Trinity Overview.
 */
import { useState, useEffect } from 'react';
import { Brain, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { getBehavioralModifiers, getOcean, OceanMetrics, BehavioralModifier } from '../../lib/dhtApi';
import TellMyStoryPartnerCard from '../joseph/TellMyStoryPartnerCard';

const TRAIT_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
    O: { label: 'Openness', color: '#8b5cf6', desc: 'Curiosity, creativity, willingness to try new approaches' },
    C: { label: 'Conscientious.', color: '#3b82f6', desc: 'Discipline, goal-orientation, structured habits' },
    E: { label: 'Extraversion', color: '#f59e0b', desc: 'Social energy, engagement level, communication style' },
    A: { label: 'Agreeableness', color: '#10b981', desc: 'Cooperation, trust, family communication openness' },
    N: { label: 'Neuroticism', color: '#ef4444', desc: 'Stress sensitivity, emotional reactivity, alarm response' },
};

const ALERT_STYLE_CONFIG: Record<string, { color: string; label: string; desc: string }> = {
    calm: { color: '#10b981', label: 'Calm & reassuring', desc: 'Alerts are softened; alarming language avoided' },
    moderate: { color: '#f59e0b', label: 'Balanced', desc: 'Standard alert intensity and directness' },
    high: { color: '#ef4444', label: 'Direct & clear', desc: 'Full alert intensity; concise, factual messaging' },
};

const STYLE_CONFIG: Record<string, { color: string; label: string; desc: string }> = {
    structured: { color: '#3b82f6', label: 'Structured Plans', desc: 'Checklists, milestones, measurable goals' },
    exploratory: { color: '#8b5cf6', label: 'Exploratory', desc: 'A/B micro-trials, experimentation, flexibility' },
    supportive: { color: '#10b981', label: 'Supportive', desc: 'Encouragement-first, gradual friction' },
};

interface OceanLayerProps {
    personId: string;
}

export default function OceanBehavioralLayer({ personId }: OceanLayerProps) {
    const [ocean, setOcean] = useState<OceanMetrics | null>(null);
    const [modifiers, setModifiers] = useState<BehavioralModifier | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        (async () => {
            const [oceanResp, modResp] = await Promise.all([
                getOcean(personId),
                getBehavioralModifiers(personId),
            ]);
            setOcean(oceanResp?.latest || null);
            setModifiers(modResp || null);
            setLoading(false);
        })();
    }, [personId]);

    if (loading) return <div className="flex items-center gap-2 text-xs text-slate-500 p-4"><Loader2 className="w-4 h-4 animate-spin" /></div>;

    if (!ocean) return (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5 text-center">
            <Brain className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No OCEAN profile found.</p>
            <p className="text-[10px] text-slate-600 mt-1">Take the personality quiz to unlock behavioral health insights.</p>
        </div>
    );

    const scores = ocean.scores || {};
    const alertCfg = modifiers ? ALERT_STYLE_CONFIG[modifiers.alert_sensitivity] : null;
    const styleCfg = modifiers ? STYLE_CONFIG[modifiers.intervention_style] : null;

    return (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/5 cursor-pointer"
                onClick={() => setExpanded(!expanded)}>
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
                        <Brain className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-white">OCEAN Personality × Health</p>
                        <p className="text-[10px] text-slate-500">v{ocean.version} — Behavioral risk layer</p>
                    </div>
                </div>
                {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </div>

            {/* OCEAN Score bars */}
            <div className="p-4 space-y-2">
                {Object.entries(TRAIT_CONFIG).map(([key, cfg]) => {
                    const val = scores[key] ?? 50;
                    return (
                        <div key={key} className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-400 w-20 shrink-0">{cfg.label}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, backgroundColor: cfg.color }} />
                            </div>
                            <span className="text-[10px] text-slate-400 w-6 text-right shrink-0">{Math.round(val)}</span>
                        </div>
                    );
                })}
            </div>

            {/* Behavioral modifiers */}
            {modifiers && (
                <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                    {alertCfg && (
                        <div className="p-2.5 rounded-xl border" style={{ borderColor: alertCfg.color + '25', backgroundColor: alertCfg.color + '08' }}>
                            <p className="text-[9px] uppercase tracking-wider text-slate-600 mb-1">Alert Style</p>
                            <p className="text-xs font-semibold" style={{ color: alertCfg.color }}>{alertCfg.label}</p>
                            {expanded && <p className="text-[9px] text-slate-500 mt-1">{alertCfg.desc}</p>}
                        </div>
                    )}
                    {styleCfg && (
                        <div className="p-2.5 rounded-xl border" style={{ borderColor: styleCfg.color + '25', backgroundColor: styleCfg.color + '08' }}>
                            <p className="text-[9px] uppercase tracking-wider text-slate-600 mb-1">Plan Style</p>
                            <p className="text-xs font-semibold" style={{ color: styleCfg.color }}>{styleCfg.label}</p>
                            {expanded && <p className="text-[9px] text-slate-500 mt-1">{styleCfg.desc}</p>}
                        </div>
                    )}
                    <div className="p-2.5 rounded-xl border border-white/5 bg-white/[0.02]">
                        <p className="text-[9px] uppercase tracking-wider text-slate-600 mb-1">Adherence Risk</p>
                        <p className="text-xs font-semibold text-white">{Math.round(modifiers.adherence_risk * 100)}%</p>
                    </div>
                    <div className="p-2.5 rounded-xl border border-white/5 bg-white/[0.02]">
                        <p className="text-[9px] uppercase tracking-wider text-slate-600 mb-1">Nudge Frequency</p>
                        <p className="text-xs font-semibold capitalize text-white">{modifiers.nudge_frequency}</p>
                    </div>
                </div>
            )}

            <div className="px-4 pb-4">
                <TellMyStoryPartnerCard
                    compact
                    title="Build the story layer behind OCEAN"
                    description="TellMyStory.ai captures the lived experiences behind personality scores so EverAfter can pair behavioral metrics with family memory and narrative context."
                />
            </div>
        </div>
    );
}
