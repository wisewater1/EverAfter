import { useEffect, useMemo, useState } from 'react';
import { Activity, Brain, Crosshair, Shield, Sparkles, TrendingUp, Users } from 'lucide-react';
import { getFamilyMembers } from '../../lib/joseph/genealogy';
import { readStoredPersonalityProfile } from '../../lib/joseph/personalityProfiles';
import { fetchHealthMetrics } from '../../lib/raphael/healthDataService';
import { getBehavioralModifiers, getRiskCards } from '../../lib/dhtApi';
import DHTPanel from './DHTPanel';
import LeadingIndicators from './LeadingIndicators';
import NextBestMeasurement from './NextBestMeasurement';
import OceanBehavioralLayer from './OceanBehavioralLayer';
import RiskCards from './RiskCards';

const DELPHI_TABS = [
    { id: 'trajectory', label: 'Trajectory', icon: Activity },
    { id: 'risk', label: 'Risk Cards', icon: Shield },
    { id: 'indicators', label: 'Leading Signals', icon: TrendingUp },
    { id: 'next-best', label: 'Next Measurement', icon: Crosshair },
    { id: 'ocean', label: 'Behavioral Layer', icon: Brain },
] as const;

interface DelphiViewProps {
    personId: string;
    memberName?: string;
}

function sanitizeMemberLabel(value: string) {
    const normalized = value.includes('@') ? value.split('@')[0] : value;
    return normalized.replace(/[._-]+/g, ' ').trim() || 'Family member';
}

export default function DelphiView({ personId, memberName = 'You' }: DelphiViewProps) {
    const [activeTab, setActiveTab] = useState<(typeof DELPHI_TABS)[number]['id']>('trajectory');
    const [signalCount, setSignalCount] = useState(0);
    const [riskSummary, setRiskSummary] = useState<{ count: number; severe: number }>({ count: 0, severe: 0 });
    const [modifierSummary, setModifierSummary] = useState<{ adherenceRisk: number; interventionStyle: string } | null>(null);

    const familyMembers = useMemo(() => getFamilyMembers().filter(member => !member.deathDate), []);
    const profiledMembers = useMemo(
        () => familyMembers.filter(member => Boolean(readStoredPersonalityProfile(member.id)?.scores)).length,
        [familyMembers],
    );
    const adultFamilyCount = useMemo(
        () =>
            familyMembers.filter(member => {
                if (!member.birthDate) return false;
                const age = new Date().getFullYear() - new Date(member.birthDate).getFullYear();
                return age >= 18;
            }).length,
        [familyMembers],
    );
    const displayName = useMemo(() => sanitizeMemberLabel(memberName), [memberName]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const [metrics, riskResponse, modifiersResponse] = await Promise.all([
                fetchHealthMetrics(personId, 45),
                getRiskCards(personId),
                getBehavioralModifiers(personId),
            ]);

            if (cancelled) return;

            setSignalCount(metrics.length);
            const cards = riskResponse?.risk_cards || [];
            setRiskSummary({
                count: cards.length,
                severe: cards.filter(card => card.current_level === 'high' || card.current_level === 'critical').length,
            });
            setModifierSummary(
                modifiersResponse?.modifiers
                    ? {
                        adherenceRisk: modifiersResponse.modifiers.adherence_risk,
                        interventionStyle: modifiersResponse.modifiers.intervention_style,
                    }
                    : null,
            );
        })();

        return () => {
            cancelled = true;
        };
    }, [personId]);

    return (
        <div className="space-y-5">
            <section className="rounded-3xl border border-cyan-500/10 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.9),rgba(15,23,42,0.72))] p-5 md:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
                            <Sparkles className="h-3.5 w-3.5" />
                            Delphi Intelligence
                        </div>
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Delphi Health Trajectory</h2>
                            <p className="mt-1 text-sm leading-relaxed text-slate-300">
                                Longitudinal health intelligence for <span className="font-medium text-cyan-200">{displayName}</span>, combining Raphael vitals,
                                Joseph family structure, and behavioral adherence context.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Signals</p>
                            <p className="mt-2 text-xl font-semibold text-white">{signalCount}</p>
                            <p className="mt-1 text-xs text-slate-400">Recent Raphael measurements</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Risk domains</p>
                            <p className="mt-2 text-xl font-semibold text-white">{riskSummary.count}</p>
                            <p className="mt-1 text-xs text-slate-400">{riskSummary.severe} flagged for review</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Family context</p>
                            <p className="mt-2 text-xl font-semibold text-white">{profiledMembers}/{adultFamilyCount}</p>
                            <p className="mt-1 text-xs text-slate-400">Profiled adults available</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Raphael signals</p>
                    <p className="mt-2 text-xl font-semibold text-white">{signalCount}</p>
                    <p className="mt-1 text-xs text-slate-400">Recent measurements actively feeding Delphi.</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Risk coverage</p>
                    <p className="mt-2 text-xl font-semibold text-white">{riskSummary.count}</p>
                    <p className="mt-1 text-xs text-slate-400">{riskSummary.severe} domain(s) currently flagged for attention.</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Joseph context</p>
                    <p className="mt-2 text-xl font-semibold text-white">{adultFamilyCount}</p>
                    <p className="mt-1 text-xs text-slate-400">{profiledMembers} family profile(s) available to calibrate support assumptions.</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Adherence lens</p>
                    <p className="mt-2 text-xl font-semibold text-white">
                        {modifierSummary ? `${Math.round(modifierSummary.adherenceRisk * 100)}%` : 'Pending'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        {modifierSummary ? `${modifierSummary.interventionStyle} follow-through style` : 'Needs an OCEAN profile to tune care delivery.'}
                    </p>
                </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-2">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {DELPHI_TABS.map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-medium transition-all ${
                                    active
                                        ? 'border border-cyan-400/25 bg-cyan-500/12 text-white shadow-[0_8px_30px_rgba(34,211,238,0.12)]'
                                        : 'border border-transparent text-slate-400 hover:border-white/5 hover:bg-white/[0.03] hover:text-slate-200'
                                }`}
                            >
                                <Icon className={`h-3.5 w-3.5 ${active ? 'text-cyan-300' : ''}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {activeTab === 'trajectory' && (
                <div className="space-y-4">
                    <DHTPanel personId={personId} />
                    <NextBestMeasurement personId={personId} />
                </div>
            )}

            {activeTab === 'risk' && (
                <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#1a1a24] to-[#13131a] p-5">
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-semibold text-white">Health domain risk cards</h3>
                            <p className="mt-1 text-xs text-slate-400">
                                Raphael measurements are combined with Joseph family context and OCEAN adherence signals to explain where pressure is building.
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] text-slate-300">
                            <Users className="h-3 w-3" />
                            Family-aware view
                        </div>
                    </div>
                    <RiskCards personId={personId} />
                </div>
            )}

            {activeTab === 'indicators' && (
                <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#1a1a24] to-[#13131a] p-5">
                    <h3 className="mb-3 text-sm font-semibold text-white">Leading health signals</h3>
                    <p className="mb-4 text-xs text-slate-400">
                        These are the measurements currently pushing Delphi toward better or worse forecasts.
                    </p>
                    <LeadingIndicators personId={personId} />
                </div>
            )}

            {activeTab === 'next-best' && (
                <div className="space-y-3">
                    <p className="text-xs text-slate-500">The measurement below would reduce your trajectory uncertainty the most.</p>
                    <NextBestMeasurement personId={personId} />
                </div>
            )}

            {activeTab === 'ocean' && <OceanBehavioralLayer personId={personId} />}
        </div>
    );
}
