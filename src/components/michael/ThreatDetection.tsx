import { useState } from 'react';
import { AlertTriangle, Shield, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getThreatEvents, ThreatEvent, ThreatSeverity, MitreCategory } from '../../lib/michael/security';

const SEVERITY_STYLES: Record<ThreatSeverity, { bg: string; border: string; text: string; badge: string }> = {
    critical: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', badge: 'bg-rose-500 text-white' },
    high: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', badge: 'bg-orange-500 text-white' },
    medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', badge: 'bg-amber-500 text-white' },
    low: { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-400', badge: 'bg-sky-500/20 text-sky-300' },
};

const CATEGORY_LABELS: Record<MitreCategory, string> = {
    initial_access: 'Initial Access', execution: 'Execution', persistence: 'Persistence',
    privilege_escalation: 'Priv Escalation', defense_evasion: 'Defense Evasion',
    credential_access: 'Credential Access', discovery: 'Discovery',
    lateral_movement: 'Lateral Movement', collection: 'Collection', exfiltration: 'Exfiltration',
};

export default function ThreatDetection() {
    const [threats] = useState<ThreatEvent[]>(() => getThreatEvents());
    const [filterSeverity, setFilterSeverity] = useState<ThreatSeverity | null>(null);

    const filtered = filterSeverity ? threats.filter(t => t.severity === filterSeverity) : threats;

    // Category distribution
    const catCounts = new Map<MitreCategory, number>();
    threats.forEach(t => catCounts.set(t.category, (catCounts.get(t.category) || 0) + 1));
    const maxCat = Math.max(...catCounts.values(), 1);

    return (
        <div className="space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(['critical', 'high', 'medium', 'low'] as ThreatSeverity[]).map(sev => {
                    const count = threats.filter(t => t.severity === sev).length;
                    const s = SEVERITY_STYLES[sev];
                    return (
                        <button key={sev} onClick={() => setFilterSeverity(filterSeverity === sev ? null : sev)}
                            className={`${s.bg} border ${s.border} rounded-2xl p-4 transition-all hover:scale-[1.02] ${filterSeverity === sev ? 'ring-2 ring-sky-500/50' : ''}`}>
                            <div className="text-2xl font-light text-white">{count}</div>
                            <div className={`text-[10px] uppercase font-bold tracking-widest ${s.text}`}>{sev}</div>
                        </button>
                    );
                })}
            </div>

            {/* MITRE ATT&CK Category Distribution */}
            <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">MITRE ATT&CK Distribution</h3>
                <div className="space-y-2">
                    {[...catCounts.entries()].map(([cat, count]) => (
                        <div key={cat} className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-500 uppercase font-bold w-28 truncate">{CATEGORY_LABELS[cat]}</span>
                            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full transition-all" style={{ width: `${(count / maxCat) * 100}%` }} />
                            </div>
                            <span className="text-xs text-slate-400 w-6 text-right">{count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Threat Feed */}
            <div className="space-y-3">
                {filtered.map(threat => {
                    const s = SEVERITY_STYLES[threat.severity];
                    return (
                        <div key={threat.id} className={`${s.bg} border ${s.border} rounded-2xl p-5 transition-all hover:scale-[1.005]`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1">
                                    <div className={`p-2 rounded-lg ${s.bg} border ${s.border}`}>
                                        <AlertTriangle className={`w-4 h-4 ${s.text}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="text-sm font-medium text-white">{threat.title}</span>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${s.badge}`}>{threat.severity}</span>
                                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded font-mono">{threat.ruleId}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-2">{threat.description}</p>
                                        <div className="flex items-center gap-4 text-[10px] text-slate-500">
                                            <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{threat.source}</span>
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(threat.timestamp).toLocaleTimeString()}</span>
                                            <span className="uppercase font-bold tracking-wider text-slate-600">{CATEGORY_LABELS[threat.category]}</span>
                                        </div>
                                    </div>
                                </div>
                                {threat.mitigated ? (
                                    <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                                        <CheckCircle className="w-3 h-3" /> Mitigated
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-rose-400 text-[10px] font-bold bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                                        <XCircle className="w-3 h-3" /> Active
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
