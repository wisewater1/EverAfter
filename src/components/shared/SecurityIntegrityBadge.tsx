import { useCallback, useEffect, useRef, useState } from 'react';
import { Shield, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { subscribeToSaintEvents, SaintEventEnvelope } from '../../lib/saintBridge';
import { getMonitoringStatus, MonitoringSaintStatus } from '../../lib/michael/security';

type SecurityLevel = 'green' | 'yellow' | 'red' | 'unknown';

function levelFromStatus(michael?: MonitoringSaintStatus): SecurityLevel {
    if (!michael) return 'unknown';
    const unresolved = (michael.recent_findings || []).filter((f) => !f.resolved);
    if (michael.status === 'critical' || michael.status === 'error' || unresolved.some((f) => f.severity === 'critical')) {
        return 'red';
    }
    if (michael.status === 'warning' || unresolved.some((f) => f.severity === 'high' || f.severity === 'medium')) {
        return 'yellow';
    }
    return 'green';
}

function parseIntegrity(value?: string): number | null {
    if (!value) return null;
    const parsed = Number.parseInt(String(value).replace('%', ''), 10);
    return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Cross-dashboard security/integrity chip. Values come from the live
 * monitoring endpoint (St. Michael status + St. Anthony integrity); when
 * that endpoint is unreachable the chip says so instead of asserting a
 * fabricated "Protected / 100%".
 */
export default function SecurityIntegrityBadge({ className = '' }: { className?: string }) {
    const navigate = useNavigate();
    const [securityLevel, setSecurityLevel] = useState<SecurityLevel>('unknown');
    const [integrityScore, setIntegrityScore] = useState<number | null>(null);
    const [lastAudit, setLastAudit] = useState<string | null>(null);
    const mountedRef = useRef(true);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const refresh = useCallback(async () => {
        try {
            const status = await getMonitoringStatus();
            if (!mountedRef.current) return;
            setSecurityLevel(levelFromStatus(status.michael));
            setIntegrityScore(parseIntegrity(status.anthony?.integrity) ?? parseIntegrity(status.michael?.integrity));
            if (status.timestamp) setLastAudit(status.timestamp);
        } catch {
            if (!mountedRef.current) return;
            // No live data: report unknown rather than inventing a score.
            setSecurityLevel('unknown');
            setIntegrityScore(null);
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        void refresh();

        const scheduleRefresh = () => {
            if (refreshTimerRef.current) return;
            refreshTimerRef.current = setTimeout(() => {
                refreshTimerRef.current = null;
                void refresh();
            }, 1500);
        };

        const unsubscribe = subscribeToSaintEvents((event: SaintEventEnvelope) => {
            if (event.source === 'michael' && event.topic === 'security/alert') {
                setSecurityLevel('red');
            }
            if (event.source === 'michael' && event.topic === 'security/scan_complete') {
                scheduleRefresh();
            }
            if (event.source === 'anthony' && (event.topic === 'audit/flag' || event.topic === 'audit/integrity_check')) {
                setLastAudit(event.timestamp);
                scheduleRefresh();
            }
        });

        return () => {
            mountedRef.current = false;
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
            unsubscribe();
        };
    }, [refresh]);

    const getSecurityColor = () => {
        switch (securityLevel) {
            case 'green': return 'text-emerald-400';
            case 'yellow': return 'text-amber-400';
            case 'red': return 'text-rose-500';
            default: return 'text-slate-400';
        }
    };

    const getSecurityText = () => {
        switch (securityLevel) {
            case 'green': return 'Protected';
            case 'yellow': return 'Warning';
            case 'red': return 'Critical';
            default: return 'Unavailable';
        }
    };

    return (
        <div className={`flex flex-shrink-0 items-center gap-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-full px-4 py-1.5 shadow-sm whitespace-nowrap ${className}`}>

            {/* Michael Section */}
            <button
                onClick={() => navigate('/security-dashboard')}
                className="flex items-center gap-2 hover:bg-slate-800/50 rounded-lg px-2 py-0.5 transition-all group"
                title={securityLevel === 'unknown'
                    ? 'St. Michael Status: live monitoring unreachable'
                    : 'St. Michael Status: Active Protection'}
            >
                <Shield className={`w-3.5 h-3.5 ${getSecurityColor()}`} />
                <div className="flex flex-col items-start leading-none whitespace-nowrap">
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Security</span>
                    <span className={`text-xs font-semibold ${getSecurityColor()}`}>{getSecurityText()}</span>
                </div>
            </button>

            <div className="w-px h-6 bg-slate-700/50"></div>

            {/* Anthony Section */}
            <button
                onClick={() => navigate('/anthony-dashboard')}
                className="flex items-center gap-2 hover:bg-slate-800/50 rounded-lg px-2 py-0.5 transition-all group"
                title={lastAudit
                    ? `St. Anthony Audit: last check ${new Date(lastAudit).toLocaleTimeString()}`
                    : 'St. Anthony Audit: no live audit data'}
            >
                <Search className="w-3.5 h-3.5 text-amber-400" />
                <div className="flex flex-col items-start leading-none whitespace-nowrap">
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Integrity</span>
                    <span className="text-xs font-semibold text-slate-300">{integrityScore == null ? '—' : `${integrityScore}%`}</span>
                </div>
            </button>
        </div>
    );
}
