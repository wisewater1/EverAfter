import { useState, useEffect, useRef } from 'react';
import { Sparkles, Brain, History as HistoryIcon } from 'lucide-react';
import axios from 'axios';
import { supabase } from '../../lib/supabase';

interface AkashicRecord {
    id: string;
    content: string;
    metadata: {
        type?: string;
        saint_id?: string;
        importance?: number;
        [key: string]: any;
    };
    timestamp: string;
}

interface AkashicStreamProps {
    minimal?: boolean;
}

export default function AkashicStream({ minimal = false }: AkashicStreamProps) {
    const [records, setRecords] = useState<AkashicRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchMemories = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const headers = session?.access_token ? {
                    Authorization: `Bearer ${session.access_token}`
                } : {};

                const res = await axios.get('/api/v1/saints/memory/dump', { headers });
                if (res.data && Array.isArray(res.data)) {
                    const sorted = [...res.data].sort((a, b) =>
                        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    );
                    setRecords(sorted);
                }
            } catch (err) {
                console.error("Failed to fetch Akashic records", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMemories();
        const interval = setInterval(fetchMemories, 10000); // Poll for new memories
        return () => clearInterval(interval);
    }, []);

    if (minimal) {
        return (
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar p-2">
                {records.slice(0, 3).map((record) => (
                    <div key={record.id} className="text-[10px] text-cyan-400/70 italic border-l border-cyan-500/30 pl-2 py-1 animate-pulse">
                        <span className="opacity-50 mr-2">[{new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                        {record.content.substring(0, 60)}...
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="ea-panel p-4 h-full flex flex-col" data-variant="teal">
            <div className="flex items-center justify-between mb-4 border-b border-cyan-500/20 pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 text-cyan-400" />
                    Akashic Record Stream
                </h3>
                <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2"
            >
                {loading ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="animate-spin w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                        The record is silent.
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
                                        <span className="text-[9px] uppercase tracking-widest text-cyan-500/60 font-bold">
                                            {record.metadata.type || 'SENSORY'}
                                        </span>
                                        <span className="text-[9px] text-slate-500">
                                            {new Date(record.timestamp).toLocaleString()}
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

            <div className="mt-4 pt-2 border-t border-cyan-500/10 flex items-center justify-between text-[10px] text-slate-500 italic">
                <span className="flex items-center gap-1">
                    <HistoryIcon className="w-3 h-3" />
                    Neural Link Active
                </span>
                <span>Total Engrams: {records.length}</span>
            </div>
        </div>
    );
}
