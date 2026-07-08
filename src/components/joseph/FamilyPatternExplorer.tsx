/**
 * Family Pattern Explorer
 * ========================
 * Drag-and-drop reflective pattern tool for the "St. Joseph" tab, powered by
 * the Trinity `family_pattern_reflection` action.
 *
 * This is deliberately NOT a genetic predictor: Big Five personality traits
 * are polygenic and shaped heavily by environment, so there is no single
 * "dominant allele" for a trait like extraversion, and no Mendelian
 * Punnett-square math is used anywhere in this feature. Two family members'
 * real OCEAN tendencies (from the existing personality quiz) are blended
 * with a regression-toward-the-mean estimate, plotted on an Affective
 * Circumplex, and life experiences are shown as narrative context rather
 * than numeric probability modifiers. Every result carries an explicit
 * "illustrative, not diagnostic" disclaimer end to end.
 */
import { useEffect, useMemo, useState, type DragEvent, type KeyboardEvent } from 'react';
import { GitMerge, Compass, Tag, Info, Loader2, RefreshCw, X, Users } from 'lucide-react';
import { trinitySynapse } from '../trinity/trinityApi';
import {
    getFamilyPatternMemberOptions,
    LIFE_EXPERIENCE_CATALOG,
    type FamilyPatternMemberOption,
    type FamilyPatternProfile,
    type LifeExperienceEntry,
    type LifeExperienceTag,
} from '../../lib/joseph/familyPatterns';

const DRAG_MEMBER = 'application/x-everafter-member';
const DRAG_EXPERIENCE = 'application/x-everafter-experience';

type SlotKey = 'a' | 'b';

