import { useEffect, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Hourglass,
    Loader2,
    Lock,
    Save,
    Send,
    Shield,
    Trash2,
} from 'lucide-react';
import {
    getPosthumousDirective,
    setPosthumousDirective,
    applyDirectiveToAllProfiles,
} from '../../lib/genetics/posthumous';
import { DEFAULT_POSTHUMOUS_DIRECTIVE, type PosthumousDirective } from '../../lib/genetics/types';

interface PosthumousDirectiveEditorProps {
    userId: string;
    profileId: string;
    profileLabel: string;
    /** Optional list of designated PDG candidates (family member rows). */
    pdgCandidates?: { id: string; name: string }[];
    onSaved?: () => void;
}

const POLICY_OPTIONS: {
    id: PosthumousDirective['policy'];
    title: string;
    description: string;
    icon: typeof Shield;
    tone: string;
}[] = [
    {
        id: 'ask_pdg',
        title: 'Ask my guardian (default)',
        description:
            'On verified death, your Posthumous Data Guardian (PDG) is consulted before any survivor access or destruction. The safest default.',
        icon: Shield,
        tone: 'border-amber-500/30 bg-amber-500/5 text-amber-200',
    },
    {
        id: 'release_to_pdg',
        title: 'Release to my guardian',
        description:
            'On verified death, your PDG receives the materials you allow below. Useful when you want a specific family member to inherit findings.',
        icon: Send,
        tone: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200',
    },
    {
        id: 'preserve_locked',
        title: 'Preserve, but locked forever',
        description:
            'The encrypted file remains, but nobody can access it after you. Useful for "leave-no-trace" preferences.',
        icon: Lock,
        tone: 'border-violet-500/30 bg-violet-500/5 text-violet-200',
    },
    {
        id: 'destroy',
        title: 'Destroy on death',
        description:
            'On verified death, the encrypted blob and every indexed variant are deleted. Cannot be undone.',
        icon: Trash2,
        tone: 'border-rose-500/30 bg-rose-500/5 text-rose-200',
    },
];

