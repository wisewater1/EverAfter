import { useEffect, useState } from 'react';
import { X, Send, Clock, CheckCircle2, Loader, RefreshCw } from 'lucide-react';
import { apiClient, type QuizInviteSummary } from '../../lib/api-client';

interface Props {
    onClose: () => void;
}

interface ArchetypeShape {
    name?: string;
    emoji?: string;
    description?: string;
}

export default function SentQuizInvitesPanel({ onClose }: Props) {
    const [invites, setInvites] = useState<QuizInviteSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.getQuizInvites();
            setInvites(data);
        } catch (err) {
            console.warn('Failed to load sent quiz invites:', err);
            setError('Unable to load your sent invites right now.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    return (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
            <div className="relative my-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-slate-800/90 p-2 text-slate-300 shadow-lg transition-colors hover:bg-slate-700 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
                <div className="rounded-3xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl sm:backdrop-blur-xl sm:p-6">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/20">
                                <Send className="h-5 w-5 text-cyan-300" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-white">Sent Questionnaires</h3>
                                <p className="text-xs text-slate-500">Links you've sent and what came back</p>
                            </div>
                        </div>
                        <button
                            onClick={load}
                            disabled={loading}
                            title="Refresh"
                            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center gap-2 py-8 justify-center text-sm text-slate-400">
                            <Loader className="h-4 w-4 animate-spin" />
                            Loading...
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                            {error}
                        </div>
                    ) : invites.length === 0 ? (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
                            <p className="text-sm text-slate-400">You haven't sent any questionnaires yet.</p>
                            <p className="text-xs text-slate-600 mt-1">Use "Send Questions" on a family member's card to invite them.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                            {invites.map((invite) => {
                                const isComplete = invite.status === 'completed' && !!invite.profile;
                                const archetype = (invite.profile?.archetype as ArchetypeShape | undefined) || undefined;
                                return (
                                    <div key={invite.token} className="rounded-xl border border-white/10 bg-white/5 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-medium text-white">{invite.subject_name}</p>
                                                <p className="text-xs text-slate-500">
                                                    Sent {invite.created_at ? new Date(invite.created_at).toLocaleDateString() : 'recently'}
                                                </p>
                                            </div>
                                            {isComplete ? (
                                                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Completed
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                                                    <Clock className="h-3 w-3" />
                                                    Awaiting reply
                                                </span>
                                            )}
                                        </div>
                                        {isComplete && archetype && (
                                            <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-950/50 border border-white/5 px-3 py-2">
                                                <span className="text-lg">{archetype.emoji || '✨'}</span>
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-200">{archetype.name || 'Profile ready'}</p>
                                                    {archetype.description && (
                                                        <p className="text-[11px] text-slate-500 line-clamp-2">{archetype.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
