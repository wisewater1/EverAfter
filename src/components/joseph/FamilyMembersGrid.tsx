import { useState } from 'react';
import { Search, User, Heart, MapPin, X } from 'lucide-react';
import {
    getFamilyMembers, FamilyMember, getSpouse,
    getChildren, getParents, formatDate, getGenerationLabel
} from '../../lib/joseph/genealogy';

export default function FamilyMembersGrid() {
    const [members] = useState<FamilyMember[]>(() => getFamilyMembers());
    const [search, setSearch] = useState('');
    const [filterGen, setFilterGen] = useState<number | null>(null);
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

    const filteredMembers = members.filter(m => {
        const matchesSearch = `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase());
        const matchesGen = filterGen === null || m.generation === filterGen;
        return matchesSearch && matchesGen;
    });

    const generations = [...new Set(members.map(m => m.generation))].sort();

    return (
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
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto">
                    <button
                        onClick={() => setFilterGen(null)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filterGen === null
                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
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
                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
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
                        <button
                            key={member.id}
                            onClick={() => setSelectedMember(member)}
                            className={`text-left p-5 rounded-2xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-xl group ${isDeceased
                                    ? 'bg-slate-800/30 border-slate-700/30 hover:border-slate-600'
                                    : 'bg-slate-800/60 border-white/5 hover:border-amber-500/30 hover:shadow-amber-500/5'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${member.gender === 'male'
                                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    }`}>
                                    {member.firstName[0]}{member.lastName[0]}
                                </div>
                                <div className="min-w-0">
                                    <div className={`text-sm font-medium truncate ${isDeceased ? 'text-slate-400' : 'text-white'}`}>
                                        {member.firstName} {member.lastName}
                                        {isDeceased && <span className="ml-1 text-slate-600">†</span>}
                                    </div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                                        {getGenerationLabel(member.generation)}
                                    </div>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="mt-3 text-xs text-slate-400">
                                {member.birthDate && (
                                    <span>{new Date(member.birthDate + 'T00:00:00').getFullYear()}</span>
                                )}
                                {member.deathDate && (
                                    <span> – {new Date(member.deathDate + 'T00:00:00').getFullYear()}</span>
                                )}
                                {member.birthPlace && (
                                    <span className="flex items-center gap-1 mt-1 text-slate-500">
                                        <MapPin className="w-3 h-3" />
                                        {member.birthPlace}
                                    </span>
                                )}
                            </div>

                            {/* Relationship badges */}
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                                {spouse && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded text-[10px] font-medium">
                                        <Heart className="w-2.5 h-2.5" />
                                        {spouse.firstName}
                                    </span>
                                )}
                                {children.length > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] font-medium">
                                        <User className="w-2.5 h-2.5" />
                                        {children.length} child{children.length > 1 ? 'ren' : ''}
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {filteredMembers.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No family members match your search.</p>
                </div>
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

                        {/* Quick relationships */}
                        <div className="mt-4 flex flex-wrap gap-2">
                            {getSpouse(selectedMember.id) && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-xs font-medium">
                                    <Heart className="w-3 h-3" />
                                    Married to {getSpouse(selectedMember.id)!.firstName}
                                </span>
                            )}
                            {getParents(selectedMember.id).map(p => (
                                <span key={p.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/5 text-slate-300 rounded-lg text-xs font-medium">
                                    Parent: {p.firstName}
                                </span>
                            ))}
                            {getChildren(selectedMember.id).map(c => (
                                <span key={c.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg text-xs font-medium">
                                    Child: {c.firstName}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
