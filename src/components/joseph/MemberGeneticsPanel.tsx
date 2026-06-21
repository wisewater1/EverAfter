import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Dna,
    Hourglass,
    Loader2,
    ShieldCheck,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import PosthumousDirectiveEditor from './PosthumousDirectiveEditor';
import { getFamilyMembers } from '../../lib/joseph/genealogy';
import {
    deleteGeneticProfile,
    GeneticStorageError,
    listGeneticProfiles,
    uploadGeneticFile,
    type UploadProgress,
} from '../../lib/genetics/storage';
import type { GeneticProfile, GeneticFormat } from '../../lib/genetics/types';
import { GeneticParseError } from '../../lib/genetics/parsers';
import type { FamilyMember } from '../../lib/joseph/genealogy';

interface MemberGeneticsPanelProps {
    userId: string;
    member: FamilyMember;
    /** family_member_id (UUID) once the seeded member has been persisted via PR #69. */
    familyMemberDbId?: string | null;
}

const FORMAT_LABEL: Record<GeneticFormat, string> = {
    '23andme': '23andMe',
    ancestrydna: 'AncestryDNA',
    myheritage: 'MyHeritage',
    familytree: 'FamilyTreeDNA',
    vcf: 'VCF',
    cram: 'CRAM',
    bam: 'BAM',
    fastq: 'FASTQ',
};

const PHASE_LABEL: Record<UploadProgress['phase'], string> = {
    parse: 'Parsing file',
    encrypt: 'Encrypting in your browser',
    upload: 'Uploading encrypted blob',
    persist: 'Indexing variants',
    done: 'Done',
};

