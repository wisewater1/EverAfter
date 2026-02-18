import { useState } from 'react';
import { FileText, Clock, AlertTriangle } from 'lucide-react';
import { getFileIntegrityEvents, FileIntegrityEvent, ThreatSeverity } from '../../lib/michael/security';

const CHANGE_ICONS: Record<string, { icon: string; color: string }> = {
    modified: { icon: '✏️', color: 'text-amber-400' },
    created: { icon: '🆕', color: 'text-emerald-400' },
    deleted: { icon: '🗑️', color: 'text-rose-400' },
    permissions: { icon: '🔐', color: 'text-violet-400' },
};

const SEVERITY_BG: Record<ThreatSeverity, string> = {
    critical: 'bg-rose-500/10 border-rose-500/20',
    high: 'bg-orange-500/10 border-orange-500/20',
    medium: 'bg-amber-500/10 border-amber-500/20',
    low: 'bg-sky-500/10 border-sky-500/20',
};

export default function FileIntegrityMonitor() {
    const [events] = useState<FileIntegrityEvent[]>(() => getFileIntegrityEvents());
    const [filterType, setFilterType] = useState<string | null>(null);

    const filtered = filterType ? events.filter(e => e.changeType === filterType) : events;
    const changeTypes = ['modified', 'created', 'deleted', 'permissions'];

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {changeTypes.map(type => {
                    const count = events.filter(e => e.changeType === type).length;
                    const meta = CHANGE_ICONS[type];
                    return (
                        <button key={type} onClick={() => setFilterType(filterType === type ? null : type)}
                            className={`bg-slate-900/40 border rounded-2xl p-4 transition-all hover:scale-[1.02] ${filterType === type ? 'border-sky-500/50 ring-1 ring-sky-500/20' : 'border-white/5'}`}>
                            <div className="text-lg mb-1">{meta.icon}</div>
                            <div className="text-xl font-light text-white">{count}</div>
                            <div className={`text-[10px] uppercase font-bold tracking-wider ${meta.color}`}>{type}</div>
                        </button>
                    );
                })}
            </div>

            {/* File Events */}
            <div className="space-y-3">
                {filtered.map(event => {
                    const meta = CHANGE_ICONS[event.changeType];
                    return (
                        <div key={event.id} className={`border rounded-2xl p-5 transition-all hover:scale-[1.003] ${SEVERITY_BG[event.severity]}`}>
                            <div className="flex items-start gap-4">
                                <div className="text-xl shrink-0 mt-0.5">{meta.icon}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-sm font-mono text-white truncate">{event.filePath}</span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${meta.color} bg-white/5`}>{event.changeType}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-[10px] text-slate-500 mt-2">
                                        <span className="flex items-center gap-1"><FileText className="w-3 h-3" />User: {event.user}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(event.timestamp).toLocaleString()}</span>
                                        <span className="flex items-center gap-1 uppercase font-bold"><AlertTriangle className="w-3 h-3" />{event.severity}</span>
                                    </div>
                                    {event.previousHash && event.currentHash && (
                                        <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-slate-600">
                                            <span className="bg-rose-500/10 px-1.5 py-0.5 rounded">{event.previousHash}</span>
                                            <span>→</span>
                                            <span className="bg-emerald-500/10 px-1.5 py-0.5 rounded">{event.currentHash}</span>
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
