import { useState } from 'react';
import { GitBranch, ArrowRight, Search, UserCheck, Heart, Users } from 'lucide-react';
import {
    getFamilyMembers, findRelationshipPath, describeRelationship,
    type FamilyMember, type RelationshipPathStep,
} from '../../lib/joseph/genealogy';

export default function RelationshipPathView() {
    const members = getFamilyMembers();
    const [fromId, setFromId] = useState<string>('');
    const [toId, setToId] = useState<string>('');
    const [path, setPath] = useState<RelationshipPathStep[] | null | undefined>(undefined);
    const [description, setDescription] = useState('');

    const handleFind = () => {
        if (!fromId || !toId) return;
        const result = findRelationshipPath(fromId, toId);
        setPath(result);
        if (result) {
            setDescription(describeRelationship(result));
        } else {
            setDescription('No relationship found');
        }
    };

    const getRelIcon = (rel: string) => {
        switch (rel) {
            case 'parent': return '⬆️';
            case 'child': return '⬇️';
            case 'spouse': return '💍';
            case 'sibling': return '👫';
            default: return '🔗';
        }
    };

    const getMember = (id: string): FamilyMember | undefined =>
        members.find(m => m.id === id);

    return (
        <div className="space-y-6">
            {/* Selector Row */}
            <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
                        <GitBranch className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-white">Relationship Finder</h3>
                        <p className="text-xs text-slate-500">Select two family members to discover their kinship</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* From selector */}
                    <div className="flex-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Person 1</label>
                        <select
                            value={fromId}
                            onChange={(e) => setFromId(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white appearance-none focus:outline-none focus:border-violet-500/50"
                        >
                            <option value="">Select member...</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                            ))}
                        </select>
                    </div>

                    <ArrowRight className="w-5 h-5 text-slate-600 mt-5 shrink-0" />

                    {/* To selector */}
                    <div className="flex-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Person 2</label>
                        <select
                            value={toId}
                            onChange={(e) => setToId(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white appearance-none focus:outline-none focus:border-violet-500/50"
                        >
                            <option value="">Select member...</option>
                            {members.filter(m => m.id !== fromId).map(m => (
                                <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleFind}
                        disabled={!fromId || !toId}
                        className="mt-5 px-5 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-violet-500/20 shrink-0"
                    >
                        <Search className="w-4 h-4 inline mr-1" />
                        Find
                    </button>
                </div>
            </div>

            {/* Results */}
            {path !== undefined && (
                <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6">
                    {path === null ? (
                        <div className="text-center py-8">
                            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">No relationship path found between these members</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Relationship Label */}
                            <div className="text-center">
                                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500/20 to-amber-500/20 border border-violet-500/20 rounded-2xl">
                                    <Heart className="w-4 h-4 text-violet-400" />
                                    <span className="text-lg font-medium text-white">{description}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">{path.length} step{path.length !== 1 ? 's' : ''} in the kinship chain</p>
                            </div>

                            {/* Path Chain */}
                            <div className="flex items-center justify-center flex-wrap gap-2 py-4">
                                {/* Start person */}
                                {fromId && (() => {
                                    const from = getMember(fromId);
                                    return from ? (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                                            <UserCheck className="w-4 h-4 text-violet-400" />
                                            <span className="text-sm text-white font-medium">{from.firstName} {from.lastName}</span>
                                        </div>
                                    ) : null;
                                })()}

                                {path.map((step, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="flex flex-col items-center">
                                            <span className="text-lg">{getRelIcon(step.relationship)}</span>
                                            <span className="text-[10px] text-slate-500 uppercase">{step.relationship}</span>
                                        </div>
                                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${i === path.length - 1
                                                ? 'bg-amber-500/10 border-amber-500/20'
                                                : 'bg-white/5 border-white/10'
                                            }`}>
                                            <span className="text-sm text-white">{step.memberName}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
