import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Shield } from 'lucide-react';
import { getComplianceChecks, ComplianceCheck } from '../../lib/michael/security';

const STATUS_DISPLAY: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
    pass: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    fail: { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    not_applicable: { icon: Shield, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
};

const FRAMEWORK_COLORS: Record<string, string> = {
    'HIPAA': 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    'PCI-DSS': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    'GDPR': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'NIST': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

export default function CompliancePanel() {
    const [checks] = useState<ComplianceCheck[]>(() => getComplianceChecks());
    const [filterFramework, setFilterFramework] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        // Signature Michael digital fingerprint generation delay
        await new Promise(r => setTimeout(r, 2000));

        // Mock download logic
        const blob = new Blob([JSON.stringify({
            timestamp: new Date().toISOString(),
            user_id: 'current_user',
            compliance_rate: `${complianceRate}%`,
            checks: checks.filter(c => c.status === 'pass'),
            signature: 'ST_MICHAEL_PROT_SIG_' + Math.random().toString(36).substr(2, 12).toUpperCase()
        }, null, 2)], { type: 'application/json' });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ST_MICHAEL_COMPLIANCE_EVIDENCE_${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        setExporting(false);
    };

    const filtered = filterFramework ? checks.filter(c => c.framework === filterFramework) : checks;
    const frameworks = [...new Set(checks.map(c => c.framework))];

    const passCount = checks.filter(c => c.status === 'pass').length;
    const warnCount = checks.filter(c => c.status === 'warning').length;
    const failCount = checks.filter(c => c.status === 'fail').length;
    const complianceRate = Math.round((passCount / checks.length) * 100);

    return (
        <div className="space-y-6">
            {/* Header + Export */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-light text-white">Compliance & Governance</h3>
                    <p className="text-xs text-slate-500 mt-1">Cross-framework regulatory adherence monitoring</p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg ${exporting ? 'bg-slate-800 text-slate-500 cursor-wait' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 shadow-black/20'
                        }`}
                >
                    <Shield className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
                    {exporting ? 'Generating Signature...' : 'Export Evidence Package'}
                </button>
            </div>

            {/* Overall Score */}
            <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                {exporting && (
                    <div className="absolute inset-0 bg-sky-500/5 backdrop-blur-[2px] z-10 flex items-center justify-center animate-in fade-in duration-500">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 bg-sky-500/20 rounded-full flex items-center justify-center border border-sky-500/30 animate-ping">
                                <Shield className="w-6 h-6 text-sky-400" />
                            </div>
                            <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em]">Affixing Digital Fingerprint</span>
                        </div>
                    </div>
                )}

                <div className="relative">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgb(30,40,60)" strokeWidth="2" />
                        <circle cx="18" cy="18" r="15.9155" fill="none"
                            stroke={complianceRate >= 90 ? '#10b981' : complianceRate >= 70 ? '#f59e0b' : '#ef4444'}
                            strokeWidth="2" strokeDasharray={`${complianceRate} ${100 - complianceRate}`}
                            strokeLinecap="round" className="transition-all duration-1000" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-light text-white">{complianceRate}%</span>
                    </div>
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-light text-white mb-4">Overall Compliance Score</h3>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <div className="text-xl font-light text-emerald-400">{passCount}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Passed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-light text-amber-400">{warnCount}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Warnings</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-light text-rose-400">{failCount}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Failed</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Framework Filters */}
            <div className="flex items-center gap-2 overflow-x-auto">
                <button onClick={() => setFilterFramework(null)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${!filterFramework ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}>
                    All Frameworks
                </button>
                {frameworks.map(fw => (
                    <button key={fw} onClick={() => setFilterFramework(filterFramework === fw ? null : fw)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${filterFramework === fw ? 'bg-sky-500 text-white border-sky-500 shadow-lg shadow-sky-500/20' : FRAMEWORK_COLORS[fw] || 'bg-white/5 text-slate-400 border-white/5'}`}>
                        {fw}
                    </button>
                ))}
            </div>

            {/* Compliance Checks */}
            <div className="space-y-3">
                {filtered.map(check => {
                    const sd = STATUS_DISPLAY[check.status];
                    const StatusIcon = sd.icon;
                    return (
                        <div key={check.id} className={`border rounded-2xl p-5 transition-all hover:scale-[1.003] ${sd.bg}`}>
                            <div className="flex items-start gap-4">
                                <StatusIcon className={`w-5 h-5 ${sd.color} shrink-0 mt-0.5`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold border ${FRAMEWORK_COLORS[check.framework] || ''}`}>{check.framework}</span>
                                        <span className="text-[10px] text-slate-500 font-mono">{check.control}</span>
                                    </div>
                                    <div className="text-sm text-white font-medium mb-1">{check.description}</div>
                                    <p className="text-xs text-slate-400">{check.details}</p>
                                </div>
                                <span className={`text-[10px] font-bold uppercase ${sd.color}`}>{check.status.replace('_', ' ')}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
