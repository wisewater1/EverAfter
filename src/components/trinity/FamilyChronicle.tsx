/**
 * FamilyChronicle: Option 6
 * Unified life + health + financial milestone timeline.
 */
import { useState, useEffect } from 'react';
import { BookOpen, Flame, GitBranch, Heart, Wallet, Loader2 } from 'lucide-react';
import { trinitySynapse, buildTrinityCommonContext } from './trinityApi';
import { listCeremonies, type Ceremony } from '../../lib/ceremonies/ceremonies';

const SAINT_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
    joseph: { icon: GitBranch, color: '#f59e0b', label: 'Joseph' },
    raphael: { icon: Heart, color: '#14b8a6', label: 'Raphael' },
    gabriel: { icon: Wallet, color: '#10b981', label: 'Gabriel' },
};

const CEREMONY_CHRONICLE_CONFIG = { icon: Flame, color: '#f59e0b' };

function buildCeremonyChronicleEntries(ceremonies: Ceremony[]) {
    return ceremonies
        .filter((ceremony) => ceremony.status === 'completed')
        .map((ceremony) => {
            const completed = ceremony.completedAt ? new Date(ceremony.completedAt) : null;
            const validCompleted = completed && !Number.isNaN(completed.getTime()) ? completed : null;
            const reflectionExcerpt = ceremony.reflection
                ? ceremony.reflection.slice(0, 160)
                : 'The family gathered to mark this ceremony together.';
            const formattedDate = validCompleted
                ? validCompleted.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
                : null;

            return {
                saint: 'joseph',
                isCeremony: true,
                title: ceremony.title,
                description: formattedDate ? `Observed on ${formattedDate}. ${reflectionExcerpt}` : reflectionExcerpt,
                year: validCompleted ? validCompleted.getFullYear() : new Date().getFullYear(),
            };
        });
}

export default function FamilyChronicle() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [ceremonies, setCeremonies] = useState<Ceremony[]>([]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const result = await trinitySynapse('family_chronicle', buildTrinityCommonContext());
                if (mounted) setData(result);
            } catch (err) {
                console.warn('FamilyChronicle: failed to load trinity synapse data', err);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        let mounted = true;
        listCeremonies()
            .then((result) => { if (mounted) setCeremonies(result); })
            .catch(() => {
                // Chronicle still renders fully from the base timeline without
                // the ceremony layer.
            });
        return () => { mounted = false; };
    }, []);

    if (loading) return <div className="flex items-center gap-2 text-xs text-slate-500 p-4"><Loader2 className="w-4 h-4 animate-spin" />Building chronicle…</div>;
    if (!data) return null;

    const ceremonyEntries = buildCeremonyChronicleEntries(ceremonies);
    const mergedEntries = [...ceremonyEntries, ...(data.entries || [])].sort((a, b) => (b.year || 0) - (a.year || 0));
    const entries = mergedEntries.filter((e: any) => filter === 'all' || e.saint === filter);

    return (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-white">Family Chronicle</span>
                    <span className="text-[10px] text-slate-500">{mergedEntries.length} entries</span>
                </div>
                <div className="flex gap-1">
                    {['all', 'joseph', 'raphael', 'gabriel'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${filter === f ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                            {f === 'all' ? 'All' : SAINT_CONFIG[f]?.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {entries.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No chronicle entries yet.</p>}
                {entries.map((e: any, i: number) => {
                    const cfg = e.isCeremony ? CEREMONY_CHRONICLE_CONFIG : (SAINT_CONFIG[e.saint] || SAINT_CONFIG.joseph);
                    const Icon = cfg.icon;
                    return (
                        <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: cfg.color + '15' }}>
                                <Icon className="w-3 h-3" style={{ color: cfg.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-white">{e.title}</p>
                                <p className="text-[10px] text-slate-500 truncate">{e.description}</p>
                            </div>
                            <span className="text-[10px] text-slate-600 shrink-0">{e.year}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
