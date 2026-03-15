import { useEffect, useState } from 'react';
import { FileText, Clock, AlertTriangle, PenSquare, BadgePlus, Trash2, KeyRound, RefreshCw } from 'lucide-react';
import { getLiveFileIntegrityEvents, FileIntegrityEvent, ThreatSeverity } from '../../lib/michael/security';

const CHANGE_ICONS: Record<string, { icon: typeof PenSquare; color: string }> = {
    modified: { icon: PenSquare, color: 'text-amber-400' },
    created: { icon: BadgePlus, color: 'text-emerald-400' },
    deleted: { icon: Trash2, color: 'text-rose-400' },
    permissions: { icon: KeyRound, color: 'text-violet-400' },
};

const SEVERITY_BG: Record<ThreatSeverity, string> = {
    critical: 'bg-rose-500/10 border-rose-500/20',
    high: 'bg-orange-500/10 border-orange-500/20',
    medium: 'bg-amber-500/10 border-amber-500/20',
    low: 'bg-sky-500/10 border-sky-500/20',
};

export default function FileIntegrityMonitor() {
    const [events, setEvents] = useState<FileIntegrityEvent[]>([]);
    const [filterType, setFilterType] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const loadEvents = async () => {
        setLoading(true);
        try {
            setEvents(await getLiveFileIntegrityEvents());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, []);

    const filtered = filterType ? events.filter(e => e.changeType === filterType) : events;
    const changeTypes: FileIntegrityEvent['changeType'][] = ['modified', 'created', 'deleted', 'permissions'];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-light text-white">File Integrity Monitoring</h3>
                    <p className="text-xs text-slate-500 mt-1">Integrity telemetry derived from Michael scan findings and tracked security changes.</p>
                </div>
                <button
                    onClick={loadEvents}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 transition-all hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Refreshing...' : 'Refresh Events'}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {changeTypes.map(type => {
                    const count = events.filter(e => e.changeType === type).length;
                    const meta = CHANGE_ICONS[type];
                    const ChangeIcon = meta.icon;

                    return (
                        <button
                            key={type}
                            onClick={() => setFilterType(filterType === type ? null : type)}
                            className={`rounded-2xl border bg-slate-900/40 p-4 transition-all hover:scale-[1.02] ${filterType === type ? 'border-sky-500/50 ring-1 ring-sky-500/20' : 'border-white/5'}`}
                        >
                            <div className="mb-1 inline-flex">
                                <ChangeIcon className={`h-5 w-5 ${meta.color}`} />
                            </div>
                            <div className="text-xl font-light text-white">{count}</div>
                            <div className={`text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>{type}</div>
                        </button>
                    );
                })}
            </div>

            <div className="space-y-3">
                {!loading && filtered.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/5 bg-slate-900/20 px-6 py-12 text-center text-sm text-slate-500">
                        No integrity telemetry is available from the current Michael scan window.
                    </div>
                )}

                {filtered.map(event => {
                    const meta = CHANGE_ICONS[event.changeType];
                    const ChangeIcon = meta.icon;

                    return (
                        <div key={event.id} className={`rounded-2xl border p-5 transition-all hover:scale-[1.003] ${SEVERITY_BG[event.severity]}`}>
                            <div className="flex items-start gap-4">
                                <div className="shrink-0 pt-0.5">
                                    <ChangeIcon className={`h-5 w-5 ${meta.color}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <span className="truncate font-mono text-sm text-white">{event.filePath}</span>
                                        <span className={`rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase ${meta.color}`}>{event.changeType}</span>
                                    </div>
                                    <div className="mt-2 flex items-center gap-4 text-[10px] text-slate-500">
                                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />User: {event.user}</span>
                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(event.timestamp).toLocaleString()}</span>
                                        <span className="flex items-center gap-1 font-bold uppercase"><AlertTriangle className="h-3 w-3" />{event.severity}</span>
                                    </div>
                                    {event.previousHash && event.currentHash && (
                                        <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-slate-600">
                                            <span className="rounded bg-rose-500/10 px-1.5 py-0.5">{event.previousHash}</span>
                                            <span>-&gt;</span>
                                            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5">{event.currentHash}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