export default function PosthumousDirectiveEditor({
    userId,
    profileId,
    profileLabel,
    pdgCandidates = [],
    onSaved,
}: PosthumousDirectiveEditorProps) {
    const [directive, setDirective] = useState<PosthumousDirective>(DEFAULT_POSTHUMOUS_DIRECTIVE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState<'this' | 'all' | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (!userId || !profileId) return;
        setLoading(true);
        setError(null);

        getPosthumousDirective(profileId, userId)
            .then((d) => {
                if (cancelled) return;
                if (d) setDirective(d);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Could not load directive');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [userId, profileId]);

    const setField = <K extends keyof PosthumousDirective>(
        field: K,
        value: PosthumousDirective[K],
    ) => {
        setDirective((prev) => ({ ...prev, [field]: value }));
        setSaved(null);
    };

    const togglePdg = (id: string) => {
        setDirective((prev) => {
            const has = prev.notify_pdg_ids.includes(id);
            return {
                ...prev,
                notify_pdg_ids: has
                    ? prev.notify_pdg_ids.filter((existing) => existing !== id)
                    : [...prev.notify_pdg_ids, id],
            };
        });
        setSaved(null);
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await setPosthumousDirective(profileId, userId, directive);
            setSaved('this');
            onSaved?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleApplyToAll = async () => {
        if (
            !confirm(
                'Apply this directive to every DNA file on your account? This overwrites any per-file directives.',
            )
        ) {
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const result = await applyDirectiveToAllProfiles(userId, directive);
            setSaved('all');
            onSaved?.();
            if (result.updated === 0) {
                setError('No profiles were updated.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Apply-to-all failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="text-[11px] text-slate-500 text-center py-3">
                <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin inline mr-1" />
                Loading directive…
            </div>
        );
    }

    return (
        <section className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.03] p-3 space-y-3">
            <header className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-amber-200">
                    <Hourglass className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase tracking-wider">
                        Posthumous directive — {profileLabel}
                    </span>
                </div>
                {saved && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        Saved {saved === 'all' ? 'to all files' : 'to this file'}
                    </span>
                )}
            </header>

            {error && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5 text-[11px] text-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <p className="text-[10px] text-amber-100/80 leading-relaxed">
                Your DNA carries information about your siblings, parents, and children. The
                directive below controls what happens to this file after your death — including
                whether your guardian receives the raw data, just clinically actionable findings,
                or nothing at all. You can change it at any time.
            </p>

            {/* Policy radio cards */}
            <fieldset className="space-y-1.5">
                <legend className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Policy
                </legend>
                {POLICY_OPTIONS.map((opt) => {
                    const selected = directive.policy === opt.id;
                    const Icon = opt.icon;
                    return (
                        <label
                            key={opt.id}
                            className={`block rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                                selected
                                    ? opt.tone
                                    : 'border-white/5 bg-white/[0.015] text-slate-400 hover:border-white/15'
                            }`}
                        >
                            <input
                                type="radio"
                                name="policy"
                                value={opt.id}
                                checked={selected}
                                onChange={() => setField('policy', opt.id)}
                                className="sr-only"
                            />
                            <div className="flex items-start gap-2">
                                <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                    <div className="text-xs font-medium">{opt.title}</div>
                                    <div className="text-[10px] opacity-80 leading-snug">
                                        {opt.description}
                                    </div>
                                </div>
                            </div>
                        </label>
                    );
                })}
            </fieldset>

            {/* PDG selection (only relevant when policy involves a PDG) */}
            {(directive.policy === 'ask_pdg' || directive.policy === 'release_to_pdg') && (
                <fieldset className="space-y-1.5">
                    <legend className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                        Designated Posthumous Data Guardians
                    </legend>
                    {pdgCandidates.length === 0 ? (
                        <div className="text-[10px] text-slate-500 px-1">
                            No candidates yet. Add a family member to assign a guardian.
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {pdgCandidates.map((candidate) => (
                                <label
                                    key={candidate.id}
                                    className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5 text-xs text-slate-200 cursor-pointer hover:border-white/15"
                                >
                                    <input
                                        type="checkbox"
                                        checked={directive.notify_pdg_ids.includes(candidate.id)}
                                        onChange={() => togglePdg(candidate.id)}
                                    />
                                    <span>{candidate.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </fieldset>
            )}

            {/* What the PDG receives */}
            {directive.policy === 'release_to_pdg' && (
                <fieldset className="space-y-1.5">
                    <legend className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                        What the guardian receives
                    </legend>
                    <label className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5 text-xs text-slate-200 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={directive.actionable_findings_to_pdg}
                            onChange={(event) =>
                                setField('actionable_findings_to_pdg', event.target.checked)
                            }
                        />
                        <span>Clinically actionable findings digest</span>
                    </label>
                    <label className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5 text-xs text-slate-200 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={directive.raw_data_to_pdg}
                            onChange={(event) =>
                                setField('raw_data_to_pdg', event.target.checked)
                            }
                        />
                        <span>Full raw DNA file + decryption key</span>
                    </label>
                </fieldset>
            )}

            {/* Blood-relative notification */}
            <fieldset className="space-y-1.5">
                <legend className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Notify blood relatives of findings affecting them
                </legend>
                <div className="flex flex-wrap gap-1.5">
                    {(['auto', 'ask', 'never'] as const).map((opt) => {
                        const selected = directive.notify_blood_relatives === opt;
                        return (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => setField('notify_blood_relatives', opt)}
                                className={`px-2 py-1 rounded-md border text-[10px] font-medium transition-colors ${
                                    selected
                                        ? 'border-amber-500/40 bg-amber-500/15 text-amber-100'
                                        : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20'
                                }`}
                                aria-pressed={selected}
                            >
                                {opt === 'auto'
                                    ? 'Always notify'
                                    : opt === 'never'
                                      ? 'Never notify'
                                      : 'Ask my guardian first'}
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            {/* Auto-destroy timer */}
            <fieldset className="space-y-1.5">
                <legend className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Auto-destroy after death (optional belt + suspenders)
                </legend>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min={0}
                        max={3650}
                        step={1}
                        value={directive.destroy_after_days ?? ''}
                        placeholder="Never"
                        onChange={(event) => {
                            const v = event.target.value;
                            setField(
                                'destroy_after_days',
                                v === '' ? null : Math.max(0, Number(v)) || null,
                            );
                        }}
                        className="w-20 rounded-md border border-white/10 bg-slate-900/40 px-2 py-1 text-xs text-white text-right tabular-nums"
                    />
                    <span className="text-[11px] text-slate-400">
                        days after death — leave empty to keep until explicitly deleted
                    </span>
                </div>
            </fieldset>

            {/* Save buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
                >
                    {saving ? (
                        <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" />
                    ) : (
                        <Save className="w-3.5 h-3.5" />
                    )}
                    Save for this file
                </button>
                <button
                    type="button"
                    onClick={handleApplyToAll}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-white/20 disabled:opacity-50 transition-colors"
                >
                    Apply to all my DNA files
                </button>
            </div>
        </section>
    );
}
