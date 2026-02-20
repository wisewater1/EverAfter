import { useState } from 'react';
import { Search, User, Heart, X, Brain } from 'lucide-react';
import {
    getFamilyMembers, FamilyMember, getSpouse,
    getChildren, formatDate, getGenerationLabel,
    activateAgent
} from '../../lib/joseph/genealogy';
import PersonalityRadar from './PersonalityRadar';
import SaintChat from '../SaintChat';
import SocietyFeed from '../SocietyFeed';

export default function FamilyMembersGrid() {
    const [members, setMembers] = useState<FamilyMember[]>(() => getFamilyMembers());
    const [search, setSearch] = useState('');
    const [filterGen, setFilterGen] = useState<number | null>(null);
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [personalityMember, setPersonalityMember] = useState<FamilyMember | null>(null);
    const [chatMember, setChatMember] = useState<FamilyMember | null>(null);
    const [activeTab, setActiveTab] = useState<'tree' | 'society'>('tree');

    // Real activation - call backend to register dynamic agent
    const handleActivate = async (member: FamilyMember) => {
        if (member.aiPersonality?.isActive) return;

        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
            const res = await fetch(`${API_BASE}/api/v1/saints/register_dynamic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `${member.firstName} ${member.lastName}`,
                    description: member.bio || `Family member in the St. Joseph tree.`,
                    system_prompt: `You are ${member.firstName} ${member.lastName}, a family member in the St. Joseph tree. Use the provided bio and context to interact with the user. Bio: ${member.bio}`,
                    traits: {
                        memberId: member.id,
                        generation: member.generation,
                        research_integrated: ["generative_agents", "genagents", "agentic_collab"]
                    }
                })
            });

            if (!res.ok) throw new Error('Activation failed');

            // Persist to local storage via genealogy API
            const updatedMember = activateAgent(member.id);
            if (updatedMember) {
                setMembers(prev => prev.map(m => m.id === member.id ? updatedMember : m));
            }

            alert(`Activated ${member.firstName} with Saint Runtime Research Layers (Generative Agents, GenAgents, Agentic Collab)!`);
        } catch (err) {
            console.error(err);
            alert("Failed to activate agent in Saint Runtime.");
        }
    };

    const filteredMembers = members.filter(m => {
        const matchesSearch = `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase());
        const matchesGen = filterGen === null || m.generation === filterGen;
        return matchesSearch && matchesGen;
    });

    const generations = [...new Set(members.map(m => m.generation))].sort();

    return (
        <div className="space-y-6">
            {/* Tab Switcher */}
            <div className="flex items-center gap-8 border-b border-white/5 mb-8">
                <button
                    onClick={() => setActiveTab('tree')}
                    className={`pb-4 text-sm font-semibold transition-all relative ${activeTab === 'tree' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Family Tree
                    {activeTab === 'tree' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />}
                </button>
                <button
                    onClick={() => setActiveTab('society')}
                    className={`pb-4 text-sm font-semibold transition-all relative ${activeTab === 'society' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Autonomous Society
                    {activeTab === 'society' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />}
                </button>
            </div>

            {activeTab === 'tree' ? (
                <div className="space-y-6">
                    {/* Search & Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search family members..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto">
                            <button
                                onClick={() => setFilterGen(null)}
                                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filterGen === null
                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                All
                            </button>
                            {generations.map(gen => (
                                <button
                                    key={gen}
                                    onClick={() => setFilterGen(gen)}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filterGen === gen
                                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    {getGenerationLabel(gen)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Members Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredMembers.map(member => {
                            const spouse = getSpouse(member.id);
                            const children = getChildren(member.id);
                            const isDeceased = !!member.deathDate;

                            return (
                                <div
                                    key={member.id}
                                    className={`text-left p-5 rounded-2xl border transition-all duration-200 hover:shadow-xl group relative ${isDeceased
                                        ? 'bg-slate-800/30 border-slate-700/30 hover:border-slate-600'
                                        : 'bg-slate-800/60 border-white/5 hover:border-indigo-500/30 hover:shadow-indigo-500/5'
                                        }`}
                                >
                                    <div className="flex items-start gap-3 cursor-pointer" onClick={() => setSelectedMember(member)}>
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${member.gender === 'male'
                                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                            }`}>
                                            {member.firstName[0]}{member.lastName[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <div className={`text-sm font-medium truncate ${isDeceased ? 'text-slate-400' : 'text-white'}`}>
                                                {member.firstName} {member.lastName}
                                                {member.aiPersonality?.isActive && (
                                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-tighter shadow-[0_0_8px_rgba(52,211,153,0.2)]">
                                                        <span className="w-1 h-1 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                                                        Active
                                                    </span>
                                                )}
                                                {isDeceased && <span className="ml-1 text-slate-600">†</span>}
                                            </div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                                                {getGenerationLabel(member.generation)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dates */}
                                    <div className="mt-3 text-xs text-slate-400 pl-15">
                                        {member.birthDate && (
                                            <span>{new Date(member.birthDate + 'T00:00:00').getFullYear()}</span>
                                        )}
                                        {member.deathDate && (
                                            <span> – {new Date(member.deathDate + 'T00:00:00').getFullYear()}</span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {spouse && (
                                                <div title={`Married to ${spouse.firstName}`} className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
                                                    <Heart className="w-3 h-3" />
                                                </div>
                                            )}
                                            <div title={`${children.length} Children`} className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                                                <User className="w-3 h-3" />
                                            </div>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPersonalityMember(member);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-medium transition-colors"
                                        >
                                            <Brain className="w-3 h-3" />
                                            <span>Personality</span>
                                        </button>

                                        {member.aiPersonality?.isActive ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setChatMember(member);
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium transition-colors"
                                            >
                                                <Heart className="w-3 h-3" />
                                                <span>Chat</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleActivate(member);
                                                }}
                                                className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 text-xs font-medium transition-colors"
                                            >
                                                Activate
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredMembers.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <User className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No family members match your search.</p>
                        </div>
                    )}
                </div>
            ) : (
                <SocietyFeed />
            )}

            {/* Inline Detail Modal */}
            {selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSelectedMember(null)}>
                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold ${selectedMember.gender === 'male'
                                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    }`}>
                                    {selectedMember.firstName[0]}{selectedMember.lastName[0]}
                                </div>
                                <div>
                                    <h3 className="text-lg font-light text-white">{selectedMember.firstName} {selectedMember.lastName}</h3>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                                        {getGenerationLabel(selectedMember.generation)}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedMember(null)} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {selectedMember.birthDate && (
                            <p className="text-sm text-slate-300 mb-1">
                                <span className="text-slate-500">Born:</span> {formatDate(selectedMember.birthDate)}
                                {selectedMember.birthPlace && ` · ${selectedMember.birthPlace}`}
                            </p>
                        )}
                        {selectedMember.deathDate && (
                            <p className="text-sm text-slate-300 mb-1">
                                <span className="text-slate-500">Passed:</span> {formatDate(selectedMember.deathDate)}
                            </p>
                        )}
                        {selectedMember.bio && (
                            <p className="text-sm text-slate-400 mt-3 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                                {selectedMember.bio}
                            </p>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => {
                                    setSelectedMember(null);
                                    setPersonalityMember(selectedMember);
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors shadow-lg shadow-indigo-500/25"
                            >
                                <Brain className="w-4 h-4" />
                                <span>Analyze Personality</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Personality Radar Modal */}
            {personalityMember && (
                <PersonalityRadar
                    memberId={personalityMember.id}
                    memberName={`${personalityMember.firstName} ${personalityMember.lastName}`}
                    onClose={() => setPersonalityMember(null)}
                />
            )}

            {/* Saint Chat Modal */}
            {chatMember && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl h-[80vh] overflow-hidden shadow-2xl relative">
                        <button
                            onClick={() => setChatMember(null)}
                            className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <SaintChat
                            saintId={chatMember.id}
                            saintName={`${chatMember.firstName} ${chatMember.lastName}`}
                            saintTitle="Family Member"
                            saintIcon={User}
                            onClose={() => setChatMember(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
