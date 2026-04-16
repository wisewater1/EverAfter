import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Shield, RefreshCw } from 'lucide-react';
import {
    ComplianceCheck,
    getComplianceChecks,
    getComplianceReadiness,
    getHipaaReport,
} from '../../lib/michael/security';

const STATUS_DISPLAY: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
    pass: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    fail: { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    not_applicable: { icon: Shield, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
};

const FRAMEWORK_COLORS: Record<string, string> = {
    HIPAA: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    'PCI-DSS': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    GDPR: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    NIST: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

function buildLiveChecks(readiness: Awaited<ReturnType<typeof getComplianceReadiness>> | null, hipaa: Awaited<ReturnType<typeof getHipaaReport>> | null): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];

    if (readiness) {
        checks.push(
            ...readiness.controls.map((control) => ({
                id: control.id,
                framework: 'NIST',
                control: control.controlId,
                description: control.description,
                status: control.isPassing ? 'pass' : 'fail',
                lastChecked: control.lastCheckedAt || new Date().toISOString(),
                details: control.isPassing ? 'Control is currently passing Anthony readiness checks.' : 'Control is failing readiness checks and needs remediation.',
            })),
        );
    }

    if (hipaa) {
        checks.push(
            ...hipaa.safeguards.map((safeguard, index) => ({
                id: `hipaa-${index}`,
                framework: 'HIPAA',
                control: safeguard.rule,
                description: safeguard.description,
                status:
                    safeguard.status === 'compliant' || safeguard.status === 'active'
                        ? 'pass'
                        : safeguard.status === 'pending'
                            ? 'warning'
                            : 'fail',
                lastChecked: hipaa.generated_at,
                details: `${safeguard.officer} :: ${safeguard.status}`,
            })),
        );
    }

    return checks;
}

