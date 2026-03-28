import { useEffect, useMemo, useState } from 'react';
import { X, Sparkles, Zap, Brain, MessageCircle, Waves, Loader2, Volume2 } from 'lucide-react';
import { FamilyMember, AIPersonality, generateAIPersonality, activateAgent, getSpouse, getChildren, getParents } from '../../lib/joseph/genealogy';
import { emitSaintEvent } from '../../lib/saintBridge';
import { apiClient } from '../../lib/api-client';
import { getJosephVoiceProfile, synthesizeJosephVoice, type JosephVoiceProfileBundle } from '../../lib/joseph/voice';
import { useAuth } from '../../contexts/AuthContext';
import { isAuthFailureMessage } from '../../lib/auth-session';

interface Props {
    member: FamilyMember;
    onClose: () => void;
    onActivated: (member: FamilyMember) => void;
}

export default function AgentPersonalityModal({ member, onClose, onActivated }: Props) {
    const { loading: authLoading, session, isDemoMode } = useAuth();
    const [personality] = useState<AIPersonality>(() =>
        member.aiPersonality || generateAIPersonality(member)
    );
    const [activating, setActivating] = useState(false);
    const [voiceBundle, setVoiceBundle] = useState<JosephVoiceProfileBundle | null>(null);
    const [loadingVoice, setLoadingVoice] = useState(true);
    const [voicePreviewText, setVoicePreviewText] = useState(`This is ${member.firstName}. My EverAfter AI is speaking in my family voice profile.`);
    const [synthesizing, setSynthesizing] = useState(false);
    const [voicePreviewError, setVoicePreviewError] = useState<string | null>(null);
    const [voicePreviewOutput, setVoicePreviewOutput] = useState<string | null>(null);
    const isAlreadyActive = member.aiPersonality?.isActive === true;
    const authToken = session?.access_token ?? null;
    const liveVoiceAvailable = !authLoading && !isDemoMode && Boolean(authToken);

    const spouse = getSpouse(member.id);
    const children = getChildren(member.id);
    const parents = getParents(member.id);
    const voiceReadyForAI = useMemo(() => {
        const profile = voiceBundle?.profile;
        if (!profile?.model_ref || !member.engramId) {
            return false;
        }
        return !profile.engram_id || profile.engram_id === member.engramId;
    }, [member.engramId, voiceBundle]);
    const canPreviewVoice = Boolean(voiceReadyForAI && member.engramId);
    const canRenderAudio = Boolean(voicePreviewOutput && /^(https?:\/\/|\/|data:audio|blob:)/.test(voicePreviewOutput));

    useEffect(() => {
        let mounted = true;
        setLoadingVoice(true);
        if (authLoading) {
            return () => {
                mounted = false;
            };
        }

        if (!liveVoiceAvailable) {
            setVoiceBundle(null);
            setLoadingVoice(false);
            return () => {
                mounted = false;
            };
        }

        void getJosephVoiceProfile(member.id, { authToken })
            .then((bundle) => {
                if (mounted) {
                    setVoiceBundle(bundle);
                }
            })
            .catch((error) => {
                if (mounted) {
                    if (!isAuthFailureMessage(error instanceof Error ? error.message : String(error || ''))) {
                        setVoiceBundle(null);
                    } else {
                        setVoiceBundle(null);
                    }
                }
            })
            .finally(() => {
                if (mounted) {
                    setLoadingVoice(false);
                }
            });

        return () => {
            mounted = false;
        };
    }, [authLoading, authToken, liveVoiceAvailable, member.id]);

    const handlePreviewVoice = async () => {
        if (!member.engramId || !voiceReadyForAI || !voicePreviewText.trim()) {
            return;
        }

        if (!authToken || isDemoMode) {
            setVoicePreviewError('Sign in with a live account to preview a personal voice.');
            return;
        }

        setSynthesizing(true);
        setVoicePreviewError(null);
        setVoicePreviewOutput(null);
        try {
            const result = await synthesizeJosephVoice({
                familyMemberId: member.id,
                engramId: member.engramId,
                textContent: voicePreviewText.trim(),
            }, { authToken });
            setVoicePreviewOutput(result.output_ref || null);
            if (!result.output_ref) {
                setVoicePreviewError('Voice synthesis completed, but the sidecar did not return an audio reference.');
            }
        } catch (error) {
            setVoicePreviewError(error instanceof Error ? error.message : 'Failed to synthesize the personal voice preview.');
        } finally {
            setSynthesizing(false);
        }
    };

    const handleActivate = async () => {
        setActivating(true);
        try {
            // Register agent on backend to ensure persistence
            const birthYear = member.birthDate ? new Date(member.birthDate).getFullYear() : 'Unknown';

            await apiClient.registerDynamicSaint({
                name: `${member.firstName} ${member.lastName}`,
                description: `Family System Agent. Generation: ${member.generation}.`,
                system_prompt: `You are ${member.firstName} ${member.lastName}. ${personality.communicationStyle} You have the following traits: ${personality.traits.join(', ')}.`,
                traits: {
                    ...personality,
                    memberId: member.id,
                    birthYear: birthYear,
                    birthPlace: member.birthPlace,
                    gender: member.gender,
                    research_integrated: ["generative_agents", "genagents", "agentic_collab"]
                }
            });

            // Small delay for visual effect
            await new Promise(r => setTimeout(r, 1200));
            const updated = activateAgent(member.id);
            if (updated) {
                // Emit event to the saint bridge — Michael will pick it up
                emitSaintEvent(
                    'joseph',
                    'michael',
                    'family/agent_created',
                    {
                        memberName: `${member.firstName} ${member.lastName}`,
                        agentId: member.id,
                        timestamp: new Date().toISOString(),
                    },
                    { confidence: 1.0, urgency: 'low' }
                );
                onActivated(updated);
            }
        } catch (error) {
            console.error("Failed to register agent:", error);
            const updated = activateAgent(member.id);
            if (updated) onActivated(updated);
        } finally {
            setActivating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-gradient-to-r from-violet-500/10 to-amber-500/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-violet-500/30 to-amber-500/30 rounded-2xl flex items-center justify-center border border-violet-500/30">
                                <Brain className="w-6 h-6 text-violet-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-light text-white">{member.firstName} {member.lastName}</h2>
                                <p className="text-[10px] text-violet-400 uppercase tracking-widest font-bold">AI Agent Personality</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {isAlreadyActive && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                            <Zap className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs text-emerald-300 font-medium">Agent is active and ready to chat</span>
                        </div>
                    )}
                </div>

                <div className="p-6 space-y-5">
                    {/* Personality Traits */}
                    <div>
                        <h3 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-3 flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-amber-400" /> Core Traits
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {personality.traits.map((trait, i) => (
                                <span key={i} className="px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-lg text-xs font-medium">
                                    {trait}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Communication Style */}
                    <div>
                        <h3 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                            <MessageCircle className="w-3 h-3 text-sky-400" /> Communication Style
                        </h3>
                        <p className="text-sm text-slate-300 bg-white/5 p-4 rounded-xl border border-white/5 leading-relaxed italic">
                            "{personality.communicationStyle}"
                        </p>
                    </div>

                    {/* Key Memories */}
                    <div>
                        <h3 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                            <Brain className="w-3 h-3 text-rose-400" /> Key Memories & Context
                        </h3>
                        <div className="space-y-2">
                            {personality.keyMemories.map((mem, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
                                    <span className="text-amber-500 mt-0.5">•</span>
                                    <span>{mem}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Relationship Context */}
                    {(spouse || children.length > 0 || parents.length > 0) && (
                        <div>
                            <h3 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Relationship Awareness</h3>
                            <div className="flex flex-wrap gap-2">
                                {spouse && (
                                    <span className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-xs">
                                        💍 {spouse.firstName}
                                    </span>
                                )}
                                {children.map(c => (
                                    <span key={c.id} className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg text-xs">
                                        👶 {c.firstName}
                                    </span>
                                ))}
                                {parents.map(p => (
                                    <span key={p.id} className="px-3 py-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-300 rounded-lg text-xs">
                                        👤 {p.firstName}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Voice Description */}
                    <div className="bg-gradient-to-r from-violet-500/5 to-amber-500/5 border border-white/5 rounded-xl p-4">
                        <p className="text-xs text-slate-400 leading-relaxed">
                            <span className="text-violet-400 font-medium">Agent Voice:</span> {personality.voiceDescription}
                        </p>
                    </div>

                    <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Waves className="w-4 h-4 text-cyan-300" />
                            <span className="text-sm font-medium text-cyan-100">Personal Voice Status</span>
                        </div>
                        {loadingVoice ? (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Checking consented voice profile…
                            </div>
                        ) : !liveVoiceAvailable ? (
                            <p className="text-xs text-slate-400">
                                Sign in with a live account to inspect or preview private voice profiles for this family member.
                            </p>
                        ) : voiceBundle?.profile ? (
                            <div className="space-y-2 text-xs text-slate-300">
                                <p>
                                    <span className="text-slate-500">Training:</span> {voiceBundle.profile.training_status.replace(/_/g, ' ')}
                                </p>
                                <p>
                                    <span className="text-slate-500">Approved clips:</span> {voiceBundle.profile.sample_count} clips / {Math.round(voiceBundle.profile.approved_seconds)} seconds
                                </p>
                                <p>
                                    <span className="text-slate-500">Created AI use:</span>{' '}
                                    {voiceBundle.profile.model_ref && (!voiceBundle.profile.engram_id || voiceBundle.profile.engram_id === member.engramId)
                                        ? 'Ready for this AI'
                                        : voiceBundle.profile.model_ref
                                            ? 'Ready, but linked to another AI'
                                            : 'Collect more samples or train the voice model'}
                                </p>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400">
                                No private voice profile exists yet. Collect consented clips in St. Joseph to let this AI speak in their voice.
                            </p>
                        )}

                        <div className="mt-4 space-y-3 border-t border-cyan-500/10 pt-4">
                            <div className="flex items-center gap-2">
                                <Volume2 className="w-4 h-4 text-cyan-300" />
                                <span className="text-sm font-medium text-cyan-100">Created AI voice preview</span>
                            </div>
                            <textarea
                                value={voicePreviewText}
                                onChange={(event) => setVoicePreviewText(event.target.value)}
                                rows={3}
                                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                                placeholder="Enter a short script for the created AI to speak in the personal voice."
                            />
                            <button
                                onClick={() => void handlePreviewVoice()}
                                disabled={!canPreviewVoice || synthesizing || !voicePreviewText.trim() || !liveVoiceAvailable}
                                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {synthesizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                                Preview personal voice
                            </button>

                            {!canPreviewVoice && (
                                <p className="text-xs text-slate-400">
                                    Personal voice playback unlocks only after explicit consent, enough approved samples, a completed training run, and an Engram linked to this family member.
                                </p>
                            )}

                            {voicePreviewError && (
                                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                                    {voicePreviewError}
                                </div>
                            )}

                            {voicePreviewOutput && (
                                <div className="space-y-2 rounded-xl border border-white/5 bg-slate-950/40 p-3">
                                    <div className="text-xs text-slate-400 break-all">{voicePreviewOutput}</div>
                                    {canRenderAudio && (
                                        <audio controls src={voicePreviewOutput} className="w-full" />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Activate Button */}
                    {!isAlreadyActive && (
                        <button
                            onClick={handleActivate}
                            disabled={activating}
                            className={`w-full py-3.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg ${activating
                                ? 'bg-violet-900/50 text-violet-300 animate-pulse'
                                : 'bg-gradient-to-r from-violet-600 to-amber-500 hover:from-violet-500 hover:to-amber-400 text-white shadow-violet-500/20'
                                }`}
                        >
                            {activating ? (
                                <>
                                    <Brain className="w-4 h-4 animate-spin" />
                                    Generating Neural Map...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4" />
                                    Activate AI Agent
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
