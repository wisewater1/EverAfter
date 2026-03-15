import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    HeartPulse,
    Loader2,
    Moon,
    Shield,
    Sparkles,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import { fetchHealthMetrics, type HealthDataPoint } from '../../lib/raphael/healthDataService';
import { getFamilyMembers } from '../../lib/joseph/genealogy';
import { readStoredPersonalityProfile, toLongTraitScores } from '../../lib/joseph/personalityProfiles';
import { getRiskCards, type RiskCard } from '../../lib/dhtApi';

const LEVEL_COLORS: Record<string, string> = {
    low: '#10b981',
    moderate: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
};

const DOMAIN_CONFIG: Record<string, { label: string; icon: typeof Shield; description: string }> = {
    cardiovascular: {
        label: 'Cardiovascular',
        icon: HeartPulse,
        description: 'Heart rate, blood pressure, and oxygen delivery patterns.',
    },
    metabolic: {
        label: 'Metabolic',
        icon: Sparkles,
        description: 'Glucose handling, weight trend, and metabolic strain.',
    },
    mental: {
        label: 'Stress & Mood',
        icon: AlertTriangle,
        description: 'Stress load, emotional reactivity, and cognitive friction.',
    },
    recovery: {
        label: 'Recovery',
        icon: Moon,
        description: 'Sleep sufficiency, recovery depth, and habit sustainability.',
    },
    respiratory: {
        label: 'Respiratory',
        icon: Shield,
        description: 'Oxygen saturation and respiratory resilience.',
    },
};

const METRIC_DOMAIN: Record<string, string> = {
    heart_rate: 'cardiovascular',
    resting_hr: 'cardiovascular',
    blood_pressure_systolic: 'cardiovascular',
    systolic_bp: 'cardiovascular',
    oxygen_saturation: 'respiratory',
    spo2: 'respiratory',
    glucose: 'metabolic',
    glucose_fasting: 'metabolic',
    a1c: 'metabolic',
    weight: 'metabolic',
    bmi: 'metabolic',
    sleep_duration: 'recovery',
    sleep_hours: 'recovery',
    stress_level: 'mental',
};

interface RiskCardsProps {
    personId: string;
}

function average(values: number[]) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function directionFromDelta(delta: number): 'up' | 'down' | 'stable' {
    if (delta >= 8) return 'up';
    if (delta <= -8) return 'down';
    return 'stable';
}

function getOCEANSignals(personId: string) {
    const profile = readStoredPersonalityProfile(personId);
    if (!profile?.scores) return null;
    return toLongTraitScores(profile.scores);
}

