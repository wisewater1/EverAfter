import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
    Archive,
    ArrowLeft,
    Calendar,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Flame,
    MapPin,
    Pencil,
    Play,
    Plus,
    Sparkles,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import {
    describeRelationship,
    findRelationshipPath,
    getFamilyMembers,
    type FamilyMember,
} from '../../lib/joseph/genealogy';
import {
    archiveCeremony,
    buildCeremonyScript,
    completeCeremony,
    createCeremony,
    updateCeremony,
    listCeremonies,
    type Ceremony,
    type CeremonyStatus,
    type CeremonyStep,
    type CeremonyType,
} from '../../lib/ceremonies/ceremonies';
import { useNotification } from '../../contexts/NotificationContext';

type ViewMode = 'list' | 'form' | 'conduct';

const CEREMONY_TYPES: { value: CeremonyType; label: string }[] = [
    { value: 'remembrance', label: 'Remembrance' },
    { value: 'gratitude', label: 'Gratitude' },
    { value: 'blessing', label: 'Blessing' },
    { value: 'milestone', label: 'Milestone' },
    { value: 'legacy', label: 'Legacy' },
    { value: 'seasonal', label: 'Seasonal' },
    { value: 'custom', label: 'Custom' },
];

const inputClass =
    'w-full min-h-11 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-amber-50 placeholder:text-amber-100/30 transition-colors focus:border-amber-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60';

interface CeremonyFormState {
    title: string;
    description: string;
    ceremonyType: CeremonyType;
    scheduledDate: string;
    scheduledTime: string;
    durationMinutes: string;
    location: string;
    honoreeMemberId: string;
    participantMemberIds: string[];
    script: CeremonyStep[];
}

function ceremonyTypeLabel(type: CeremonyType): string {
    return CEREMONY_TYPES.find((option) => option.value === type)?.label ?? 'Ceremony';
}

function memberDisplayName(member: FamilyMember): string {
    return `${member.firstName} ${member.lastName}`.trim();
}

function findMemberByClientId(members: FamilyMember[], clientId: string | undefined): FamilyMember | undefined {
    if (!clientId) return undefined;
    return members.find((member) => member.id === clientId);
}

function toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function toTimeInputValue(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function combineDateAndTime(dateValue: string, timeValue: string): Date | null {
    if (!dateValue) return null;
    const time = timeValue || '09:00';
    const combined = new Date(`${dateValue}T${time}:00`);
    return Number.isNaN(combined.getTime()) ? null : combined;
}

function emptyFormState(): CeremonyFormState {
    return {
        title: '',
        description: '',
        ceremonyType: 'remembrance',
        scheduledDate: '',
        scheduledTime: '',
        durationMinutes: '',
        location: '',
        honoreeMemberId: '',
        participantMemberIds: [],
        script: buildCeremonyScript('remembrance'),
    };
}

function formStateFromCeremony(ceremony: Ceremony): CeremonyFormState {
    const scheduled = ceremony.scheduledAt ? new Date(ceremony.scheduledAt) : null;
    const validScheduled = scheduled && !Number.isNaN(scheduled.getTime()) ? scheduled : null;

    return {
        title: ceremony.title,
        description: ceremony.description ?? '',
        ceremonyType: ceremony.ceremonyType,
        scheduledDate: validScheduled ? toDateInputValue(validScheduled) : '',
        scheduledTime: validScheduled ? toTimeInputValue(validScheduled) : '',
        durationMinutes: ceremony.durationMinutes ? String(ceremony.durationMinutes) : '',
        location: ceremony.location ?? '',
        honoreeMemberId: ceremony.honoreeMemberId ?? '',
        participantMemberIds: ceremony.participantMemberIds,
        script: ceremony.script.length > 0 ? ceremony.script : buildCeremonyScript(ceremony.ceremonyType),
    };
}

interface CeremonyCardProps {
    ceremony: Ceremony;
    familyMembers: FamilyMember[];
    onBegin?: () => void;
    onEdit?: () => void;
    onArchive?: () => void;
}

function CeremonyCard({ ceremony, familyMembers, onBegin, onEdit, onArchive }: CeremonyCardProps) {
    const honoree = findMemberByClientId(familyMembers, ceremony.honoreeMemberId);
    const scheduled = ceremony.scheduledAt ? new Date(ceremony.scheduledAt) : null;
    const validScheduled = scheduled && !Number.isNaN(scheduled.getTime()) ? scheduled : null;
    const isPastDue = Boolean(validScheduled && validScheduled.getTime() < Date.now() && ceremony.status === 'scheduled');

    return (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-amber-500/20">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                            <Flame className="h-3 w-3" />
                            {ceremonyTypeLabel(ceremony.ceremonyType)}
                        </span>
                        {isPastDue && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-amber-200/70">
                                This date has passed
                            </span>
                        )}
                    </div>
                    <h3 className="text-lg font-medium text-amber-50">{ceremony.title}</h3>
                    {honoree && <p className="text-sm text-amber-200/60">In honor of {memberDisplayName(honoree)}</p>}
                </div>
                {onArchive && (
                    <button
                        type="button"
                        onClick={onArchive}
                        title="Archive this ceremony"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 text-amber-200/50 transition-colors hover:border-white/20 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                    >
                        <Archive className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-amber-200/60">
                {validScheduled && (
                    <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {validScheduled.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                        {' at '}
                        {validScheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
                {ceremony.location && (
                    <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {ceremony.location}
                    </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {ceremony.participantMemberIds.length} participant{ceremony.participantMemberIds.length === 1 ? '' : 's'}
                </span>
            </div>

            {ceremony.status === 'completed' && (
                <div className="rounded-xl border border-white/5 bg-black/20 p-3 text-sm italic text-amber-100/80">
                    {ceremony.reflection ? `"${ceremony.reflection}"` : 'This ceremony was completed without a written reflection.'}
                </div>
            )}

            {(onBegin || onEdit) && (
                <div className="flex flex-wrap gap-2 pt-1">
                    {onBegin && (
                        <button
                            type="button"
                            onClick={onBegin}
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-amber-50 transition-colors hover:bg-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                        >
                            <Play className="h-4 w-4" />
                            Begin Ceremony
                        </button>
                    )}
                    {onEdit && (
                        <button
                            type="button"
                            onClick={onEdit}
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-amber-100 transition-colors hover:border-amber-500/30 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default function RitualAltar() {
    const { showNotification } = useNotification();

    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [ceremonies, setCeremonies] = useState<Ceremony[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<ViewMode>('list');
    const [showArchived, setShowArchived] = useState(false);

    const [editingCeremonyId, setEditingCeremonyId] = useState<string | null>(null);
    const [formState, setFormState] = useState<CeremonyFormState>(emptyFormState());
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [suggestingScript, setSuggestingScript] = useState(false);

    const [conductCeremony, setConductCeremony] = useState<Ceremony | null>(null);
    const [conductStepIndex, setConductStepIndex] = useState(-1);
    const [reflectionDraft, setReflectionDraft] = useState('');
    const [completing, setCompleting] = useState(false);
    const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);

    const loadCeremonies = async () => {
        try {
            const result = await listCeremonies();
            setCeremonies(result);
        } catch (error) {
            showNotification(error instanceof Error ? error.message : 'We could not load your ceremonies.', 'error');
        }
    };

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                setFamilyMembers(getFamilyMembers());
            } catch {
                // No family data yet; the form still works with an empty list.
            }
            await loadCeremonies();
            if (mounted) setLoading(false);
        })();
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const handleHydrated = () => setFamilyMembers(getFamilyMembers());
        window.addEventListener('everafter:genealogy-hydrated', handleHydrated);
        return () => window.removeEventListener('everafter:genealogy-hydrated', handleHydrated);
    }, []);

    const grouped = useMemo(() => {
        const upcoming = ceremonies
            .filter((c) => c.status === 'scheduled')
            .sort((a, b) => new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime());
        const drafts = ceremonies
            .filter((c) => c.status === 'draft')
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        const completed = ceremonies
            .filter((c) => c.status === 'completed')
            .sort((a, b) => new Date(b.completedAt ?? b.updatedAt).getTime() - new Date(a.completedAt ?? a.updatedAt).getTime());
        const archived = ceremonies
            .filter((c) => c.status === 'archived')
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        return { upcoming, drafts, completed, archived };
    }, [ceremonies]);

    const openCreateForm = () => {
        setEditingCeremonyId(null);
        setFormState(emptyFormState());
        setFormError(null);
        setView('form');
    };

    const openEditForm = (ceremony: Ceremony) => {
        setEditingCeremonyId(ceremony.id);
        setFormState(formStateFromCeremony(ceremony));
        setFormError(null);
        setView('form');
    };

    const closeForm = () => {
        setView('list');
        setEditingCeremonyId(null);
        setFormError(null);
    };

    const updateStep = (index: number, patch: Partial<CeremonyStep>) => {
        setFormState((prev) => ({
            ...prev,
            script: prev.script.map((step, i) => (i === index ? { ...step, ...patch } : step)),
        }));
    };

    const addStep = () => {
        setFormState((prev) => ({
            ...prev,
            script: [...prev.script, { title: `Step ${prev.script.length + 1}`, text: '' }],
        }));
    };

    const removeStep = (index: number) => {
        setFormState((prev) => ({ ...prev, script: prev.script.filter((_, i) => i !== index) }));
    };

    const moveStep = (index: number, direction: -1 | 1) => {
        setFormState((prev) => {
            const nextIndex = index + direction;
            if (nextIndex < 0 || nextIndex >= prev.script.length) return prev;
            const script = [...prev.script];
            const [moved] = script.splice(index, 1);
            script.splice(nextIndex, 0, moved);
            return { ...prev, script };
        });
    };

    const applySuggestedScript = () => {
        setFormState((prev) => {
            const honoree = findMemberByClientId(familyMembers, prev.honoreeMemberId);
            return { ...prev, script: buildCeremonyScript(prev.ceremonyType, honoree ? memberDisplayName(honoree) : undefined) };
        });
    };

    const toggleParticipant = (memberId: string) => {
        setFormState((prev) => ({
            ...prev,
            participantMemberIds: prev.participantMemberIds.includes(memberId)
                ? prev.participantMemberIds.filter((id) => id !== memberId)
                : [...prev.participantMemberIds, memberId],
        }));
    };

    // Optional, best-effort enhancement only. buildCeremonyScript() above is
    // always the first-class script; when this backend suggestion is
    // unavailable or fails, it fails silently and the template stands.
    const tryAlternateScript = async () => {
        setSuggestingScript(true);
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 4000);
        try {
            const honoree = findMemberByClientId(familyMembers, formState.honoreeMemberId);
            const participantNames = formState.participantMemberIds
                .map((id) => findMemberByClientId(familyMembers, id))
                .filter((member): member is FamilyMember => Boolean(member))
                .map(memberDisplayName);

            const response = await axios.post(
                '/api/v1/rituals/generate',
                {
                    ritual_type: formState.ceremonyType,
                    context: formState.description,
                    participants: participantNames,
                    ancestor_id: honoree ? honoree.id : null,
                },
                { signal: controller.signal },
            );

            const rawSteps = Array.isArray(response.data?.steps) ? response.data.steps : [];
            const mapped: CeremonyStep[] = rawSteps
                .map((step: { title?: string; actor?: string; dialogue?: string; action?: string }, index: number) => ({
                    title: step.title || step.actor || `Step ${index + 1}`,
                    text: step.dialogue || step.action || '',
                }))
                .filter((step: CeremonyStep) => step.text.trim().length > 0);

            if (mapped.length > 0) {
                setFormState((prev) => ({ ...prev, script: mapped }));
                showNotification('Loaded an alternate script suggestion.', 'success');
            }
        } catch {
            // Silent by design; the suggested template is already in place.
        } finally {
            window.clearTimeout(timeoutId);
            setSuggestingScript(false);
        }
    };

    const handleSave = async (status: Extract<CeremonyStatus, 'draft' | 'scheduled'>) => {
        setFormError(null);
        const title = formState.title.trim();
        if (!title) {
            setFormError('Give the ceremony a title before saving.');
            return;
        }

        const combined = combineDateAndTime(formState.scheduledDate, formState.scheduledTime);
        if (status === 'scheduled') {
            if (!combined) {
                setFormError('Choose a date for the ceremony before scheduling it.');
                return;
            }
            if (combined.getTime() <= Date.now()) {
                setFormError('Choose a date and time in the future to schedule this ceremony.');
                return;
            }
        }

        const durationMinutes = formState.durationMinutes.trim() ? Number(formState.durationMinutes) : undefined;
        if (durationMinutes !== undefined && (!Number.isFinite(durationMinutes) || durationMinutes <= 0)) {
            setFormError('Duration should be a positive number of minutes.');
            return;
        }

        const trimmedSteps = formState.script
            .map((step) => ({ title: step.title.trim(), text: step.text.trim() }))
            .filter((step) => step.title.length > 0 || step.text.length > 0);

        setSaving(true);
        try {
            if (editingCeremonyId) {
                const updated = await updateCeremony(editingCeremonyId, {
                    title,
                    description: formState.description,
                    ceremonyType: formState.ceremonyType,
                    scheduledAt: combined ? combined.toISOString() : null,
                    durationMinutes: durationMinutes ?? null,
                    location: formState.location,
                    honoreeMemberId: formState.honoreeMemberId || null,
                    participantMemberIds: formState.participantMemberIds,
                    script: trimmedSteps,
                    status,
                });
                setCeremonies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            } else {
                const created = await createCeremony({
                    title,
                    description: formState.description,
                    ceremonyType: formState.ceremonyType,
                    scheduledAt: combined ? combined.toISOString() : undefined,
                    durationMinutes,
                    location: formState.location,
                    honoreeMemberId: formState.honoreeMemberId || undefined,
                    participantMemberIds: formState.participantMemberIds,
                    script: trimmedSteps,
                    status,
                });
                setCeremonies((prev) => [created, ...prev]);
            }
            showNotification(status === 'scheduled' ? 'Ceremony scheduled.' : 'Saved as a draft.', 'success');
            setView('list');
            setEditingCeremonyId(null);
        } catch (error) {
            showNotification(error instanceof Error ? error.message : 'We could not save this ceremony.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleArchive = async (ceremony: Ceremony) => {
        if (!window.confirm(`Move "${ceremony.title}" to the archive?`)) return;
        try {
            await archiveCeremony(ceremony.id);
            setCeremonies((prev) => prev.map((c) => (c.id === ceremony.id ? { ...c, status: 'archived' } : c)));
            showNotification('Ceremony archived.', 'success');
        } catch (error) {
            showNotification(error instanceof Error ? error.message : 'We could not archive this ceremony.', 'error');
        }
    };

    const beginCeremony = (ceremony: Ceremony) => {
        setConductCeremony(ceremony);
        setConductStepIndex(-1);
        setReflectionDraft('');
        setShowParticipantsPanel(false);
        setView('conduct');
    };

    const exitConduct = () => {
        setConductCeremony(null);
        setConductStepIndex(-1);
        setReflectionDraft('');
        setView('list');
    };

    const nextConductStep = () => {
        if (!conductCeremony) return;
        setConductStepIndex((prev) => Math.min(prev + 1, conductCeremony.script.length));
    };

    const prevConductStep = () => {
        setConductStepIndex((prev) => Math.max(prev - 1, -1));
    };

    const handleCompleteCeremony = async () => {
        if (!conductCeremony) return;
        setCompleting(true);
        try {
            const completed = await completeCeremony(conductCeremony.id, reflectionDraft);
            setCeremonies((prev) => prev.map((c) => (c.id === completed.id ? completed : c)));
            showNotification('Ceremony completed and added to the family Chronicle.', 'success');
            exitConduct();
        } catch (error) {
            showNotification(error instanceof Error ? error.message : 'We could not complete this ceremony.', 'error');
        } finally {
            setCompleting(false);
        }
    };

    const conductParticipants = useMemo(() => {
        if (!conductCeremony) return [] as { id: string; name: string; role: string }[];

        const honoree = findMemberByClientId(familyMembers, conductCeremony.honoreeMemberId);
        const entries: { id: string; name: string; role: string }[] = [];

        if (conductCeremony.honoreeMemberId) {
            entries.push({
                id: conductCeremony.honoreeMemberId,
                name: honoree ? memberDisplayName(honoree) : 'Family member',
                role: 'Honoree',
            });
        }

        for (const memberId of conductCeremony.participantMemberIds) {
            if (memberId === conductCeremony.honoreeMemberId) continue;
            const member = findMemberByClientId(familyMembers, memberId);
            if (!member) {
                entries.push({ id: memberId, name: 'Family member', role: 'Participant' });
                continue;
            }
            const path = honoree ? findRelationshipPath(honoree.id, member.id) : null;
            const role = path && path.length > 0 ? describeRelationship(path) : member.aiPersonality?.familyRole || 'Participant';
            entries.push({ id: member.id, name: memberDisplayName(member), role });
        }

        return entries;
    }, [conductCeremony, familyMembers]);

    return (
        <div className="min-h-[100dvh] bg-black px-4 py-8 text-amber-100 sm:px-6 sm:py-10 md:px-10">
            <div
                className="pointer-events-none fixed inset-0 opacity-[0.15]"
                style={{ background: 'radial-gradient(circle at 50% 15%, hsla(35, 92%, 50%, 0.8) 0%, transparent 70%)' }}
            />

            <div className="relative mx-auto w-full max-w-5xl">
                {view === 'list' && (
                    <div className="space-y-10 animate-in fade-in duration-500">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h1 className="text-3xl font-light tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-amber-200 to-amber-600 sm:text-4xl">
                                    Ceremonies
                                </h1>
                                <p className="mt-2 max-w-xl text-sm text-amber-200/60 sm:text-base">
                                    Plan gatherings that honor your family's passing, gratitude, and legacy, at whatever pace feels right.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={openCreateForm}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-amber-50 transition-colors hover:bg-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                            >
                                <Plus className="h-4 w-4" />
                                New Ceremony
                            </button>
                        </div>

                        {loading && ceremonies.length === 0 && (
                            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-amber-200/50">
                                Gathering your ceremonies...
                            </div>
                        )}

                        {!loading && ceremonies.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center sm:p-16">
                                <Flame className="mx-auto h-10 w-10 text-amber-500/50" />
                                <h3 className="mt-4 text-xl text-amber-100">Plan your family's first ceremony</h3>
                                <p className="mx-auto mt-2 max-w-md text-sm text-amber-200/60">
                                    A ceremony can be as simple as a shared memory or as considered as a legacy hand-off to a designated
                                    successor. Whenever you are ready, it starts here.
                                </p>
                                <button
                                    type="button"
                                    onClick={openCreateForm}
                                    className="mx-auto mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-amber-50 transition-colors hover:bg-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                                >
                                    <Plus className="h-4 w-4" />
                                    Create your first ceremony
                                </button>
                            </div>
                        )}

                        {grouped.upcoming.length > 0 && (
                            <section className="space-y-4">
                                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500/70">Upcoming</h2>
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    {grouped.upcoming.map((ceremony) => (
                                        <CeremonyCard
                                            key={ceremony.id}
                                            ceremony={ceremony}
                                            familyMembers={familyMembers}
                                            onBegin={() => beginCeremony(ceremony)}
                                            onEdit={() => openEditForm(ceremony)}
                                            onArchive={() => handleArchive(ceremony)}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {grouped.drafts.length > 0 && (
                            <section className="space-y-4">
                                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500/70">Drafts</h2>
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    {grouped.drafts.map((ceremony) => (
                                        <CeremonyCard
                                            key={ceremony.id}
                                            ceremony={ceremony}
                                            familyMembers={familyMembers}
                                            onBegin={() => beginCeremony(ceremony)}
                                            onEdit={() => openEditForm(ceremony)}
                                            onArchive={() => handleArchive(ceremony)}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {grouped.completed.length > 0 && (
                            <section className="space-y-4">
                                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500/70">Completed</h2>
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    {grouped.completed.map((ceremony) => (
                                        <CeremonyCard
                                            key={ceremony.id}
                                            ceremony={ceremony}
                                            familyMembers={familyMembers}
                                            onArchive={() => handleArchive(ceremony)}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {grouped.archived.length > 0 && (
                            <section className="space-y-3 border-t border-white/5 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowArchived((v) => !v)}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium uppercase tracking-[0.2em] text-amber-500/50 transition-colors hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                                >
                                    {showArchived ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                    Archived ({grouped.archived.length})
                                </button>
                                {showArchived && (
                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                        {grouped.archived.map((ceremony) => (
                                            <CeremonyCard key={ceremony.id} ceremony={ceremony} familyMembers={familyMembers} />
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                )}

                {view === 'conduct' && conductCeremony && (
                    <div className="relative mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center pb-28 pt-16 sm:pt-8">
                        <button
                            type="button"
                            onClick={exitConduct}
                            className="absolute left-0 top-0 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm text-amber-200/60 transition-colors hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Leave ceremony
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowParticipantsPanel((v) => !v)}
                            className="absolute right-0 top-0 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-amber-200/70 transition-colors hover:border-amber-500/30 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                        >
                            <Users className="h-4 w-4" />
                            {conductParticipants.length}
                        </button>

                        <div className="mt-2 text-center animate-in fade-in duration-700">
                            <p className="text-xs uppercase tracking-[0.3em] text-amber-500/60">
                                {ceremonyTypeLabel(conductCeremony.ceremonyType)}
                            </p>
                            <h2 className="mt-2 text-2xl font-serif text-amber-100 sm:text-3xl">{conductCeremony.title}</h2>
                            {conductCeremony.description && (
                                <p className="mx-auto mt-2 max-w-xl text-sm italic text-amber-300/60">{conductCeremony.description}</p>
                            )}
                        </div>

                        {showParticipantsPanel && (
                            <div className="mt-6 w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-500/60">Gathered together</p>
                                <div className="space-y-2">
                                    {conductParticipants.length === 0 ? (
                                        <p className="text-sm text-amber-200/50">No one has been added to this ceremony yet.</p>
                                    ) : (
                                        conductParticipants.map((person) => (
                                            <div
                                                key={person.id}
                                                className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2"
                                            >
                                                <span className="text-sm text-amber-100">{person.name}</span>
                                                <span className="text-[10px] uppercase tracking-wider text-amber-500/60">{person.role}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mt-10 w-full max-w-2xl space-y-6">
                            {conductStepIndex >= 0 && conductStepIndex < conductCeremony.script.length ? (
                                <div className="rounded-2xl border border-amber-500/30 bg-amber-900/10 p-8 text-center shadow-[0_0_50px_rgba(245,158,11,0.1)] animate-in zoom-in-95 duration-500">
                                    <p className="text-xs font-bold uppercase tracking-widest text-amber-500">
                                        Step {conductStepIndex + 1} of {conductCeremony.script.length}
                                    </p>
                                    <h3 className="mt-3 text-xl text-amber-100 sm:text-2xl">
                                        {conductCeremony.script[conductStepIndex].title}
                                    </h3>
                                    <p className="mt-4 text-lg leading-relaxed text-amber-100/90">
                                        {conductCeremony.script[conductStepIndex].text}
                                    </p>
                                </div>
                            ) : conductStepIndex === -1 ? (
                                <div className="py-16 text-center text-amber-500/50">
                                    <p className="motion-safe:animate-pulse">Take a breath together before you begin.</p>
                                </div>
                            ) : (
                                <div className="space-y-6 py-6 text-center animate-in zoom-in duration-700">
                                    <div className="inline-flex rounded-full bg-amber-500/20 p-5">
                                        <CheckCircle className="h-10 w-10 text-amber-400" />
                                    </div>
                                    <h3 className="text-2xl text-amber-100">The ceremony is complete</h3>
                                    <p className="mx-auto max-w-md text-sm text-amber-300/60">
                                        If you would like, write a few words about how this gathering felt. It is kept with the ceremony
                                        and shared in your family Chronicle.
                                    </p>
                                    <textarea
                                        value={reflectionDraft}
                                        onChange={(e) => setReflectionDraft(e.target.value)}
                                        rows={4}
                                        placeholder="A few words about today (optional)"
                                        aria-label="Ceremony reflection"
                                        className={`mx-auto max-w-md text-left ${inputClass}`}
                                    />
                                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                                        <button
                                            type="button"
                                            onClick={handleCompleteCeremony}
                                            disabled={completing}
                                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-amber-50 transition-colors hover:bg-amber-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                                        >
                                            {completing ? 'Saving...' : 'Complete Ceremony'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {conductStepIndex < conductCeremony.script.length && (
                            <div className="mt-10 flex items-center gap-3">
                                {conductStepIndex >= 0 && (
                                    <button
                                        type="button"
                                        onClick={prevConductStep}
                                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm text-amber-200/70 transition-colors hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Back
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={nextConductStep}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-600 px-8 py-3 text-sm font-bold text-black transition-transform hover:scale-105 hover:bg-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                                >
                                    {conductStepIndex === -1 ? (
                                        <>
                                            Begin <Play className="h-4 w-4" />
                                        </>
                                    ) : (
                                        <>
                                            Next <ChevronRight className="h-4 w-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {view === 'form' && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/80 p-4 py-8 sm:items-center sm:backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-3xl border border-amber-500/20 bg-neutral-950 p-5 shadow-2xl sm:p-8">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-light text-amber-50">
                                    {editingCeremonyId ? 'Edit Ceremony' : 'Plan a Ceremony'}
                                </h2>
                                <p className="mt-1 text-sm text-amber-200/50">
                                    Take your time; you can always save this as a draft and come back.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeForm}
                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 text-amber-200/60 transition-colors hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {formError && (
                            <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                                {formError}
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="ceremony-title" className="text-xs font-semibold uppercase tracking-wider text-amber-500/70">
                                    Title
                                </label>
                                <input
                                    id="ceremony-title"
                                    value={formState.title}
                                    onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                                    placeholder="e.g. Remembering Grandpa Lucas"
                                    className={inputClass}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label htmlFor="ceremony-type" className="text-xs font-semibold uppercase tracking-wider text-amber-500/70">
                                        Type
                                    </label>
                                    <select
                                        id="ceremony-type"
                                        value={formState.ceremonyType}
                                        onChange={(e) => setFormState((prev) => ({ ...prev, ceremonyType: e.target.value as CeremonyType }))}
                                        className={inputClass}
                                    >
                                        {CEREMONY_TYPES.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label
                                        htmlFor="ceremony-honoree"
                                        className="text-xs font-semibold uppercase tracking-wider text-amber-500/70"
                                    >
                                        Honoree (optional)
                                    </label>
                                    <select
                                        id="ceremony-honoree"
                                        value={formState.honoreeMemberId}
                                        onChange={(e) => setFormState((prev) => ({ ...prev, honoreeMemberId: e.target.value }))}
                                        className={inputClass}
                                    >
                                        <option value="">No one in particular</option>
                                        {familyMembers.map((member) => (
                                            <option key={member.id} value={member.id}>
                                                {memberDisplayName(member)}
                                                {member.deathDate ? ' (in memory)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="ceremony-description"
                                    className="text-xs font-semibold uppercase tracking-wider text-amber-500/70"
                                >
                                    A note about this gathering (optional)
                                </label>
                                <textarea
                                    id="ceremony-description"
                                    value={formState.description}
                                    onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    placeholder="What is this ceremony for, and why now?"
                                    className={inputClass}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <label htmlFor="ceremony-date" className="text-xs font-semibold uppercase tracking-wider text-amber-500/70">
                                        Date
                                    </label>
                                    <input
                                        id="ceremony-date"
                                        type="date"
                                        value={formState.scheduledDate}
                                        onChange={(e) => setFormState((prev) => ({ ...prev, scheduledDate: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="ceremony-time" className="text-xs font-semibold uppercase tracking-wider text-amber-500/70">
                                        Time
                                    </label>
                                    <input
                                        id="ceremony-time"
                                        type="time"
                                        value={formState.scheduledTime}
                                        onChange={(e) => setFormState((prev) => ({ ...prev, scheduledTime: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label
                                        htmlFor="ceremony-duration"
                                        className="text-xs font-semibold uppercase tracking-wider text-amber-500/70"
                                    >
                                        Duration (minutes)
                                    </label>
                                    <input
                                        id="ceremony-duration"
                                        type="number"
                                        min={1}
                                        inputMode="numeric"
                                        value={formState.durationMinutes}
                                        onChange={(e) => setFormState((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                                        placeholder="30"
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="ceremony-location" className="text-xs font-semibold uppercase tracking-wider text-amber-500/70">
                                    Location (optional)
                                </label>
                                <input
                                    id="ceremony-location"
                                    value={formState.location}
                                    onChange={(e) => setFormState((prev) => ({ ...prev, location: e.target.value }))}
                                    placeholder="e.g. The back porch"
                                    className={inputClass}
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-semibold uppercase tracking-wider text-amber-500/70">
                                    Participants (optional)
                                </label>
                                {familyMembers.length === 0 ? (
                                    <p className="text-sm text-amber-200/50">Add family members to your tree to invite them here.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {familyMembers.map((member) => {
                                            const selected = formState.participantMemberIds.includes(member.id);
                                            return (
                                                <button
                                                    key={member.id}
                                                    type="button"
                                                    onClick={() => toggleParticipant(member.id)}
                                                    aria-pressed={selected}
                                                    className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
                                                        selected
                                                            ? 'border-amber-500 bg-amber-500/20 text-amber-100'
                                                            : 'border-white/10 text-amber-200/60 hover:border-amber-500/30 hover:text-amber-100'
                                                    }`}
                                                >
                                                    {memberDisplayName(member)}
                                                    {member.deathDate ? <span className="text-[10px] text-amber-200/40">(in memory)</span> : null}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-amber-500/70">
                                        Ceremony Script
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={applySuggestedScript}
                                            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-500/20 px-3 py-2 text-xs font-medium text-amber-300 transition-colors hover:border-amber-500/40 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                                        >
                                            <Sparkles className="h-3.5 w-3.5" />
                                            Use suggested script
                                        </button>
                                        <button
                                            type="button"
                                            onClick={tryAlternateScript}
                                            disabled={suggestingScript}
                                            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-amber-200/60 transition-colors hover:border-white/20 hover:text-amber-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                                        >
                                            {suggestingScript ? 'Asking...' : 'Try an alternate script'}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {formState.script.map((step, index) => (
                                        <div key={index} className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-4">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-500/60">
                                                    Step {index + 1}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveStep(index, -1)}
                                                        disabled={index === 0}
                                                        title="Move step earlier"
                                                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-amber-200/50 transition-colors hover:text-amber-100 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveStep(index, 1)}
                                                        disabled={index === formState.script.length - 1}
                                                        title="Move step later"
                                                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-amber-200/50 transition-colors hover:text-amber-100 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeStep(index)}
                                                        title="Remove step"
                                                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-amber-200/50 transition-colors hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                value={step.title}
                                                onChange={(e) => updateStep(index, { title: e.target.value })}
                                                placeholder="Step title"
                                                aria-label={`Step ${index + 1} title`}
                                                className={inputClass}
                                            />
                                            <textarea
                                                value={step.text}
                                                onChange={(e) => updateStep(index, { text: e.target.value })}
                                                rows={2}
                                                placeholder="What happens in this part of the ceremony?"
                                                aria-label={`Step ${index + 1} description`}
                                                className={inputClass}
                                            />
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addStep}
                                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-2.5 text-sm text-amber-200/60 transition-colors hover:border-amber-500/30 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add a step
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-white/5 pt-6 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeForm}
                                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-amber-200/70 transition-colors hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleSave('draft')}
                                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-500/30 px-5 py-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                            >
                                Save as Draft
                            </button>
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleSave('scheduled')}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-amber-50 transition-colors hover:bg-amber-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                            >
                                {saving ? 'Saving...' : 'Schedule'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
