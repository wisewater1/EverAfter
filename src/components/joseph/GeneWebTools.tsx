import { useState } from 'react';
import { Search, FileText, GitBranch, BookOpen, Sparkles, Filter, X } from 'lucide-react';
import {
    searchMembers, getFamilyMembers, getGenerationLabel,
    type SearchFilters, type FamilyMember,
} from '../../lib/joseph/genealogy';
import GedcomImportExport from './GedcomImportExport';
import RelationshipPathView from './RelationshipPathView';
import SourceCitationPanel from './SourceCitationPanel';

type SubTab = 'search' | 'relationship' | 'gedcom' | 'sources';

const SUB_TABS: { key: SubTab; label: string; icon: typeof Search }[] = [
    { key: 'search', label: 'Search', icon: Search },
    { key: 'relationship', label: 'Relationships', icon: GitBranch },
    { key: 'gedcom', label: 'GEDCOM', icon: FileText },
    { key: 'sources', label: 'Sources', icon: BookOpen },
];

export default function GeneWebTools() {
    const [subTab, setSubTab] = useState<SubTab>('search');

    // Search state
    const [filters, setFilters] = useState<SearchFilters>({});
    const [searchResults, setSearchResults] = useState<FamilyMember[] | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const handleSearch = () => {
        const results = searchMembers(filters);
        setSearchResults(results);
    };

    const clearFilters = () => {
        setFilters({});
        setSearchResults(null);
    };

    const allMembers = getFamilyMembers();
    const generations = [...new Set(allMembers.map(m => m.generation))].sort();

    return (
        <div className="space-y-6">
            {/* St. Joseph Insight */}
            <div className="bg-gradient-to-r from-violet-500/10 to-amber-500/10 border border-violet-500/20 rounded-3xl p-5">
                <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-300 leading-relaxed">
                        <span className="text-amber-400 font-medium">St. Joseph:</span> "These tools bring the power of <span className="text-violet-400 font-medium">GeneWeb</span> to your family. Import your data from Ancestry or MyHeritage, discover how your family members are connected, and preserve your historical sources for future generations."
                    </p>
                </div>
            </div>

            {/* Sub-tab navigation */}
            <div className="flex gap-1 bg-slate-900/40 p-1 rounded-2xl border border-white/5">
                {SUB_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setSubTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${subTab === tab.key
                                ? 'bg-white/10 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                            }`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Sub-tab content */}
            {subTab === 'search' && (
                <div className="space-y-5">
                    {/* Search Bar */}
                    <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-5 space-y-4">
                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    value={filters.name || ''}
                                    onChange={e => setFilters(f => ({ ...f, name: e.target.value || undefined }))}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    placeholder="Search by name..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
                                />
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${showFilters ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                    }`}
                            >
                                <Filter className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleSearch}
                                className="px-5 py-2 bg-violet-500 hover:bg-violet-400 text-white text-xs font-medium rounded-xl transition-all shadow-lg shadow-violet-500/20"
                            >
                                Search
                            </button>
                        </div>

                        {/* Advanced Filters */}
                        {showFilters && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-white/5">
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Place</label>
                                    <input
                                        value={filters.place || ''}
                                        onChange={e => setFilters(f => ({ ...f, place: e.target.value || undefined }))}
                                        placeholder="City, State..."
                                        className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Occupation</label>
                                    <input
                                        value={filters.occupation || ''}
                                        onChange={e => setFilters(f => ({ ...f, occupation: e.target.value || undefined }))}
                                        placeholder="Engineer, Teacher..."
                                        className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Generation</label>
                                    <select
                                        value={filters.generation ?? ''}
                                        onChange={e => setFilters(f => ({ ...f, generation: e.target.value ? parseInt(e.target.value) : undefined }))}
                                        className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-xs text-white appearance-none focus:outline-none focus:border-violet-500/50"
                                    >
                                        <option value="">All</option>
                                        {generations.map(g => (
                                            <option key={g} value={g}>{getGenerationLabel(g)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={clearFilters}
                                        className="px-3 py-2 text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors"
                                    >
                                        <X className="w-3 h-3" /> Clear
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Results */}
                    {searchResults !== null && (
                        <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-5">
                            <h4 className="text-sm text-slate-400 mb-3">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found</h4>
                            {searchResults.length === 0 ? (
                                <p className="text-center text-slate-600 py-8">No members match your search criteria</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {searchResults.map(m => (
                                        <div key={m.id} className="flex items-center gap-3 px-4 py-3 bg-slate-900/40 rounded-xl border border-white/5 hover:border-violet-500/20 transition-all">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${m.gender === 'male' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                                }`}>
                                                {m.firstName[0]}{m.lastName[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm text-white font-medium truncate">
                                                    {m.firstName} {m.lastName}
                                                    {m.deathDate && <span className="text-slate-600 ml-1">†</span>}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                    <span className="uppercase tracking-wider">{getGenerationLabel(m.generation)}</span>
                                                    {m.birthPlace && <span>· {m.birthPlace}</span>}
                                                    {m.occupation && <span>· {m.occupation}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {subTab === 'relationship' && <RelationshipPathView />}
            {subTab === 'gedcom' && <GedcomImportExport />}
            {subTab === 'sources' && <SourceCitationPanel />}
        </div>
    );
}