function buildEstimatedRiskCards(personId: string, metrics: HealthDataPoint[]): RiskCard[] {
    const grouped = metrics.reduce<Record<string, HealthDataPoint[]>>((acc, metric) => {
        const domain = METRIC_DOMAIN[metric.metric_type];
        if (!domain) return acc;
        acc[domain] = acc[domain] || [];
        acc[domain].push(metric);
        return acc;
    }, {});

    const livingFamily = getFamilyMembers().filter(member => !member.deathDate);
    const adultFamilyCount = livingFamily.filter(member => {
        if (!member.birthDate) return false;
        const age = new Date().getFullYear() - new Date(member.birthDate).getFullYear();
        return age >= 18;
    }).length;
    const profiledFamilyCount = livingFamily.filter(member => Boolean(readStoredPersonalityProfile(member.id)?.scores)).length;
    const ocean = getOCEANSignals(personId);

    const cards = Object.entries(grouped).map(([domain, items]) => {
        const sorted = [...items].sort((left, right) =>
            new Date(left.recorded_at).getTime() - new Date(right.recorded_at).getTime(),
        );
        const latest = sorted[sorted.length - 1];
        const priorValues = sorted.slice(0, -1).map(item => item.value);
        const latestValue = latest.value;
        const baseline = priorValues.length ? average(priorValues) : latestValue;
        const deltaPct = baseline ? ((latestValue - baseline) / Math.abs(baseline)) * 100 : 0;

        let currentLevel: RiskCard['current_level'] = 'low';
        const whatMovedIt: string[] = [];
        let suggestedAction = 'Continue measuring consistently so Raphael can keep the trajectory accurate.';

        if (domain === 'cardiovascular') {
            if (latest.metric_type.includes('blood_pressure') || latest.metric_type === 'systolic_bp') {
                if (latestValue >= 140) currentLevel = 'high';
                else if (latestValue >= 130) currentLevel = 'moderate';
                whatMovedIt.push(`Latest systolic blood pressure is ${Math.round(latestValue)} ${latest.unit}.`);
            } else if (latestValue >= 95) {
                currentLevel = 'moderate';
                whatMovedIt.push(`Latest heart-rate reading is ${Math.round(latestValue)} ${latest.unit}.`);
            } else {
                whatMovedIt.push(`Recent cardiovascular readings are within a workable range.`);
            }
            if (ocean?.neuroticism && ocean.neuroticism >= 65) {
                whatMovedIt.push(`Higher emotional sensitivity suggests stress spikes may amplify cardiovascular load.`);
            }
            suggestedAction = 'Retake blood pressure or resting pulse within the next week and compare against your recent baseline.';
        }

        if (domain === 'metabolic') {
            if (latest.metric_type === 'a1c' && latestValue >= 6.5) currentLevel = 'high';
            else if (latest.metric_type === 'glucose' && latestValue >= 126) currentLevel = 'high';
            else if (latest.metric_type === 'glucose' && latestValue >= 100) currentLevel = 'moderate';
            else if ((latest.metric_type === 'weight' || latest.metric_type === 'bmi') && latestValue >= 30) currentLevel = 'moderate';

            whatMovedIt.push(`Recent ${latest.metric_type.replaceAll('_', ' ')} reading is ${latestValue.toFixed(1)} ${latest.unit}.`);
            if (ocean?.conscientiousness && ocean.conscientiousness < 45) {
                whatMovedIt.push(`Lower conscientiousness can increase adherence friction around diet and medication routines.`);
            }
            suggestedAction = 'Review glucose, weight, and meal consistency together before adjusting any plan.';
        }

        if (domain === 'mental') {
            if (latestValue >= 8) currentLevel = 'high';
            else if (latestValue >= 6) currentLevel = 'moderate';
            whatMovedIt.push(`Latest self-reported stress level is ${latestValue.toFixed(0)}${latest.unit}.`);
            if (ocean?.neuroticism && ocean.neuroticism >= 65) {
                whatMovedIt.push(`OCEAN shows elevated neuroticism, which increases alert sensitivity and perceived strain.`);
            }
            if (adultFamilyCount <= 1) {
                whatMovedIt.push(`Joseph sees a thin adult support bench, which can raise solo-care pressure.`);
            }
            suggestedAction = 'Pair the next stress check-in with a support action: rest, family outreach, or a recovery block.';
        }

        if (domain === 'recovery') {
            if (latestValue < 6) currentLevel = 'high';
            else if (latestValue < 7) currentLevel = 'moderate';
            whatMovedIt.push(`Latest sleep duration is ${latestValue.toFixed(1)} ${latest.unit}.`);
            if (profiledFamilyCount >= 2) {
                whatMovedIt.push(`Joseph has ${profiledFamilyCount} family personality profiles that can be used to coordinate support more precisely.`);
            }
            suggestedAction = 'Sleep duration is the fastest lever here. Tighten bedtime consistency before testing secondary changes.';
        }

        if (domain === 'respiratory') {
            if (latestValue <= 93) currentLevel = 'high';
            else if (latestValue <= 95) currentLevel = 'moderate';
            whatMovedIt.push(`Latest oxygen saturation is ${latestValue.toFixed(0)}${latest.unit}.`);
            suggestedAction = 'Re-check oxygen and correlate it with activity, illness, or sleep quality before assuming a stable pattern.';
        }

        if (!whatMovedIt.length) {
            whatMovedIt.push('Raphael has only partial signal coverage for this domain, so this is a conservative estimate.');
        }

        if (adultFamilyCount >= 2 && (domain === 'mental' || domain === 'recovery')) {
            whatMovedIt.push(`Joseph shows ${adultFamilyCount} adult family members who could absorb follow-up tasks if needed.`);
        }

        return {
            id: `${domain}-estimated`,
            condition: `${DOMAIN_CONFIG[domain]?.label || domain} risk estimate`,
            domain,
            current_level: currentLevel,
            direction: directionFromDelta(deltaPct),
            delta_30d: Number.isFinite(deltaPct) ? Number(deltaPct.toFixed(1)) : 0,
            confidence: Math.min(0.82, 0.35 + sorted.length * 0.1),
            what_moved_it: whatMovedIt,
            source: 'Raphael metrics + Joseph family context',
            suggested_action: suggestedAction,
        };
    });

    return cards.sort((left, right) => {
        const levelOrder = { critical: 3, high: 2, moderate: 1, low: 0 };
        return (levelOrder[right.current_level as keyof typeof levelOrder] || 0) - (levelOrder[left.current_level as keyof typeof levelOrder] || 0);
    });
}

