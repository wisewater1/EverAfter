import { useState } from 'react';
import { X, Sparkles, Zap, Brain, MessageCircle } from 'lucide-react';
import { FamilyMember, AIPersonality, generateAIPersonality, activateAgent, getSpouse, getChildren, getParents } from '../../lib/joseph/genealogy';
import { emitSaintEvent } from '../../lib/saintBridge';
import { apiClient } from '../../lib/api-client';

interface Props {
    member: FamilyMember;
    onClose: () => void;
    onActivated: (member: FamilyMember) => void;
}

export default function AgentPersonalityModal({ member, onClose, onActivated }: Props) {
    const [personality] = useState<AIPersonality>(() =>
        member.aiPersonality || generateAIPersonality(member)
    );
    const [activating, setActivating] = useState(false);
    const isAlreadyActive = member.aiPersonality?.isActive === true;

    const spouse = getSpouse(member.id);
    const children = getChildren(member.id);
    const parents = getParents(member.id);

    const handleActivate = async () => {
        setActivating(true);
        try {
            // Register agent on backend to ensure persistence
            const birthYear = member.birthDate ? new Date(member.birthDate).getFullYear() : 'Unknown';

            await apiClient.registerDynamicAgent({
                name: `${member.firstName} ${member.lastName}`,
                description: `Family System Agent. Generation: ${member.generation}.`,
                system_prompt: `You are ${member.firstName} ${member.lastName}. ${personality.communicationStyle} You have the following traits: ${personality.traits.join(', ')}.`,
                traits: {
                    ...personality,
                    memberId: member.id,
                    birthYear: birthYear,
                    birthPlace: member.birthPlace,
                    gender: member.gender
                }
            });

            // Small delay for visual effect
            await new Promise(r => setTimeout(r, 1200));
            const updated = activateAgent(member.id);
            if (updated) {
                // Emit event to the saint bridge — Michael will pick it up
                emitSaintEvent({
                    from: 'joseph',
                    to: 'michael',
                    type: 'agent_created',
                    payload: {
                        memberName: `${member.firstName} ${member.lastName}`,
                        agentId: member.id,
                        timestamp: new Date().toISOString(),
                    },
                });
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
