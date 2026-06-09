import { useEffect, useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { getBehavioralModifiers, getOcean, type BehavioralModifier, type OceanMetrics } from '../../lib/dhtApi';

const TRAIT_CONFIG: Record<string, { label: string; color: string; description: string }> = {
    O: { label: 'Openness', color: '#8b5cf6', description: 'Curiosity, creativity, and willingness to try new approaches.' },
    C: { label: 'Conscientiousness', color: '#3b82f6', description: 'Discipline, goal orientation, and routine reliability.' },
    E: { label: 'Extraversion', color: '#f59e0b', description: 'Social energy, engagement level, and communication speed.' },
    A: { label: 'Agreeableness', color: '#10b981', description: 'Cooperation, trust, and family support openness.' },
    N: { label: 'Neuroticism', color: '#ef4444', description: 'Stress sensitivity, emotional reactivity, and alarm response.' },
};

const ALERT_STYLE_CONFIG: Record<string, { color: string; label: string; description: string }> = {
    calm: { color: '#10b981', label: 'Calm and reassuring', description: 'Alerts should avoid panic language and emphasize steadiness.' },
    moderate: { color: '#f59e0b', label: 'Balanced', description: 'Standard alert intensity with direct but measured phrasing.' },
    high: { color: '#ef4444', label: 'Direct and clear', description: 'Concise and explicit guidance is preferred.' },
};

const PLAN_STYLE_CONFIG: Record<string, { color: string; label: string; description: string }> = {
    structured: { color: '#3b82f6', label: 'Structured plans', description: 'Checklists, milestones, and measurable goals.' },
    exploratory: { color: '#8b5cf6', label: 'Exploratory', description: 'Small experiments and flexible iteration.' },
    supportive: { color: '#10b981', label: 'Supportive', description: 'Encouragement-first steps with lower friction.' },
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
        let cancelled = false;

        (async () => {
            const [oceanResponse, modifiersResponse] = await Promise.all([
                getOcean(personId),
                getBehavioralModifiers(personId),
            ]);

            if (cancelled) return;

            setOcean(oceanResponse?.latest || null);
            setModifiers(modifiersResponse?.modifiers || null);
            setLoading(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [personId]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 p-4 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading OCEAN behavioral layer...
            </div>
        );
    }

    if (!ocean) {
        return (
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#1a1a24] to-[#13131a] p-5 text-center">
                <Brain className="mx-auto mb-2 h-6 w-6 text-slate-600" />
                <p className="text-xs text-slate-500">No OCEAN profile found.</p>
                <p className="mt-1 text-[10px] text-slate-600">Take the personality quiz to unlock behavioral health insights.</p>
            </div>
        );
    }

    const scores = ocean.scores || {};
    const alertStyle = modifiers ? ALERT_STYLE_CONFIG[modifiers.alert_sensitivity] : null;
    const planStyle = modifiers ? PLAN_STYLE_CONFIG[modifiers.intervention_style] : null;

    return (
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#1a1a24] to-[#13131a]">
            <div
                className="flex cursor-pointer items-center justify-between border-b border-white/5 p-4"
                onClick={() => setExpanded(previous => !previous)}
            >
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15">
                        <Brain className="h-3.5 w-3.5 text-purple-400" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-white">OCEAN × health interpretation</p>
                        <p className="text-[10px] text-slate-500">Behavior-aware care tone, adherence, and recovery style</p>
                    </div>
                </div>
                {expanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
            </div>

            <div className="space-y-4 p-4">
                <div className="space-y-2">
                    {Object.entries(TRAIT_CONFIG).map(([traitKey, config]) => {
                        const score = scores[traitKey] ?? 50;
                        return (
                            <div key={traitKey} className="flex items-center gap-3">
                                <span className="w-24 shrink-0 text-[10px] font-bold text-slate-400">{config.label}</span>
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{ width: `${score}%`, backgroundColor: config.color }}
                                    />
                                </div>
                                <span className="w-8 shrink-0 text-right text-[10px] text-slate-400">{Math.round(score)}</span>
                            </div>
                        );
                    })}
                </div>

                {expanded && (
                    <div className="grid gap-3 md:grid-cols-2">
                        {Object.entries(TRAIT_CONFIG).map(([traitKey, config]) => (
                            <div key={`${traitKey}-detail`} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                                <p className="text-xs font-semibold text-white">{config.label}</p>
                                <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{config.description}</p>
                            </div>
                        ))}
                    </div>
                )}

                {modifiers && (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {alertStyle && (
                            <div className="rounded-xl border p-3" style={{ borderColor: `${alertStyle.color}25`, backgroundColor: `${alertStyle.color}08` }}>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Alert style</p>
                                <p className="mt-1 text-xs font-semibold" style={{ color: alertStyle.color }}>{alertStyle.label}</p>
                                <p className="mt-1 text-[10px] text-slate-400">{alertStyle.description}</p>
                            </div>
                        )}
                        {planStyle && (
                            <div className="rounded-xl border p-3" style={{ borderColor: `${planStyle.color}25`, backgroundColor: `${planStyle.color}08` }}>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Plan style</p>
                                <p className="mt-1 text-xs font-semibold" style={{ color: planStyle.color }}>{planStyle.label}</p>
                                <p className="mt-1 text-[10px] text-slate-400">{planStyle.description}</p>
                            </div>
                        )}
                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Adherence risk</p>
                            <p className="mt-1 text-xs font-semibold text-white">{Math.round(modifiers.adherence_risk * 100)}%</p>
                            <p className="mt-1 text-[10px] text-slate-400">Higher values mean more friction following through on care plans.</p>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Nudge frequency</p>
                            <p className="mt-1 text-xs font-semibold capitalize text-white">{modifiers.nudge_frequency}</p>
                            <p className="mt-1 text-[10px] text-slate-400">How often Raphael should follow up before fatigue sets in.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