export default function RiskCards({ personId }: RiskCardsProps) {
    const [cards, setCards] = useState<RiskCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [usingEstimate, setUsingEstimate] = useState(false);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            setLoading(true);
            const [riskResponse, metrics] = await Promise.all([
                getRiskCards(personId),
                fetchHealthMetrics(personId, 45),
            ]);

            if (cancelled) return;

            const apiCards = riskResponse?.risk_cards || [];
            if (apiCards.length) {
                setCards(apiCards);
                setUsingEstimate(false);
            } else {
                setCards(buildEstimatedRiskCards(personId, metrics));
                setUsingEstimate(true);
            }

            setLoading(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [personId]);

    const severeCount = useMemo(
        () => cards.filter(card => card.current_level === 'high' || card.current_level === 'critical').length,
        [cards],
    );

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-xs text-slate-400 p-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading risk cards...
            </div>
        );
    }

    if (!cards.length) {
        return (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-5 text-center">
                <p className="text-sm text-white">No Delphi risk cards yet.</p>
                <p className="mt-1 text-xs text-slate-500">
                    Add recent vitals in Raphael or complete the OCEAN profile so Joseph can contribute family-aware context.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Domains tracked</p>
                    <p className="mt-2 text-xl font-semibold text-white">{cards.length}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Needs attention</p>
                    <p className="mt-2 text-xl font-semibold text-amber-300">{severeCount}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Evidence source</p>
                    <p className="mt-2 text-sm font-medium text-white">
                        {usingEstimate ? 'Raphael + Joseph estimate' : 'Delphi engine'}
                    </p>
                </div>
            </div>

            {usingEstimate && (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-200">
                    Raphael has recent measurements, but Delphi does not yet have a full risk-card payload for this person. These cards are educated estimates built from recent vitals, OCEAN tendencies, and Joseph family context.
                </div>
            )}

            <div className="space-y-3">
                {cards.map((card, index) => {
                    const key = card.id || `${card.domain}-${index}`;
                    const isExpanded = expanded === key;
                    const config = DOMAIN_CONFIG[card.domain] || {
                        label: card.domain,
                        icon: Shield,
                        description: 'Domain risk estimate.',
                    };
                    const Icon = config.icon;
                    const color = LEVEL_COLORS[card.current_level] || '#6b7280';
                    const TrendIcon =
                        card.direction === 'up'
                            ? TrendingUp
                            : card.direction === 'down'
                                ? TrendingDown
                                : Shield;

                    return (
                        <div
                            key={key}
                            className="overflow-hidden rounded-2xl border transition-colors"
                            style={{ borderColor: `${color}33` }}
                        >
                            <button
                                type="button"
                                className="w-full bg-white/[0.02] px-4 py-4 text-left"
                                onClick={() => setExpanded(isExpanded ? null : key)}
                            >
                                <div className="flex flex-wrap items-start gap-3">
                                    <div
                                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                                        style={{ backgroundColor: `${color}18` }}
                                    >
                                        <Icon className="h-5 w-5" style={{ color }} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold text-white">{config.label}</p>
                                            <span
                                                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase"
                                                style={{
                                                    color,
                                                    borderColor: `${color}55`,
                                                    backgroundColor: `${color}14`,
                                                }}
                                            >
                                                {card.current_level}
                                            </span>
                                            <span className="text-[10px] text-slate-500">
                                                {Math.round(card.confidence * 100)}% confidence
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-400">{config.description}</p>
                                        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-300">
                                            <span className="inline-flex items-center gap-1.5">
                                                <TrendIcon className="h-3.5 w-3.5" style={{ color }} />
                                                {card.direction === 'up'
                                                    ? 'Risk pressure rising'
                                                    : card.direction === 'down'
                                                        ? 'Risk pressure easing'
                                                        : 'Risk pressure stable'}
                                            </span>
                                            <span>{card.delta_30d > 0 ? '+' : ''}{card.delta_30d.toFixed(1)}% over 30d</span>
                                            {card.source && <span>{card.source}</span>}
                                        </div>
                                    </div>
                                    {isExpanded ? (
                                        <ChevronUp className="mt-1 h-4 w-4 text-slate-500" />
                                    ) : (
                                        <ChevronDown className="mt-1 h-4 w-4 text-slate-500" />
                                    )}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="space-y-4 border-t border-white/5 bg-slate-950/60 px-4 py-4">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Why this card moved</p>
                                        <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
                                            {(card.what_moved_it || []).map((item, itemIndex) => (
                                                <li key={`${key}-why-${itemIndex}`} className="flex gap-2">
                                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {card.suggested_action && (
                                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                                            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300">Recommended next move</p>
                                            <p className="mt-1 text-sm text-emerald-100">{card.suggested_action}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
