import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Brain, History as HistoryIcon, Search, Loader2 } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../../lib/supabase';
import { debounce } from 'lodash';

interface AkashicRecord {
    id: string;
    content: string;
    metadata: {
        type?: string;
        saint_id?: string;
        importance?: number;
        score?: number;
        [key: string]: any;
    };
    timestamp: string;
}

interface AkashicStreamProps {
    minimal?: boolean;
}

// Sample records shown when the live memory service is unreachable, so the
// stream illustrates what it holds rather than sitting blank.
function buildSampleRecords(): AkashicRecord[] {
    const now = Date.now();
    return [
        { id: 'sample-1', content: 'St. Raphael noted a steady week of recovery, with rest and activity in good balance.', metadata: { type: 'HEALTH', saint_id: 'raphael' }, timestamp: new Date(now - 2 * 3600000).toISOString() },
        { id: 'sample-2', content: 'St. Joseph recorded a family gathering and three shared memories added to the chronicle.', metadata: { type: 'FAMILY', saint_id: 'joseph' }, timestamp: new Date(now - 26 * 3600000).toISOString() },
        { id: 'sample-3', content: 'St. Gabriel confirmed the emergency fund is on track and no envelopes are overspent.', metadata: { type: 'FINANCE', saint_id: 'gabriel' }, timestamp: new Date(now - 50 * 3600000).toISOString() },
    ];
}

export default function AkashicStream({ minimal = false }: AkashicStreamProps) {
    const [records, setRecords] = useState<AkashicRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [connected, setConnected] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const failureCountRef = useRef(0);

    const fetchMemories = async (query?: string) => {
        try {
            if (query) setIsSearching(true);
            const { data: { session } } = await supabase.auth.getSession();
            const headers = session?.access_token ? {
                Authorization: `Bearer ${session.access_token}`
            } : {};

            let res;
            if (query) {
                res = await axios.post('/api/v1/saints/memory/search', {
                    query: query,
                    limit: 20,
                    min_score: 0.2
                }, { headers });
            } else {
                res = await axios.get('/api/v1/saints/memory/dump', { headers });
            }

            if (res.data && Array.isArray(res.data)) {
                // If searching, the results are already ranked by score
                // If dumping, we sort by timestamp
                const finalData = query
                    ? res.data
                    : [...res.data].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                setRecords(finalData);
                setConnected(true);
                failureCountRef.current = 0;
            }
        } catch (err) {
            console.warn('Akashic memory service unreachable', err);
            failureCountRef.current += 1;
            setConnected(false);
            // Show sample records (only for the unfiltered stream) so the panel
            // is not blank and the footer honestly reflects the offline state.
            if (!query) {
                setRecords((prev) => (prev.length === 0 ? buildSampleRecords() : prev));
            }
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    // Debounced search
    const debouncedSearch = useCallback(
        debounce((q: string) => fetchMemories(q), 500),
        []
    );

    useEffect(() => {
        if (searchQuery) {
            debouncedSearch(searchQuery);
        } else {
            fetchMemories();
        }
    }, [searchQuery, debouncedSearch]);

    useEffect(() => {
        if (!searchQuery) {
            // Poll every 10s while reachable; once the service has failed a few
            // times in a row, only try every 6th tick (~60s) so we do not thrash
            // a dead endpoint.
            let tick = 0;
            const interval = setInterval(() => {
                tick += 1;
                if (failureCountRef.current >= 3 && tick % 6 !== 0) return;
                fetchMemories();
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [searchQuery]);

    if (minimal) {
        return (
            <div className="flex flex-col gap-2 overflow-hidden p-3">
                {records.slice(0, 3).map((record) => (
                    <div key={record.id} className="text-[10px] text-cyan-400/70 italic border-l border-cyan-500/30 pl-2 py-1 motion-safe:animate-pulse shrink-0 overflow-hidden flex items-center">
                        <span className="opacity-50 mr-2 shrink-0">[{new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                        <span className="truncate">{record.content}</span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="ea-panel p-4 h-full flex flex-col relative overflow-hidden" data-variant="teal">
            {/* Neural Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none" />

            <div className="flex items-center justify-between mb-4 border-b border-cyan-500/20 pb-2 relative z-10">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 text-cyan-400" />
                    Akashic Record Stream
                </h3>
                <div className="flex items-center gap-2">
                    {isSearching && <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />}
                    <Sparkles className="w-3 h-3 text-cyan-400 motion-safe:animate-pulse" />
                </div>
            </div>

            {/* Neural Search Bar */}
            <div className="mb-4 relative z-10">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-500/50 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search collective memory..."
                        className="w-full bg-white/5 border border-cyan-500/10 rounded-lg py-2 pl-9 pr-4 text-xs text-cyan-100 placeholder:text-cyan-900 focus:outline-none focus:border-cyan-500/40 focus:bg-white/10 transition-all"
                    />
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 relative z-10"
            >
                {loading && !searchQuery ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="animate-spin w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 rounded-full bg-cyan-950 flex items-center justify-center mx-auto mb-3 border border-cyan-500/20">
                            <Search className="w-3.5 h-3.5 text-cyan-500/30" />
                        </div>
                        <p className="text-xs text-slate-500">The record is silent.</p>
                        {searchQuery && <p className="text-[10px] text-slate-600 mt-1">No semantic matches found for "{searchQuery}"</p>}
                    </div>
                ) : (
                    records.map((record) => (
                        <div
                            key={record.id}
                            className="relative group transition-all"
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] uppercase tracking-widest text-cyan-500/60 font-bold">
                                                {record.metadata.type || 'SENSORY'}
                                            </span>
                                            {record.metadata.score && (
                                                <span className="text-[8px] bg-cyan-500/10 text-cyan-400 px-1 rounded border border-cyan-500/20">
                                                    Match: {Math.round(record.metadata.score * 100)}%
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[9px] text-slate-500">
                                            {formatTimestamp(record.timestamp)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed font-light font-mono selection:bg-cyan-500/30">
                                        {record.content}
                                    </p>
                                </div>
                            </div>
                            <div className="absolute -left-2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent group-hover:via-cyan-500/50 transition-all" />
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4 pt-2 border-t border-cyan-500/10 flex items-center justify-between text-[10px] text-slate-500 italic relative z-10">
                <span className="flex items-center gap-1">
                    <HistoryIcon className="w-3 h-3" />
                    {connected ? 'Live record connected' : 'Live record unavailable'}
                </span>
                <span>Total Engrams: {records.length}</span>
            </div>
        </div>
    );
}

function formatTimestamp(ts: string) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
