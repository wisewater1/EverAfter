import { useState } from 'react';
import { BookOpen, Plus, ExternalLink, FileText, X, Tag } from 'lucide-react';
import {
    getSources, addSource, getFamilyMembers, attachSourceToMember,
    type SourceCitation, type FamilyMember,
} from '../../lib/joseph/genealogy';

const SOURCE_TYPES: { value: SourceCitation['type']; label: string; icon: string }[] = [
    { value: 'birth_certificate', label: 'Birth Certificate', icon: '📜' },
    { value: 'census', label: 'Census Record', icon: '📊' },
    { value: 'church_record', label: 'Church Record', icon: '⛪' },
    { value: 'immigration', label: 'Immigration Record', icon: '🚢' },
    { value: 'military', label: 'Military Record', icon: '🎖️' },
    { value: 'newspaper', label: 'Newspaper', icon: '📰' },
    { value: 'photo', label: 'Photograph', icon: '📷' },
    { value: 'other', label: 'Other', icon: '📄' },
];

export default function SourceCitationPanel() {
    const [sources, setSources] = useState(() => getSources());
    const [showAdd, setShowAdd] = useState(false);
    const [linkSource, setLinkSource] = useState<SourceCitation | null>(null);
    const members = getFamilyMembers();

    // Form state
    const [title, setTitle] = useState('');
    const [type, setType] = useState<SourceCitation['type']>('other');
    const [repository, setRepository] = useState('');
    const [date, setDate] = useState('');
    const [url, setUrl] = useState('');
    const [notes, setNotes] = useState('');

    const handleAdd = () => {
        if (!title.trim()) return;
        addSource({ title: title.trim(), type, repository: repository || undefined, date: date || undefined, url: url || undefined, notes: notes || undefined });
        setSources(getSources());
        setTitle(''); setType('other'); setRepository(''); setDate(''); setUrl(''); setNotes('');
        setShowAdd(false);
    };

    const handleLink = (memberId: string) => {
        if (!linkSource) return;
        attachSourceToMember(memberId, linkSource.id);
        setLinkSource(null);
    };

    const typeInfo = (t: SourceCitation['type']) => SOURCE_TYPES.find(st => st.value === t) || SOURCE_TYPES[7];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-white">Historical Sources</h3>
                        <p className="text-xs text-slate-500">{sources.length} source{sources.length !== 1 ? 's' : ''} documented</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium rounded-xl transition-all border border-amber-500/20"
                >
                    <Plus className="w-3.5 h-3.5 inline mr-1" />
                    Add Source
                </button>
            </div>

            {/* Add Source Form */}
            {showAdd && (
                <div className="bg-slate-800/60 border border-amber-500/20 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-amber-300">New Source Citation</h4>
                        <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Title *</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 1940 US Federal Census" className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50" />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Type</label>
                            <select value={type} onChange={e => setType(e.target.value as SourceCitation['type'])} className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white appearance-none focus:outline-none focus:border-amber-500/50">
                                {SOURCE_TYPES.map(st => (
                                    <option key={st.value} value={st.value}>{st.icon} {st.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Repository</label>
                            <input value={repository} onChange={e => setRepository(e.target.value)} placeholder="e.g. National Archives, Ancestry.com" className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">URL</label>
                            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Notes</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Additional notes..." className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 resize-none" />
                        </div>
                    </div>

                    <button onClick={handleAdd} disabled={!title.trim()} className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-xl transition-all">
                        Add Source
                    </button>
                </div>
            )}

            {/* Sources List */}
            {sources.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/20 rounded-2xl border border-white/5">
                    <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No sources yet</p>
                    <p className="text-slate-600 text-xs mt-1">Add birth certificates, census records, church documents, and more</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sources.map(src => {
                        const ti = typeInfo(src.type);
                        return (
                            <div key={src.id} className="bg-slate-800/40 border border-white/5 rounded-xl p-4 hover:border-amber-500/20 transition-all group">
                                <div className="flex items-start gap-3">
                                    <div className="text-xl shrink-0">{ti.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-sm font-medium text-white truncate">{src.title}</h4>
                                            <span className="px-2 py-0.5 bg-white/5 text-[10px] text-slate-400 rounded uppercase shrink-0">{ti.label}</span>
                                        </div>
                                        {src.repository && <p className="text-xs text-slate-500">{src.repository}</p>}
                                        {src.date && <p className="text-xs text-slate-600 mt-0.5">{src.date}</p>}
                                        {src.notes && <p className="text-xs text-slate-400 mt-1 italic">{src.notes}</p>}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {src.url && (
                                            <a href={src.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-500 hover:text-sky-400 rounded-lg hover:bg-white/5">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                        <button onClick={() => setLinkSource(src)} className="p-1.5 text-slate-500 hover:text-amber-400 rounded-lg hover:bg-white/5">
                                            <Tag className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Link to Member Modal */}
            {linkSource && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-white">Attach "{linkSource.title}" to:</h4>
                            <button onClick={() => setLinkSource(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="max-h-52 overflow-y-auto space-y-1">
                            {members.map((m: FamilyMember) => (
                                <button
                                    key={m.id}
                                    onClick={() => handleLink(m.id)}
                                    className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-slate-300 hover:text-white transition-colors"
                                >
                                    <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${m.gender === 'male' ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                        {m.firstName[0]}{m.lastName[0]}
                                    </span>
                                    {m.firstName} {m.lastName}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