export default function FamilyPatternExplorer() {
    const [members, setMembers] = useState<FamilyPatternMemberOption[]>(() => getFamilyPatternMemberOptions());
    const [slotA, setSlotA] = useState<string | null>(null);
    const [slotB, setSlotB] = useState<string | null>(null);
    const [experiences, setExperiences] = useState<LifeExperienceEntry[]>([]);
    const [result, setResult] = useState<FamilyPatternProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragOverSlot, setDragOverSlot] = useState<SlotKey | null>(null);

    // members was seeded from whatever genealogy.ts had in memory at mount -
    // refresh once Supabase hydration completes (same pattern as the other
    // St. Joseph tabs).
    useEffect(() => {
        const refresh = () => setMembers(getFamilyPatternMemberOptions());
        window.addEventListener('everafter:genealogy-hydrated', refresh);
        return () => window.removeEventListener('everafter:genealogy-hydrated', refresh);
    }, []);

    const memberA = useMemo(() => members.find((m) => m.id === slotA) || null, [members, slotA]);
    const memberB = useMemo(() => members.find((m) => m.id === slotB) || null, [members, slotB]);

    function assignSlot(slot: SlotKey, memberId: string) {
        if (slot === 'a') setSlotA(memberId); else setSlotB(memberId);
        setResult(null);
    }

    function clearSlot(slot: SlotKey) {
        const clearedId = slot === 'a' ? slotA : slotB;
        if (slot === 'a') setSlotA(null); else setSlotB(null);
        setExperiences((prev) => prev.filter((e) => e.member_id !== clearedId));
        setResult(null);
    }

    function toggleMember(memberId: string) {
        if (memberId === slotA) { clearSlot('a'); return; }
        if (memberId === slotB) { clearSlot('b'); return; }
        assignSlot(!slotA ? 'a' : !slotB ? 'b' : 'a', memberId);
    }

    function handleChipKeyDown(e: KeyboardEvent<HTMLDivElement>, memberId: string) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleMember(memberId);
        }
    }

    function handleMemberDragStart(e: DragEvent<HTMLDivElement>, memberId: string) {
        e.dataTransfer.setData(DRAG_MEMBER, memberId);
        e.dataTransfer.effectAllowed = 'copy';
    }

    function handleExperienceDragStart(e: DragEvent<HTMLDivElement>, tag: LifeExperienceTag) {
        e.dataTransfer.setData(DRAG_EXPERIENCE, tag);
        e.dataTransfer.effectAllowed = 'copy';
    }

    function handleSlotDragOver(e: DragEvent<HTMLDivElement>, slot: SlotKey) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragOverSlot(slot);
    }

    function handleSlotDrop(e: DragEvent<HTMLDivElement>, slot: SlotKey) {
        e.preventDefault();
        setDragOverSlot(null);

        const memberId = e.dataTransfer.getData(DRAG_MEMBER);
        if (memberId) {
            assignSlot(slot, memberId);
            return;
        }

        const experienceTag = e.dataTransfer.getData(DRAG_EXPERIENCE) as LifeExperienceTag;
        if (!experienceTag) return;

        const targetMember = slot === 'a' ? memberA : memberB;
        if (!targetMember) return;

        setExperiences((prev) => {
            if (prev.some((exp) => exp.tag === experienceTag && exp.member_id === targetMember.id)) return prev;
            return [...prev, { tag: experienceTag, member_id: targetMember.id, member_name: targetMember.name }];
        });
        setResult(null);
    }

    function removeExperience(tag: string, memberId: string) {
        setExperiences((prev) => prev.filter((exp) => !(exp.tag === tag && exp.member_id === memberId)));
        setResult(null);
    }

    async function reflect() {
        if (!memberA || !memberB) return;
        setLoading(true);
        setError(null);
        try {
            const data = await trinitySynapse<FamilyPatternProfile>('family_pattern_reflection', {
                member_a_name: memberA.name,
                member_a_traits: memberA.traits,
                member_b_name: memberB.name,
                member_b_traits: memberB.traits,
                life_experiences: experiences,
            });
            if (data) setResult(data);
            else setError('Could not compute a reflection right now — try again in a moment.');
        } catch (err) {
            console.warn('FamilyPatternExplorer: reflect failed', err);
            setError('Could not compute a reflection right now — try again in a moment.');
        } finally {
            setLoading(false);
        }
    }

    function reset() {
        setSlotA(null);
        setSlotB(null);
        setExperiences([]);
        setResult(null);
        setError(null);
    }

    return (
        <div className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-6">
                <div className="flex items-center gap-2 mb-1">
                    <GitMerge className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-white">Family Pattern Explorer</span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                    Drag two family members into the panels below to reflect on how their personality tendencies might
                    blend, and drag a life experience onto either one to add context.
                </p>

                <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 mb-5">
                    <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                        Personality traits are polygenic and shaped heavily by life experience — there is no single
                        "dominant gene" for traits like extraversion. Everything below is an illustrative estimate,
                        never a diagnosis or a claim of fact about any real person.
                    </p>
                </div>

                <div className="mb-5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Family Roster — drag or tap to place</p>
                    <div className="flex flex-wrap gap-2">
                        {members.map((m) => {
                            const active = m.id === slotA || m.id === slotB;
                            return (
                                <div
                                    key={m.id}
                                    role="button"
                                    tabIndex={0}
                                    draggable
                                    onDragStart={(e) => handleMemberDragStart(e, m.id)}
                                    onClick={() => toggleMember(m.id)}
                                    onKeyDown={(e) => handleChipKeyDown(e, m.id)}
                                    className={`cursor-grab active:cursor-grabbing select-none px-3 py-1.5 rounded-full border text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
                                        active
                                            ? 'border-amber-400/50 bg-amber-500/10 text-amber-200'
                                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20'
                                    }`}
                                    title={m.hasProfile ? undefined : 'No personality quiz on file yet — using population-average placeholders'}
                                >
                                    {m.name}
                                    <span className="text-slate-500 ml-1">· {m.generationLabel}</span>
                                    {!m.hasProfile && <span className="text-slate-600 ml-1">(no quiz)</span>}
                                </div>
                            );
                        })}
                        {members.length === 0 && (
                            <p className="text-xs text-slate-600">No family members yet — add someone in the Family Tree tab first.</p>
                        )}
                    </div>
                </div>

                <div className="mb-5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Life Experiences — drag onto a slot below</p>
                    <div className="flex flex-wrap gap-2">
                        {LIFE_EXPERIENCE_CATALOG.map((exp) => (
                            <div
                                key={exp.tag}
                                draggable
                                onDragStart={(e) => handleExperienceDragStart(e, exp.tag)}
                                className="cursor-grab active:cursor-grabbing select-none flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03] text-[11px] text-slate-300 hover:border-white/20"
                                title={exp.description}
                            >
                                <span aria-hidden="true">{exp.emoji}</span>{exp.label}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-5">
                    {(['a', 'b'] as SlotKey[]).map((slot) => {
                        const member = slot === 'a' ? memberA : memberB;
                        const slotExperiences = member ? experiences.filter((e) => e.member_id === member.id) : [];
                        return (
                            <div
                                key={slot}
                                onDrop={(e) => handleSlotDrop(e, slot)}
                                onDragOver={(e) => handleSlotDragOver(e, slot)}
                                onDragLeave={() => setDragOverSlot(null)}
                                className={`rounded-xl border-2 border-dashed p-4 min-h-[132px] transition-colors ${
                                    dragOverSlot === slot ? 'border-amber-400/60 bg-amber-500/5' : 'border-white/10 bg-white/[0.02]'
                                }`}
                            >
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                                    {slot === 'a' ? 'Family Member A' : 'Family Member B'}
                                </p>
                                {member ? (
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-white font-medium">{member.name}</span>
                                            <button
                                                onClick={() => clearSlot(slot)}
                                                className="text-slate-600 hover:text-slate-400"
                                                aria-label={`Clear Family Member ${slot === 'a' ? 'A' : 'B'}`}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-slate-500">{member.generationLabel}</p>
                                        {slotExperiences.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {slotExperiences.map((exp) => {
                                                    const catalogEntry = LIFE_EXPERIENCE_CATALOG.find((c) => c.tag === exp.tag);
                                                    return (
                                                        <span key={exp.tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-slate-400">
                                                            <span aria-hidden="true">{catalogEntry?.emoji}</span> {catalogEntry?.label}
                                                            <button onClick={() => removeExperience(exp.tag, member.id)} aria-label={`Remove ${catalogEntry?.label}`}>
                                                                <X className="w-2.5 h-2.5" />
                                                            </button>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-slate-600 text-xs">
                                        <Users className="w-3.5 h-3.5" />
                                        Drop a family member here
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={reflect}
                        disabled={!memberA || !memberB || loading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/90 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 text-xs font-semibold transition-colors"
                    >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitMerge className="w-3.5 h-3.5" />}
                        Reflect on this pairing
                    </button>
                    {(slotA || slotB || experiences.length > 0 || result) && (
                        <button onClick={reset} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300">
                            <RefreshCw className="w-3 h-3" /> Reset
                        </button>
                    )}
                </div>
                {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
            </div>

            {result && <FamilyPatternResult result={result} />}
        </div>
    );
}

function FamilyPatternResult({ result }: { result: FamilyPatternProfile }) {
    const traits = Object.entries(result.blended_tendencies || {});
    const circumplex = result.circumplex || { valence: 0, arousal: 0, quadrant: '' };
    const notes = result.experience_notes || [];

    // 200x200 viewbox, center (100,100); valence/arousal each range -1..1.
    const px = 100 + circumplex.valence * 80;
    const py = 100 - circumplex.arousal * 80;

    return (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-6 space-y-5">
            <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-semibold text-white">
                    {result.member_a_name} × {result.member_b_name}
                </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                    {traits.map(([key, value]) => (
                        <div key={key}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] text-slate-400">{result.trait_labels?.[key] || key}</span>
                                <span className="text-xs font-medium text-white">{Number(value).toFixed(0)}</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-teal-400/80 transition-all duration-700" style={{ width: `${value}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col items-center">
                    <svg viewBox="0 0 200 200" className="w-full max-w-[200px]" role="img" aria-label={`Affective Circumplex plot: ${circumplex.quadrant}`}>
                        <line x1="0" y1="100" x2="200" y2="100" stroke="#334155" strokeWidth="1" />
                        <line x1="100" y1="0" x2="100" y2="200" stroke="#334155" strokeWidth="1" />
                        <circle cx="100" cy="100" r="80" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2 3" />
                        <circle cx={px} cy={py} r="6" fill="#2dd4bf" />
                        <text x="104" y="12" fontSize="8" fill="#64748b">Activated</text>
                        <text x="104" y="197" fontSize="8" fill="#64748b">Calm</text>
                        <text x="142" y="98" fontSize="8" fill="#64748b">Pleasant</text>
                        <text x="4" y="98" fontSize="8" fill="#64748b">Unpleasant</text>
                    </svg>
                    <p className="text-xs text-slate-400 mt-1">{circumplex.quadrant}</p>
                    <p className="text-[10px] text-slate-600">Affective Circumplex (illustrative)</p>
                </div>
            </div>

            {notes.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Life Experience Notes</p>
                    {notes.map((note, i) => (
                        <div key={`${note.tag}-${i}`} className="flex items-start gap-2 text-[11px] text-slate-400">
                            <Tag className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
                            <p><span className="text-slate-300">{note.member_name}:</span> {note.note}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="pt-3 border-t border-white/5 space-y-1.5">
                <p className="text-[11px] text-slate-500 leading-relaxed">{result.methodology_note}</p>
                <p className="text-[11px] text-amber-300/70 leading-relaxed">{result.disclaimer}</p>
            </div>
        </div>
    );
}
