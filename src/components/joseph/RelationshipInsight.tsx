import { useMemo } from 'react';
import { FamilyMember, getSpouse, getChildren, getParents, calculateSynergy } from '../../lib/joseph/genealogy';
import { Heart } from 'lucide-react';

interface RelationshipInsightProps {
    member: FamilyMember;
}

export default function RelationshipInsight({ member }: RelationshipInsightProps) {
    const relationships = useMemo(() => {
        const spouse = getSpouse(member.id);
        const children = getChildren(member.id);
        const parents = getParents(member.id);

        const rels: { relative: FamilyMember, label: string, synergy: unknown }[] = [];
        if (spouse) {
            const syn = calculateSynergy(member, spouse);
            if (syn) rels.push({ relative: spouse, label: 'Spouse', synergy: syn });
        }
        parents.forEach(p => {
            const syn = calculateSynergy(member, p);
            if (syn) rels.push({ relative: p, label: 'Parent', synergy: syn });
        });
        children.forEach(c => {
            const syn = calculateSynergy(member, c);
            if (syn) rels.push({ relative: c, label: 'Child', synergy: syn });
        });
        return rels;
    }, [member]);

    if (relationships.length === 0) return null;

    return (
        <div className="mt-6 border-t border-white/5 pt-5 opacity-0 animate-fade-in [animation-delay:200ms] [animation-fill-mode:forwards]">
            <h4 className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400" /> Family Synastry
            </h4>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                {relationships.map((rel, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 hover:bg-white/[0.05] transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="text-2xl filter drop-shadow-md">
                                    {rel.relative.aiPersonality?.archetypeEmoji || '👤'}
                                </div>
                                <div>
                                    <p className="text-sm text-white font-medium">{rel.relative.firstName}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">{rel.label}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-lg font-bold ${rel.synergy.score >= 80 ? 'text-emerald-400' :
                                    rel.synergy.score >= 50 ? 'text-amber-400' : 'text-rose-400'
                                    }`}>
                                    {rel.synergy.score}%
                                </span>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Synergy</p>
                            </div>
                        </div>
                        <div className="space-y-1.5 mt-3">
                            {rel.synergy.compatibility.length > 0 && (
                                <div className="text-[11px] text-emerald-300 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 leading-relaxed">
                                    <span className="font-bold uppercase tracking-wider text-[9px] block text-emerald-500/70 mb-0.5">Strength</span>
                                    {rel.synergy.compatibility.join(' • ')}
                                </div>
                            )}
                            {rel.synergy.friction.length > 0 && (
                                <div className="text-[11px] text-rose-300 bg-rose-500/10 px-2.5 py-1.5 rounded-lg border border-rose-500/20 leading-relaxed">
                                    <span className="font-bold uppercase tracking-wider text-[9px] block text-rose-500/70 mb-0.5">Friction</span>
                                    {rel.synergy.friction.join(' • ')}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
