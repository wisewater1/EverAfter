import { useState, useCallback } from 'react';
import DHTScorePanel from '../dht/DHTScorePanel';
import { ChevronDown, ChevronUp, X, Heart, User, Sparkles, Plus, Brain, Zap } from 'lucide-react';
import {
    buildFamilyTree, FamilyTreeNode, FamilyMember,
    getSpouse, getChildren, getParents, formatDate, getGenerationLabel
} from '../../lib/joseph/genealogy';
import AddFamilyMemberModal from './AddFamilyMemberModal';
import AgentPersonalityModal from './AgentPersonalityModal';
import PersonalityRadar from './PersonalityRadar';
import TraitBadges from './TraitBadges';
import RelationshipInsight from './RelationshipInsight';
import TellMyStoryPartnerCard from './TellMyStoryPartnerCard';
import JosephVoiceProfileCard from './JosephVoiceProfileCard';

interface FamilyTreeViewProps {
    onTrainMember?: (engramId: string) => void;
    onStartPersonalityQuiz?: (memberId: string) => void;
}

export default function FamilyTreeView({ onTrainMember, onStartPersonalityQuiz }: FamilyTreeViewProps) {
    const [tree, setTree] = useState<FamilyTreeNode[]>(() => buildFamilyTree());
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['gp1', 'gp3', 'p1']));
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [agentTarget, setAgentTarget] = useState<FamilyMember | null>(null);
    const [personalityTarget, setPersonalityTarget] = useState<FamilyMember | null>(null);

    const refreshTree = useCallback(() => setTree(buildFamilyTree()), []);

    const toggle = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    function renderNode(node: FamilyTreeNode, depth: number = 0) {
        const { member, spouse, children } = node;
        const isExpanded = expandedIds.has(member.id);
        const hasChildren = children.length > 0;
        const isDeceased = !!member.deathDate;
        const hasAI = member.aiPersonality?.isActive;

        return (
            <div key={member.id} className="relative" style={{ marginLeft: depth * 24 }}>
                {/* Person card */}
                <div className="flex items-center gap-2 mb-2 group">
                    {hasChildren && (
                        <button onClick={() => toggle(member.id)} className="p-1 text-slate-600 hover:text-amber-400 transition-colors">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    )}
                    {!hasChildren && <div className="w-6" />}

                    <button
                        onClick={() => setSelectedMember(member)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${isDeceased
                            ? 'bg-slate-800/20 border-slate-700/30 hover:border-slate-600'
                            : 'bg-slate-800/50 border-white/5 hover:border-amber-500/30 hover:shadow-amber-500/5'
                            }`}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold relative ${member.gender === 'male'
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}>
                            {member.firstName[0]}{member.lastName[0]}
                            {hasAI && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-[0_0_5px_rgba(139,92,246,0.5)]">
                                    <Zap className="w-2.5 h-2.5 text-white" />
                                </div>
                            )}
                            {member.aiPersonality?.archetypeEmoji && (
                                <div className="absolute -bottom-2 -left-2 text-[15px] filter drop-shadow animate-float">
                                    {member.aiPersonality.archetypeEmoji}
                                </div>
                            )}
                        </div>
                        <div className="text-left">
                            <div className={`text-sm font-medium ${isDeceased ? 'text-slate-400' : 'text-white'}`}>
                                {member.firstName} {member.lastName}
                                {hasAI && (
                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-tighter shadow-[0_0_8px_rgba(52,211,153,0.2)]">
                                        Active
                                    </span>
                                )}
                                {member.engramId && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTrainMember?.(member.engramId!);
                                        }}
                                        className="ml-2 inline-flex items-center p-1 rounded-md bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 transition-all"
                                        title="Train Engram"
                                    >
                                        <Brain className="w-3 h-3" />
                                    </button>
                                )}
                                {isDeceased && <span className="ml-1 text-slate-600">†</span>}
                                <TraitBadges traits={member.aiPersonality?.traits} limit={1} className="inline-flex ml-2 !mt-0 align-middle" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                                    {getGenerationLabel(member.generation)}
                                </span>
                                {member.occupation && (
                                    <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400/70 rounded-md border border-amber-500/10">
                                        {member.occupation}
                                    </span>
                                )}
                                {member.sources && member.sources.length > 0 && (
                                    <span className="text-[9px] text-slate-600" title={`${member.sources.length} source(s)`}>
                                        📎{member.sources.length}
                                    </span>
                                )}
                            </div>
                        </div>
                    </button>

                    {/* Spouse connector */}
                    {spouse && (
                        <>
                            <div className="flex items-center gap-1 text-rose-500/40">
                                <div className="w-4 h-px bg-rose-500/30" />
                                <Heart className="w-3 h-3" />
                                <div className="w-4 h-px bg-rose-500/30" />
                            </div>
                            <button
                                onClick={() => setSelectedMember(spouse)}
                                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-800/50 border border-white/5 hover:border-rose-500/30 transition-all duration-200 hover:scale-[1.02]"
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold relative ${spouse.gender === 'male'
                                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    }`}>
                                    {spouse.firstName[0]}{spouse.lastName[0]}
                                    {spouse.aiPersonality?.isActive && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-[0_0_5px_rgba(139,92,246,0.5)]">
                                            <Zap className="w-2.5 h-2.5 text-white" />
                                        </div>
                                    )}
                                    {spouse.aiPersonality?.archetypeEmoji && (
                                        <div className="absolute -bottom-2 -left-2 text-[15px] filter drop-shadow animate-float">
                                            {spouse.aiPersonality.archetypeEmoji}
                                        </div>
                                    )}
                                </div>
                                <div className="text-left">
                                    <div className={`text-sm font-medium ${spouse.deathDate ? 'text-slate-400' : 'text-white'}`}>
                                        {spouse.firstName} {spouse.lastName}
                                        {spouse.aiPersonality?.isActive && (
                                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-tighter shadow-[0_0_8px_rgba(52,211,153,0.2)]">
                                                Active
                                            </span>
                                        )}
                                        {spouse.engramId && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onTrainMember?.(spouse.engramId!);
                                                }}
                                                className="ml-2 inline-flex items-center p-1 rounded-md bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 transition-all"
                                                title="Train Engram"
                                            >
                                                <Brain className="w-3 h-3" />
                                            </button>
                                        )}
                                        {spouse.deathDate && <span className="ml-1 text-slate-600">†</span>}
                                        <TraitBadges traits={spouse.aiPersonality?.traits} limit={1} className="inline-flex ml-2 !mt-0 align-middle" />
                                    </div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                                        {getGenerationLabel(spouse.generation)}
                                    </div>
                                </div>
                            </button>
                        </>
                    )}
                </div>

                {/* Children */}
                {isExpanded && hasChildren && (
                    <div className="ml-3 border-l border-white/5 pl-2 space-y-1">
                        {children.map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* St. Joseph AI Insight */}
            <div className="bg-gradient-to-r from-amber-500/10 to-violet-500/10 border border-amber-500/20 rounded-3xl p-6">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-slate-300 leading-relaxed">
                            <span className="text-amber-400 font-medium">St. Joseph:</span> "Your family tree holds wisdom across generations. Click on any member to view their story, or <span className="text-violet-400 font-medium">create an AI agent</span> to converse with their spirit."
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-xs font-medium rounded-xl transition-all shadow-lg shadow-amber-500/20 shrink-0"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Member
                    </button>
                </div>
            </div>

            {/* Tree */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8">
                <div className="space-y-2">
                    {tree.map(root => renderNode(root))}
                </div>
            </div>

            {/* Member Detail Panel */}
            {selectedMember && (
                <div className="fixed inset-y-0 right-0 w-full max-w-md z-50 bg-slate-900/98 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold ${selectedMember.gender === 'male'
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}>
                                {selectedMember.firstName[0]}{selectedMember.lastName[0]}
                                {selectedMember.aiPersonality?.archetypeEmoji && (
                                    <div className="absolute -bottom-2 -left-2 text-[18px] filter drop-shadow">
                                        {selectedMember.aiPersonality.archetypeEmoji}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-light text-white">{selectedMember.firstName} {selectedMember.lastName}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{getGenerationLabel(selectedMember.generation)}</p>
                                    {selectedMember.aiPersonality?.familyRole && (
                                        <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
                                            {selectedMember.aiPersonality.familyRole}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setSelectedMember(null)} className="p-3 -mr-1 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 active:bg-white/20 touch-manipulation" aria-label="Close">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5 pb-8">
                        {selectedMember.birthDate && (
                            <p className="text-sm text-slate-300">
                                <span className="text-slate-500">Born:</span> {formatDate(selectedMember.birthDate)}
                                {selectedMember.birthPlace && ` · ${selectedMember.birthPlace}`}
                            </p>
                        )}
                        {selectedMember.deathDate && (
                            <p className="text-sm text-slate-300">
                                <span className="text-slate-500">Passed:</span> {formatDate(selectedMember.deathDate)}
                            </p>
                        )}
                        {selectedMember.bio && (
                            <p className="text-sm text-slate-400 bg-white/5 p-4 rounded-xl border border-white/5 leading-relaxed">
                                {selectedMember.bio}
                            </p>
                        )}

                        {/* Relationships */}
                        <div className="space-y-2">
                            {getSpouse(selectedMember.id) && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-xs font-medium mr-2">
                                    <Heart className="w-3 h-3" /> {getSpouse(selectedMember.id)!.firstName}
                                </span>
                            )}
                            {getParents(selectedMember.id).map(p => (
                                <span key={p.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/5 text-slate-300 rounded-lg text-xs font-medium mr-2">
                                    <User className="w-3 h-3" /> Parent: {p.firstName}
                                </span>
                            ))}
                            {getChildren(selectedMember.id).map(c => (
                                <span key={c.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg text-xs font-medium mr-2">
                                    <User className="w-3 h-3" /> Child: {c.firstName}
                                </span>
                            ))}
                        </div>

                        <RelationshipInsight member={selectedMember} />

                        {/* DHT Score Panel */}
                        <DHTScorePanel
                            personId={selectedMember.id}
                            memberName={`${selectedMember.firstName} ${selectedMember.lastName}`}
                        />

                        <JosephVoiceProfileCard
                            familyMemberId={selectedMember.id}
                            familyMemberName={`${selectedMember.firstName} ${selectedMember.lastName}`}
                            engramId={selectedMember.engramId || null}
                            compact
                        />

                        {/* Personality Analysis Button */}
                        <div className="pt-2">
                            <button
                                onClick={() => {
                                    if (!selectedMember.aiPersonality?.scores) {
                                        setSelectedMember(null);
                                        onStartPersonalityQuiz?.(selectedMember.id);
                                        return;
                                    }
                                    setPersonalityTarget(selectedMember);
                                }}
                                className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-medium"
                            >
                                <Brain className="w-4 h-4" />
                                Analyze Personality
                            </button>
                        </div>

                        {/* AI Agent Section */}
                        <div className="border-t border-white/5 pt-5">
                            {selectedMember.aiPersonality?.isActive ? (
                                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="w-4 h-4 text-violet-400" />
                                        <span className="text-sm font-medium text-violet-300">AI Agent Active</span>
                                        <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-tighter shadow-[0_0_8px_rgba(52,211,153,0.2)] animate-pulse">
                                            ● Live
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-3">{selectedMember.aiPersonality.voiceDescription}</p>
                                    <button
                                        onClick={() => setAgentTarget(selectedMember)}
                                        className="w-full py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-lg text-xs font-medium transition-all"
                                    >
                                        View Personality Details
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setAgentTarget(selectedMember)}
                                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-amber-500 hover:from-violet-500 hover:to-amber-400 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
                                >
                                    <Brain className="w-4 h-4" />
                                    Create AI Agent
                                </button>
                            )}

                            <div className="mt-4">
                                <TellMyStoryPartnerCard
                                    member={selectedMember}
                                    compact
                                    title="Create Your AI with TellMyStory.ai"
                                    description="Send this family member to TellMyStory.ai with their wise referral code and collect memory, voice, and story data for EverAfter."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showAddModal && (
                <AddFamilyMemberModal
                    onClose={() => setShowAddModal(false)}
                    onAdded={(member) => {
                        refreshTree();
                        setSelectedMember(member);
                        onStartPersonalityQuiz?.(member.id);
                    }}
                />
            )}
            {agentTarget && (
                <AgentPersonalityModal
                    member={agentTarget}
                    onClose={() => setAgentTarget(null)}
                    onActivated={() => { refreshTree(); setAgentTarget(null); setSelectedMember(null); }}
                />
            )}
            {personalityTarget && (
                <PersonalityRadar
                    memberId={personalityTarget.id}
                    memberName={`${personalityTarget.firstName} ${personalityTarget.lastName}`}
                    onClose={() => setPersonalityTarget(null)}
                />
            )}
        </div>
    );
}