function bytes(n: number | null | undefined): string {
    if (!n) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function shortDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Gunzip if the file looks gzipped. Browser-native DecompressionStream is
 * Baseline 2023; we feature-detect so the component degrades to "upload
 * the .txt instead of the .gz" copy on older browsers.
 */
async function readMaybeGzipped(file: File): Promise<string> {
    const ab = await file.arrayBuffer();
    const bytes = new Uint8Array(ab);
    const isGz = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
    if (!isGz) return new TextDecoder().decode(bytes);

    const DS = (globalThis as unknown as { DecompressionStream?: typeof DecompressionStream })
        .DecompressionStream;
    if (!DS) {
        throw new Error(
            'Your browser cannot decompress .gz files. Please upload the unzipped raw file instead.',
        );
    }
    const stream = new Blob([ab]).stream().pipeThrough(new DS('gzip'));
    const decompressed = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(decompressed);
}

export default function MemberGeneticsPanel({
    userId,
    member,
    familyMemberDbId = null,
}: MemberGeneticsPanelProps) {
    const [profiles, setProfiles] = useState<GeneticProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [directiveProfileId, setDirectiveProfileId] = useState<string | null>(null);

    // Living family members make decent PDG candidates — the editor shows
    // them as checkboxes when the policy is ask_pdg or release_to_pdg.
    const pdgCandidates = useMemo(
        () =>
            getFamilyMembers()
                .filter((m) => !m.deathDate && m.id !== member.id)
                .map((m) => ({
                    id: m.id,
                    name: `${m.firstName} ${m.lastName}`,
                })),
        [member.id],
    );

    // ─── Load existing profiles ─────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        if (!userId) return;
        setLoading(true);
        setError(null);
        listGeneticProfiles({ userId, familyMemberId: familyMemberDbId })
            .then((rows) => {
                if (cancelled) return;
                setProfiles(rows);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Failed to load profiles');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [userId, familyMemberDbId, reloadKey]);

    // ─── Upload pipeline ─────────────────────────────────────────────────────
    const handleFiles = async (files: FileList | File[]) => {
        const file = Array.from(files)[0];
        if (!file) return;
        setError(null);
        setProgress({ phase: 'parse', progress: 0 });

        try {
            const text = await readMaybeGzipped(file);
            await uploadGeneticFile({
                userId,
                familyMemberId: familyMemberDbId,
                text,
                onProgress: (p) => setProgress(p),
            });
            setProgress({ phase: 'done', progress: 1 });
            setReloadKey((k) => k + 1);
            // Clear the "done" banner after a moment so the panel returns to
            // the resting list-of-profiles state.
            window.setTimeout(() => setProgress(null), 1800);
        } catch (err) {
            setProgress(null);
            if (err instanceof GeneticParseError) {
                setError(err.message);
            } else if (err instanceof GeneticStorageError) {
                setError(err.message);
            } else {
                setError(
                    err instanceof Error ? err.message : 'Upload failed for an unknown reason.',
                );
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Permanently delete this DNA file and every variant linked to it?')) return;
        try {
            await deleteGeneticProfile(id, userId);
            setReloadKey((k) => k + 1);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
        }
    };

    const summary = useMemo(() => {
        if (profiles.length === 0) return null;
        const total = profiles.reduce((acc, p) => acc + (p.snp_count ?? 0), 0);
        return `${profiles.length} file${profiles.length === 1 ? '' : 's'} · ${total.toLocaleString()} SNPs indexed`;
    }, [profiles]);

    const isUploading = progress !== null && progress.phase !== 'done';

    return (
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 space-y-3">
            <header className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-300">
                    <Dna className="w-3.5 h-3.5 text-violet-300" />
                    <span className="text-[10px] uppercase tracking-wider">
                        Genetics for this person
                    </span>
                </div>
                {summary && (
                    <span className="text-[10px] text-slate-500 tabular-nums">{summary}</span>
                )}
            </header>

            {error && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5 text-[11px] text-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Upload zone */}
            {!isUploading && (
                <label
                    className={`block rounded-xl border border-dashed px-3 py-4 text-center transition-colors cursor-pointer ${
                        dragOver
                            ? 'border-violet-400/60 bg-violet-500/[0.08]'
                            : 'border-white/15 bg-white/[0.015] hover:border-white/25'
                    }`}
                    onDragOver={(event) => {
                        event.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(event) => {
                        event.preventDefault();
                        setDragOver(false);
                        handleFiles(event.dataTransfer.files);
                    }}
                >
                    <input
                        type="file"
                        className="sr-only"
                        accept=".txt,.csv,.gz,.vcf"
                        onChange={(event) => {
                            if (event.target.files) handleFiles(event.target.files);
                            event.target.value = '';
                        }}
                    />
                    <div className="flex flex-col items-center gap-1">
                        <Upload className="w-4 h-4 text-slate-400" />
                        <div className="text-xs text-slate-300">
                            Drop a 23andMe / Ancestry / MyHeritage raw file
                        </div>
                        <div className="text-[10px] text-slate-500">
                            Encrypted in this browser. Never leaves your device unencrypted.
                        </div>
                    </div>
                </label>
            )}

            {/* Progress */}
            {isUploading && progress && (
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] px-3 py-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-violet-200">
                        <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" />
                        <span>{PHASE_LABEL[progress.phase]}</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                        <div
                            className="h-full bg-violet-300 transition-[width] duration-200"
                            style={{ width: `${Math.round(progress.progress * 100)}%` }}
                        />
                    </div>
                    {progress.message && (
                        <div className="text-[10px] text-violet-200/70">{progress.message}</div>
                    )}
                </div>
            )}

            {/* Profiles list */}
            <div className="space-y-1.5">
                {loading && profiles.length === 0 && (
                    <div className="text-[11px] text-slate-500 text-center py-2">
                        Loading…
                    </div>
                )}
                {profiles.map((p) => (
                    <div
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/5 bg-white/[0.025]"
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Dna className="w-3.5 h-3.5 shrink-0 text-violet-300" />
                            <div className="min-w-0">
                                <div className="text-xs text-white truncate">
                                    {FORMAT_LABEL[p.format] ?? p.format}
                                    {p.chip_version ? ` · ${p.chip_version}` : ''}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                    {(p.snp_count ?? 0).toLocaleString()} SNPs · {bytes(p.blob_size_bytes)} · {shortDate(p.uploaded_at)}
                                </div>
                            </div>
                        </div>
                        <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[9px] uppercase tracking-wider shrink-0"
                            title="Encrypted client-side before upload"
                        >
                            <ShieldCheck className="w-2.5 h-2.5" />
                            E2E
                        </span>
                        <button
                            type="button"
                            onClick={() =>
                                setDirectiveProfileId((current) =>
                                    current === p.id ? null : p.id,
                                )
                            }
                            className={`p-1 rounded-md transition-colors shrink-0 ${
                                directiveProfileId === p.id
                                    ? 'text-amber-300 bg-amber-500/15'
                                    : 'text-slate-500 hover:text-amber-300 hover:bg-amber-500/10'
                            }`}
                            aria-label="Edit posthumous directive"
                            aria-pressed={directiveProfileId === p.id}
                            title="What happens to this DNA file after you're gone"
                        >
                            <Hourglass className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            className="p-1 rounded-md text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 transition-colors shrink-0"
                            aria-label="Delete DNA file"
                            title="Permanently delete this DNA file"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}

                {/* Inline directive editor — opens for the profile whose
                    hourglass button was clicked above. */}
                {directiveProfileId && (
                    <PosthumousDirectiveEditor
                        userId={userId}
                        profileId={directiveProfileId}
                        profileLabel={
                            profiles.find((p) => p.id === directiveProfileId)
                                ? `${FORMAT_LABEL[profiles.find((p) => p.id === directiveProfileId)!.format] ?? 'DNA file'}`
                                : 'DNA file'
                        }
                        pdgCandidates={pdgCandidates}
                        onSaved={() => {
                            setReloadKey((k) => k + 1);
                        }}
                    />
                )}
            </div>

            {/* First-time disclosure */}
            {profiles.length === 0 && !isUploading && (
                <p className="text-[10px] text-slate-500 leading-relaxed">
                    Genetic data is uniquely shared with your blood relatives —{' '}
                    {member.firstName}'s file concerns their parents, siblings, and children too.
                    EverAfter encrypts everything in your browser before it leaves your device, and
                    the posthumous directive (set in the vault) controls what happens to this file
                    after you're gone.
                </p>
            )}

            {progress?.phase === 'done' && (
                <div className="flex items-center gap-2 text-[11px] text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Uploaded and indexed.</span>
                    <button
                        type="button"
                        onClick={() => setProgress(null)}
                        className="ml-auto text-slate-500 hover:text-slate-300"
                        aria-label="Dismiss"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}
        </section>
    );
}
