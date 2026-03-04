import { Shield, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SecurityAlert, IntegrityReport } from '../../lib/michael/security';

interface GuardianLogProps {
    report: IntegrityReport | null;
    alerts: SecurityAlert[];
}

export default function GuardianLog({ report, alerts }: GuardianLogProps) {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
    const resolvedCount = alerts.filter(a => a.resolved).length;

    const getNarrative = () => {
        if (!report) return "Initializing Guardian protocols... Gathering system telemetry.";

        if (criticalAlerts.length > 0) {
            return `Guardian Alert: I have detected ${criticalAlerts.length} high-priority anomalies. Adversarial patterns are attempting to probe the Saint Bridge. I am actively counter-signaling these attempts. Integrity remains at ${report.overallScore}%.`;
        }

        if (report.overallScore < 100) {
            return `System Audit: Integrity is currently at ${report.overallScore}%. Minor configuration drifts detected in the Legacy Vault. St. Anthony has been notified to re-verify the ledger hashes.`;
        }

        return `Status Nominal: All nodes are reporting secure. Data integrity is pristine. I am maintaining a 24/7 vigil over the EverAfter collective. ${resolvedCount > 0 ? `Recently mitigated ${resolvedCount} minor probing events.` : 'No adversarial activity detected in the current window.'}`;
    };

    return (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-sky-500/20 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <Shield className="w-24 h-24 text-sky-400" />
            </div>

            <div className="flex items-start gap-4 relative z-10">
                <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/20 shrink-0">
                    <Info className="w-5 h-5 text-sky-400" />
                </div>

                <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-sky-500 uppercase tracking-widest">The Guardian's Log</h3>
                        <span className="text-[10px] text-slate-500 font-mono">ST. MICHAEL // REF-ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
                    </div>

                    <p className="text-sm text-slate-200 leading-relaxed font-light italic">
                        "{getNarrative()}"
                    </p>

                    <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-[10px] text-slate-500 font-medium tracking-tight uppercase">Protocol: Active</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <AlertCircle className={`w-3.5 h-3.5 ${criticalAlerts.length > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-600'}`} />
                            <span className="text-[10px] text-slate-500 font-medium tracking-tight uppercase">Threat level: {criticalAlerts.length > 0 ? 'Elevated' : 'Low'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subtle animated light sweep */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-500/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
        </div>
    );
}