export default function CompliancePanel() {
    const [checks, setChecks] = useState<ComplianceCheck[]>([]);
    const [filterFramework, setFilterFramework] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [readinessScore, setReadinessScore] = useState<number | null>(null);
    const [hipaaScore, setHipaaScore] = useState<number | null>(null);
    const [liveSnapshot, setLiveSnapshot] = useState<{ readiness: unknown; hipaa: unknown } | null>(null);

    const loadChecks = async () => {
        setLoading(true);
        try {
            const [readiness, hipaa] = await Promise.all([
                getComplianceReadiness(),
                getHipaaReport(),
            ]);
            const liveChecks = buildLiveChecks(readiness, hipaa);
            setChecks(liveChecks.length > 0 ? liveChecks : getComplianceChecks());
            setReadinessScore(readiness.readiness_score);
            setHipaaScore(hipaa.compliance_score);
            setLiveSnapshot({ readiness, hipaa });
        } catch (error) {
            console.error('Failed to load live compliance data', error);
            setChecks(getComplianceChecks());
            setReadinessScore(null);
            setHipaaScore(null);
            setLiveSnapshot(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadChecks();
    }, []);

    const handleExport = async () => {
        setExporting(true);
        try {
            const payload = {
                exportedAt: new Date().toISOString(),
                readinessScore,
                hipaaScore,
                checks,
                liveSnapshot,
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ST_MICHAEL_COMPLIANCE_EVIDENCE_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    };

    const filtered = filterFramework ? checks.filter(c => c.framework === filterFramework) : checks;
    const frameworks = [...new Set(checks.map(c => c.framework))];

    const { passCount, warnCount, failCount, complianceRate } = useMemo(() => {
        const pass = checks.filter(c => c.status === 'pass').length;
        const warn = checks.filter(c => c.status === 'warning').length;
        const fail = checks.filter(c => c.status === 'fail').length;
        return {
            passCount: pass,
            warnCount: warn,
            failCount: fail,
            complianceRate: checks.length > 0 ? Math.round((pass / checks.length) * 100) : 100,
        };
    }, [checks]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h3 className="text-xl font-light text-white">Compliance & Governance</h3>
                    <p className="mt-1 text-xs text-slate-500">Live readiness and HIPAA posture certified by Michael and Anthony.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadChecks}
                        disabled={loading}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className={`flex items-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all shadow-lg ${exporting ? 'cursor-wait bg-slate-800 text-slate-500' : 'border border-white/10 bg-white/5 text-white shadow-black/20 hover:bg-white/10'}`}
                    >
                        <Shield className={`h-4 w-4 ${exporting ? 'animate-pulse' : ''}`} />
                        {exporting ? 'Exporting...' : 'Export Evidence Package'}
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-widest">
                {readinessScore !== null && (
                    <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 font-bold text-sky-300">
                        Anthony readiness {readinessScore}%
                    </span>
                )}
                {hipaaScore !== null && (
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-bold text-emerald-300">
                        HIPAA posture {hipaaScore}%
                    </span>
                )}
            </div>

            <div className="relative flex flex-col items-center gap-8 rounded-3xl border border-white/5 bg-slate-900/40 p-8 md:flex-row">
                <div className="relative">
                    <svg className="-rotate-90 h-32 w-32" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgb(30,40,60)" strokeWidth="2" />
                        <circle
                            cx="18"
                            cy="18"
                            r="15.9155"
                            fill="none"
                            stroke={complianceRate >= 90 ? '#10b981' : complianceRate >= 70 ? '#f59e0b' : '#ef4444'}
                            strokeWidth="2"
                            strokeDasharray={`${complianceRate} ${100 - complianceRate}`}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-light text-white">{complianceRate}%</span>
                    </div>
                </div>
                <div className="flex-1">
                    <h3 className="mb-4 text-lg font-light text-white">Overall Compliance Score</h3>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <div className="text-xl font-light text-emerald-400">{passCount}</div>
                            <div className="text-[10px] font-bold uppercase text-slate-500">Passed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-light text-amber-400">{warnCount}</div>
                            <div className="text-[10px] font-bold uppercase text-slate-500">Warnings</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-light text-rose-400">{failCount}</div>
                            <div className="text-[10px] font-bold uppercase text-slate-500">Failed</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
                <button
                    onClick={() => setFilterFramework(null)}
                    className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all ${!filterFramework ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                >
                    All Frameworks
                </button>
                {frameworks.map(fw => (
                    <button
                        key={fw}
                        onClick={() => setFilterFramework(filterFramework === fw ? null : fw)}
                        className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium transition-all ${filterFramework === fw ? 'border-sky-500 bg-sky-500 text-white shadow-lg shadow-sky-500/20' : FRAMEWORK_COLORS[fw] || 'border-white/5 bg-white/5 text-slate-400'}`}
                    >
                        {fw}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {filtered.map(check => {
                    const sd = STATUS_DISPLAY[check.status];
                    const StatusIcon = sd.icon;
                    return (
                        <div key={check.id} className={`rounded-2xl border p-5 transition-all hover:scale-[1.003] ${sd.bg}`}>
                            <div className="flex items-start gap-4">
                                <StatusIcon className={`mt-0.5 h-5 w-5 shrink-0 ${sd.color}`} />
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <span className={`rounded px-2 py-0.5 text-[9px] font-bold border ${FRAMEWORK_COLORS[check.framework] || ''}`}>{check.framework}</span>
                                        <span className="font-mono text-[10px] text-slate-500">{check.control}</span>
                                    </div>
                                    <div className="mb-1 text-sm font-medium text-white">{check.description}</div>
                                    <p className="text-xs text-slate-400">{check.details}</p>
                                </div>
                                <span className={`text-[10px] font-bold uppercase ${sd.color}`}>{check.status.replace('_', ' ')}</span>
                            </div>
                        </div>
                    );
                })}

                {!loading && filtered.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/5 bg-slate-900/20 px-6 py-12 text-center text-sm text-slate-500">
                        No compliance controls are available for the selected framework.
                    </div>
                )}
            </div>
        </div>
    );
}
