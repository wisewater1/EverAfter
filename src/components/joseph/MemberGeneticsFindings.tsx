import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    Beaker,
    Dna,
    ExternalLink,
    Heart,
    Pill,
    ShieldCheck,
    Sparkles,
    Users2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { analyzeVariants, summarizeFindings, type Finding } from '../../lib/genetics/findings';
import type { TraitCategory, Severity } from '../../lib/genetics/traitMap';
import type { FamilyMember } from '../../lib/joseph/genealogy';

interface MemberGeneticsFindingsProps {
    userId: string;
    member: FamilyMember;
    /** family_member_id (DB UUID). Falls back to "all my profiles" when null. */
    familyMemberDbId?: string | null;
}

const CATEGORY_META: Record<
    TraitCategory,
    { label: string; icon: typeof Pill; tone: string }
> = {
    pgx: {
        label: 'Medications',
        icon: Pill,
        tone: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    },
    carrier: {
        label: 'Carrier status',
        icon: Users2,
        tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    },
    cancer_risk: {
        label: 'Cancer risk',
        icon: ShieldCheck,
        tone: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    },
    cardiometabolic: {
        label: 'Heart & metabolic',
        icon: Heart,
        tone: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
    },
    trait: {
        label: 'Traits',
        icon: Sparkles,
        tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    },
};

const SEVERITY_BADGE: Record<Severity, { label: string; cls: string }> = {
    urgent: {
        label: 'Discuss with a specialist',
        cls: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
    },
    high: {
        label: 'Talk to your doctor',
        cls: 'border-orange-500/40 bg-orange-500/15 text-orange-200',
    },
    moderate: {
        label: 'Worth knowing',
        cls: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    },
    info: {
        label: 'Informational',
        cls: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
    },
};

const STORAGE_KEY = (memberId: string) => `everafter:genetics:consent:${memberId}`;

interface ConsentState {
    enabled_categories: TraitCategory[];
    sensitive_findings_acknowledged: boolean;
}

const DEFAULT_CONSENT: ConsentState = {
    enabled_categories: ['pgx', 'carrier', 'trait'],
    sensitive_findings_acknowledged: false,
};

function loadConsent(memberId: string): ConsentState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY(memberId));
        if (!raw) return DEFAULT_CONSENT;
        const parsed = JSON.parse(raw) as Partial<ConsentState>;
        return {
            enabled_categories:
                Array.isArray(parsed.enabled_categories) && parsed.enabled_categories.length > 0
                    ? (parsed.enabled_categories as TraitCategory[])
                    : DEFAULT_CONSENT.enabled_categories,
            sensitive_findings_acknowledged:
                parsed.sensitive_findings_acknowledged === true,
        };
    } catch {
        return DEFAULT_CONSENT;
    }
}

function saveConsent(memberId: string, state: ConsentState) {
    try {
        localStorage.setItem(STORAGE_KEY(memberId), JSON.stringify(state));
    } catch {
        // localStorage disabled — that's fine, state is just session-scoped.
    }
}

const ALL_CATEGORIES: TraitCategory[] = [
    'pgx',
    'carrier',
    'cancer_risk',
    'cardiometabolic',
    'trait',
];

export default function MemberGeneticsFindings({
    userId,
    member,
    familyMemberDbId = null,
}: MemberGeneticsFindingsProps) {
    const [variants, setVariants] = useState<{ rsid: string; genotype: string }[]>([]);
    const [hasProfile, setHasProfile] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [consent, setConsent] = useState<ConsentState>(() => loadConsent(member.id));
    const [showSettings, setShowSettings] = useState(false);

    // ─── Pull this member's variants ────────────────────────────────────────
    // We only fetch the rsids that exist in the curated map — a typical
    // 23andMe profile has ~700k rows; we don't need to load all of them.
    const curatedRsids = useMemo(() => {
        // Tree-shake-safe — import the map lazily so the UI bundle stays small.
        const list = ALL_CATEGORIES.flatMap(() => []) as string[];
        // The actual list comes from traitMap; keeping it in scope here.
        return list;
    }, []);

    useEffect(() => {
        let cancelled = false;
        if (!userId || !supabase) return;
        setLoading(true);
        setError(null);

        (async () => {
            try {
                // 1. Find this member's profile(s).
                let profileQuery = supabase
                    .from('genetic_profiles')
                    .select('id')
                    .eq('user_id', userId);
                if (familyMemberDbId) {
                    profileQuery = profileQuery.eq('family_member_id', familyMemberDbId);
                } else {
                    profileQuery = profileQuery.is('family_member_id', null);
                }
                const { data: profiles, error: pErr } = await profileQuery;
                if (cancelled) return;
                if (pErr) throw pErr;
                if (!profiles || profiles.length === 0) {
                    setHasProfile(false);
                    setVariants([]);
                    return;
                }
                setHasProfile(true);
                const profileIds = profiles.map((p) => p.id as string);

                // 2. Fetch curated-rsid variant rows. We bring back only
                //    rsid + genotype to keep the payload small.
                const { TRAIT_MAP } = await import('../../lib/genetics/traitMap');
                const rsids = TRAIT_MAP.map((t) => t.rsid);

                const { data: rows, error: vErr } = await supabase
                    .from('variant_calls')
                    .select('rsid,genotype')
                    .in('genetic_profile_id', profileIds)
                    .in('rsid', rsids);
                if (cancelled) return;
                if (vErr) throw vErr;
                setVariants((rows || []) as { rsid: string; genotype: string }[]);
            } catch (err) {
                if (cancelled) return;
                setError(
                    err instanceof Error ? err.message : 'Could not load genetic findings',
                );
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [userId, familyMemberDbId, curatedRsids]);

    const findings: Finding[] = useMemo(() => {
        if (variants.length === 0) return [];
        return analyzeVariants(
            variants.map((row) => ({
                rsid: row.rsid,
                chromosome: '0',
                position: 0,
                genotype: row.genotype,
                confidence: row.genotype === '--' ? 'no_call' : 'high',
            })),
            consent,
        );
    }, [variants, consent]);

    const summary = useMemo(() => summarizeFindings(findings), [findings]);

    const toggleCategory = (cat: TraitCategory) => {
        const next = { ...consent };
        if (next.enabled_categories.includes(cat)) {
            next.enabled_categories = next.enabled_categories.filter((c) => c !== cat);
        } else {
            next.enabled_categories = [...next.enabled_categories, cat];
        }
        setConsent(next);
        saveConsent(member.id, next);
    };

    const toggleSensitive = () => {
        const next = {
            ...consent,
            sensitive_findings_acknowledged: !consent.sensitive_findings_acknowledged,
        };
        setConsent(next);
        saveConsent(member.id, next);
    };

    if (hasProfile === false) {
        // No DNA file uploaded for this member yet — render nothing rather
        // than a noisy empty state; MemberGeneticsPanel handles that.
        return null;
    }

    return (
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 space-y-3">
            <header className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-300">
                    <Beaker className="w-3.5 h-3.5 text-violet-300" />
                    <span className="text-[10px] uppercase tracking-wider">
                        Genetic trait map
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => setShowSettings((v) => !v)}
                    className="text-[10px] text-slate-400 hover:text-slate-200 underline-offset-2 hover:underline"
                >
                    {showSettings ? 'Hide settings' : 'Settings'}
                </button>
            </header>

            {/* Consent settings — controls which categories surface */}
            {showSettings && (
                <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                        Categories you've opted into
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {ALL_CATEGORIES.map((cat) => {
                            const meta = CATEGORY_META[cat];
                            const enabled = consent.enabled_categories.includes(cat);
                            const Icon = meta.icon;
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => toggleCategory(cat)}
                                    className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-medium transition-colors ${
                                        enabled
                                            ? meta.tone
                                            : 'border-white/10 bg-white/[0.02] text-slate-500'
                                    }`}
                                    aria-pressed={enabled}
                                >
                                    <Icon className="w-3 h-3" />
                                    {meta.label}
                                </button>
                            );
                        })}
                    </div>
                    <label className="mt-1 flex items-start gap-2 text-[10px] leading-relaxed text-slate-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={consent.sensitive_findings_acknowledged}
                            onChange={toggleSensitive}
                            className="mt-0.5"
                        />
                        <span>
                            I acknowledge that <span className="text-rose-300">cancer-risk</span> and{' '}
                            <span className="text-violet-300">APOE-ε4</span> findings can be
                            emotionally heavy and that EverAfter is{' '}
                            <span className="font-medium">not</span> a substitute for a clinical
                            genetic test. Surface these findings anyway.
                        </span>
                    </label>
                </div>
            )}

            {error && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5 text-[11px] text-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Header counts */}
            {!loading && findings.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {ALL_CATEGORIES.map((cat) =>
                        summary.counts[cat] > 0 ? (
                            <span
                                key={cat}
                                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${CATEGORY_META[cat].tone}`}
                            >
                                {summary.counts[cat]} {CATEGORY_META[cat].label.toLowerCase()}
                            </span>
                        ) : null,
                    )}
                    {summary.urgent > 0 && (
                        <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/15 px-1.5 py-0.5 text-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            {summary.urgent} urgent
                        </span>
                    )}
                </div>
            )}

            {/* Findings list */}
            {loading && (
                <div className="text-[11px] text-slate-500 text-center py-2">
                    Mapping variants to clinical evidence…
                </div>
            )}
            {!loading && findings.length === 0 && hasProfile && (
                <div className="text-[11px] text-slate-500 px-1">
                    No findings in the enabled categories. Toggle Settings to enable more.
                </div>
            )}
            <ul className="space-y-1.5">
                {findings.map((f) => {
                    const meta = CATEGORY_META[f.category];
                    const sev = SEVERITY_BADGE[f.severity];
                    const Icon = meta.icon;
                    return (
                        <li
                            key={f.id}
                            className="rounded-lg border border-white/5 bg-white/[0.025] px-3 py-2 space-y-1"
                        >
                            <div className="flex items-center gap-2">
                                <Icon className={`w-3.5 h-3.5 shrink-0 ${meta.tone.split(' ').pop()}`} />
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs text-white truncate">
                                        {f.name}{' '}
                                        <span className="text-slate-500 text-[10px]">
                                            ({f.gene} · {f.rsid})
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                        {f.phenotype_label}{' '}
                                        <span className="text-slate-600">· genotype {f.genotype}</span>
                                    </div>
                                </div>
                                <span
                                    className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md border text-[9px] uppercase tracking-wider ${sev.cls}`}
                                >
                                    {sev.label}
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-400 leading-snug">
                                {f.summary}
                            </div>
                            <div className="text-[10px] text-violet-200/90 leading-snug">
                                {f.recommendation}
                            </div>
                            <a
                                href={f.evidence_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300"
                            >
                                <ExternalLink className="w-2.5 h-2.5" />
                                Evidence ({f.evidence})
                            </a>
                        </li>
                    );
                })}
            </ul>

            <p className="text-[10px] text-slate-500 leading-relaxed">
                Findings are mapped from a curated set of clinically-evidenced SNPs to the rows in
                {member.firstName}'s encrypted DNA file. This is{' '}
                <span className="text-rose-300">not</span> a medical diagnosis. Any urgent or high
                finding is a starting point for a conversation with a clinician or genetic
                counselor.
            </p>
        </section>
    );
}
