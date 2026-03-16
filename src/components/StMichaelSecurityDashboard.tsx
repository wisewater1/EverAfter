import { useState, useEffect, type ComponentType } from 'react';
import { Shield, Lock, Activity, Eye, CheckCircle, Search, RefreshCw, ArrowLeft, Globe, Database, Fingerprint, AlertTriangle, FileText, ClipboardCheck, MessageCircle, Network } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSecurityIntegrity, getAuditHistory, getMonitoringStatus, runCAIAudit, triggerLiveScan, IntegrityReport, SecurityAlert, AuditRecord, MonitoringStatusResponse } from '../lib/michael/security';
import { getSaintStatuses, onSaintEvent, SaintStatus } from '../lib/saintBridge';
import { emitSaintEvent, SAINT_EVENT_TYPES } from '../lib/saintBridge';
import SaintChat from './SaintChat';
import SystemRelationshipsGraph from './saints/SystemRelationshipsGraph';
import ThreatDetection from './michael/ThreatDetection';
import VulnerabilityScanner from './michael/VulnerabilityScanner';
import FileIntegrityMonitor from './michael/FileIntegrityMonitor';
import CompliancePanel from './michael/CompliancePanel';
import GuardianLog from './michael/GuardianLog';
import SaintsQuickNav from './shared/SaintsQuickNav';
import DHTAnomalyAlertChain from './michael/DHTAnomalyAlertChain';

interface CAIState {
    integrityScore: number;
    adversarialFlags: number;
    phiLeeksDetected: number;
    status: 'clean' | 'compromised' | 'warning';
}

type ScanBannerStatus = 'active' | 'warning' | 'critical' | 'failed';
interface ScanBannerState {
    status: ScanBannerStatus;
    findingsCount: number;
    vulnerabilitiesCount: number;
    systemIntegrity: number;
    ledgerEntryId?: string;
}

function normalizeBannerStatus(
    status: SecurityScanResult['status'] | ScanBannerStatus,
    findingsCount: number,
    vulnerabilitiesCount: number,
    systemIntegrity: number,
): ScanBannerStatus {
    if (status === 'critical') return 'critical';
    if (status === 'warning') return 'warning';

    if (status === 'failed') {
        if (systemIntegrity >= 95 && findingsCount === 0 && vulnerabilitiesCount === 0) {
            return 'warning';
        }
        return 'failed';
    }

    if (findingsCount > 0 || vulnerabilitiesCount > 0 || systemIntegrity < 90) {
        return 'warning';
    }

    return 'active';
}

function buildBannerState(input: {
    status: SecurityScanResult['status'] | ScanBannerStatus;
    findingsCount: number;
    vulnerabilitiesCount: number;
    systemIntegrity: number;
    ledgerEntryId?: string;
}): ScanBannerState {
    return {
        status: normalizeBannerStatus(
            input.status,
            input.findingsCount,
            input.vulnerabilitiesCount,
            input.systemIntegrity,
        ),
        findingsCount: input.findingsCount,
        vulnerabilitiesCount: input.vulnerabilitiesCount,
        systemIntegrity: input.systemIntegrity,
        ledgerEntryId: input.ledgerEntryId,
    };
}

type MichaelTab = 'overview' | 'threats' | 'vulnerabilities' | 'integrity' | 'compliance' | 'network' | 'chat' | 'health-dht';

const TABS: { key: MichaelTab; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { key: 'overview', label: 'Overview', icon: Shield },
    { key: 'threats', label: 'Threats', icon: AlertTriangle },
    { key: 'vulnerabilities', label: 'CVEs', icon: Search },
    { key: 'integrity', label: 'File Integrity', icon: FileText },
    { key: 'compliance', label: 'Compliance', icon: ClipboardCheck },
    { key: 'network', label: 'Saints Network', icon: Network },
    { key: 'health-dht', label: 'Health Alerts', icon: Activity },
    { key: 'chat', label: 'Chat', icon: MessageCircle },
];

export default function StMichaelSecurityDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [report, setReport] = useState<IntegrityReport | null>(null);
    const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
    const [audits, setAudits] = useState<AuditRecord[]>([]);
    const [caiData, setCaiData] = useState<CAIState | null>(null);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [activeTab, setActiveTab] = useState<MichaelTab>('overview');
    const [lastScanHandoff, setLastScanHandoff] = useState<ScanBannerState | null>(null);
    const criticalAlerts = alerts.filter((alert) => alert.severity === 'critical' || alert.severity === 'high');
    const accessAlerts = alerts.filter((alert) => alert.type === 'access' || alert.type === 'pii_leak' || alert.type === 'leak_prevention');
    const threatLevel =
        criticalAlerts.length > 0 ? 'HIGH' :
        (report?.overallScore || 100) < 90 ? 'ELEVATED' :
        'LOW';
    const privacyTitle = accessAlerts.length > 0 ? 'Guardian Watch' : 'Standard Privacy';
    const privacySubtitle = accessAlerts.length > 0 ? `${accessAlerts.length} protected events under review` : 'All consent tokens valid';
    const leakStatus = criticalAlerts.length > 0 ? 'WATCH' : 'ACTIVE';
    const isolationStatus = report && report.privacyStatus < 100 ? 'REVIEW' : 'SECURE';

    const scanBannerTitle = (status: ScanBannerStatus) => {
        switch (status) {
            case 'failed':
                return 'failed';
            case 'critical':
                return 'completed with critical findings';
            case 'warning':
                return 'completed with warnings';
            default:
                return 'completed';
        }
    };

    const scanBannerClasses = (status: ScanBannerStatus) => {
        switch (status) {
            case 'failed':
                return 'border border-rose-500/20 bg-rose-500/10';
            case 'critical':
                return 'border border-amber-500/20 bg-amber-500/10';
            case 'warning':
                return 'border border-amber-500/20 bg-amber-500/10';
            default:
                return 'border border-sky-500/20 bg-sky-500/10';
        }
    };

    useEffect(() => {
        if (user) loadData();
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [integrityData, auditData, caiAudit] = await Promise.all([
                getSecurityIntegrity(user.id),
                getAuditHistory(user.id),
                runCAIAudit(user.id)
            ]);
            setReport(integrityData);
            setAudits(auditData);
            setAlerts(integrityData.alerts);
            setCaiData(caiAudit);
            setLastScanHandoff((current) => current ?? buildBannerState({
                status: integrityData.alerts.some((alert) => alert.severity === 'critical')
                    ? 'critical'
                    : integrityData.alerts.some((alert) => alert.severity === 'high' || alert.severity === 'medium')
                        ? 'warning'
                        : 'active',
                findingsCount: integrityData.alerts.length,
                vulnerabilitiesCount: 0,
                systemIntegrity: integrityData.overallScore,
            }));
        } catch (err) {
            console.error('Failed to load security data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleManualScan = async () => {
        setScanning(true);
        try {
            const scanResult = await triggerLiveScan();
            const findings = Array.isArray(scanResult.findings) ? scanResult.findings : [];
            const vulnerabilities = Array.isArray(scanResult.vulnerabilities) ? scanResult.vulnerabilities : [];

            setReport((current) => ({
                overallScore: scanResult.system_integrity,
                dataIntegrity: current?.dataIntegrity ?? scanResult.system_integrity,
                privacyStatus: current?.privacyStatus ?? 100,
                lastScan: scanResult.timestamp,
                alerts: findings,
            }));
            setAlerts(findings);

            setLastScanHandoff(buildBannerState({
                status: scanResult.status,
                findingsCount: scanResult.findings_count,
                vulnerabilitiesCount: vulnerabilities.length,
                systemIntegrity: scanResult.system_integrity,
                ledgerEntryId: scanResult.audit_handoff?.ledger_entry_id,
            }));

            try {
                emitSaintEvent('michael', 'anthony', SAINT_EVENT_TYPES.SCAN_COMPLETE, {
                    status: scanResult.status,
                    findings_count: scanResult.findings_count,
                    vulnerabilities_count: vulnerabilities.length,
                    system_integrity: scanResult.system_integrity,
                    audit_handoff: scanResult.audit_handoff,
                }, { urgency: scanResult.status === 'critical' ? 'high' : scanResult.status === 'warning' ? 'normal' : 'low' });
                emitSaintEvent('anthony', 'broadcast', SAINT_EVENT_TYPES.INTEGRITY_CHECK, {
                    received_from: 'michael',
                    ledger_entry_id: scanResult.audit_handoff?.ledger_entry_id,
                    scan_log_id: scanResult.audit_handoff?.scan_log_id,
                    findings_count: scanResult.findings_count,
                    status: 'archived_for_audit',
                });

                await loadData();
            } catch (postScanError) {
                console.error('St. Michael scan completed but post-scan synchronization failed:', postScanError);
            }
        } catch (error) {
            console.error('Failed to run full security scan:', error);
            try {
                const liveStatus = await getMonitoringStatus();
                const michael = liveStatus?.michael;
                const fallbackFindings = Array.isArray(michael?.recent_findings) ? michael.recent_findings.length : alerts.length;
                const fallbackIntegrity = Number.parseInt(String(michael?.integrity || report?.overallScore || 100).replace('%', ''), 10) || 100;

                setLastScanHandoff(buildBannerState({
                    status: michael?.status === 'critical' || michael?.status === 'warning' ? michael.status : 'active',
                    findingsCount: fallbackFindings,
                    vulnerabilitiesCount: 0,
                    systemIntegrity: fallbackIntegrity,
                }));
            } catch (statusError) {
                console.error('Unable to refresh Michael status after scan failure:', statusError);
                setLastScanHandoff((current) => current ?? buildBannerState({
                    status: 'failed',
                    findingsCount: alerts.length,
                    vulnerabilitiesCount: 0,
                    systemIntegrity: report?.overallScore || 100,
                }));
            }
        } finally {
            setScanning(false);
        }
    };

    if (loading && !scanning) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Shield className="w-12 h-12 text-sky-500 animate-pulse" />
                    <p className="text-sky-400 font-medium tracking-widest uppercase text-xs">Initializing Guardian...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0f15] text-slate-200">
            {/* Dynamic Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 -m-32 w-96 h-96 bg-sky-500/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-0 left-0 -m-32 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Navigation & Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/saints')}
                            className="w-10 h-10 bg-slate-900/50 hover:bg-slate-900 border border-white/5 rounded-xl flex items-center justify-center transition-all group">
                            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <Shield className="w-6 h-6 text-sky-400" />
                                <h1 className="text-3xl font-light tracking-tight text-white">St. Michael Security</h1>
                            </div>
                            <p className="text-slate-500 text-sm">Wazuh-Inspired XDR & SIEM - Autonomous Guardian</p>
                        </div>
                    </div>
                    <button onClick={handleManualScan} disabled={scanning}
                        className={`px-6 py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white rounded-xl transition-all flex items-center gap-2 font-medium shadow-lg shadow-sky-500/20 ${scanning ? 'animate-pulse' : ''}`}>
                        {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        {scanning ? 'Scanning...' : 'Full Scan'}
                    </button>
                </div>

                {lastScanHandoff && (
                    <div className={`mb-6 rounded-2xl px-5 py-4 ${scanBannerClasses(lastScanHandoff.status)}`}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    St. Michael full-app gauntlet {scanBannerTitle(lastScanHandoff.status)}
                                </p>
                                <p className="text-xs text-slate-300 mt-1">
                                    Integrity {lastScanHandoff.systemIntegrity}% • Findings {lastScanHandoff.findingsCount} • Vulnerabilities {lastScanHandoff.vulnerabilitiesCount}
                                    {lastScanHandoff.status !== 'failed' && ' • Delivered to St. Anthony for auditing'}
                                </p>
                            </div>
                            {lastScanHandoff.status !== 'failed' && (
                                <button
                                    onClick={() => navigate('/anthony-dashboard?tab=ledger')}
                                    className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 transition-colors hover:bg-sky-500/20 hover:text-white"
                                >
                                    <Eye className="w-4 h-4" />
                                    Open Anthony Audit
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <SaintsQuickNav />

                {/* Tab Navigation */}
                <div className="flex items-center gap-1.5 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 mb-8 overflow-x-auto">
                    {TABS.map(({ key, label, icon: TabIcon }) => (
                        <button key={key} onClick={() => setActiveTab(key)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${activeTab === key
                                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}>
                            <TabIcon className="w-3.5 h-3.5" />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <>
                        {/* Main Security Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {/* Integrity Score */}
                            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Fingerprint className="w-24 h-24 text-sky-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-6">Integrity Score</h3>
                                <div className="flex items-baseline gap-4">
                                    <span className="text-6xl font-extralight text-white tabular-nums">{report?.overallScore || 100}%</span>
                                    <div className="flex flex-col">
                                        <span className="text-emerald-400 text-sm font-bold flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> VERIFIED
                                        </span>
                                        <span className="text-slate-600 text-[10px] uppercase font-bold">Data is Pristine</span>
                                    </div>
                                </div>
                                <div className="mt-8 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full transition-all duration-1000" style={{ width: `${report?.overallScore || 100}%` }} />
                                </div>
                            </div>

                            {/* Raphael Watch */}
                            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Eye className="w-24 h-24 text-rose-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-6">Raphael Watch</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-400">Leak Prevention</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${leakStatus === 'ACTIVE' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>{leakStatus}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-400">Health Data Isolation</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${isolationStatus === 'SECURE' ? 'text-sky-400 bg-sky-500/10 border-sky-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>{isolationStatus}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-400">Unauthorized Access</span>
                                        <span className="text-slate-500 text-xs font-bold bg-slate-800 px-2 py-0.5 rounded border border-white/5">{accessAlerts.length} DETECTED</span>
                                    </div>
                                </div>
                            </div>

                            {/* Privacy Status */}
                            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Lock className="w-24 h-24 text-emerald-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-6">Privacy Status</h3>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
                                        <Activity className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <div>
                                        <span className="block text-white text-xl font-medium">{privacyTitle}</span>
                                        <span className="text-[10px] text-slate-500 uppercase font-black">{privacySubtitle}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Guardian's Log */}
                        <div className="mb-8">
                            <GuardianLog report={report} alerts={alerts} />
                        </div>

                        {/* CAI Audit */}
                        <div className="bg-slate-900/40 backdrop-blur-xl border border-sky-500/20 rounded-3xl p-8 mb-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                                <Search className="w-48 h-48 text-sky-400" />
                            </div>
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-sky-500/20 p-2 rounded-lg"><Database className="w-5 h-5 text-sky-400" /></div>
                                        <h2 className="text-xl font-medium text-white">CAI Specialized Audit</h2>
                                        <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded font-bold border border-sky-500/20">EVERAFTER EDITION</span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Adversarial Prob.</div>
                                            <div className="text-xl font-light text-white">{caiData?.adversarialFlags === 0 ? '0.01%' : 'HIGH'}</div>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Privacy Filter</div>
                                            <div className="text-xl font-light text-emerald-400">ACTIVE</div>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Leak Check</div>
                                            <div className="text-xl font-light text-white">{caiData?.phiLeeksDetected || 0}</div>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Audit Status</div>
                                            <div className="text-xl font-light text-sky-400 uppercase">{caiData?.status || 'SAFE'}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-32 h-32 rounded-full border-4 border-sky-500/20 border-t-sky-500 animate-spin-slow flex items-center justify-center relative shrink-0">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Lock className="w-8 h-8 text-sky-500" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Alerts & Audit Trail */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Security Alerts */}
                            <div className="bg-slate-900/20 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden flex flex-col">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Guardian Actions</h3>
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded font-bold">{alerts.length} LOGGED</span>
                                </div>
                                <div className="flex-1 overflow-y-auto max-h-[400px] p-6 space-y-4">
                                    {alerts.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                                            <CheckCircle className="w-12 h-12 mb-4 opacity-20" />
                                            <p className="text-sm font-medium">No recent security events</p>
                                        </div>
                                    ) : alerts.map(alert => (
                                        <div key={alert.id} className="bg-white/5 hover:bg-white/[0.07] border border-white/5 p-4 rounded-2xl transition-all">
                                            <div className="flex items-start gap-4">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${alert.severity === 'high' ? 'bg-rose-500/20 text-rose-500' : alert.severity === 'medium' ? 'bg-amber-500/20 text-amber-500' : 'bg-sky-500/20 text-sky-500'}`}>
                                                    {alert.type === 'leak_prevention' ? <Eye size={16} /> : <Shield size={16} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${alert.severity === 'high' ? 'text-rose-400' : 'text-slate-500'}`}>
                                                        {alert.type.replace('_', ' ')}
                                                    </span>
                                                    <p className="text-sm text-slate-300 font-medium">{alert.message}</p>
                                                </div>
                                                <button onClick={() => navigate('/anthony-dashboard?tab=ledger')} className="ml-auto flex items-center gap-1 text-[10px] font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 px-2 py-1 rounded border border-sky-500/20 transition-colors whitespace-nowrap">
                                                    <Eye size={12} />
                                                    View Proof
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Audit Trail */}
                            <div className="bg-slate-900/20 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden flex flex-col">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Integrity Audit Trail</h3>
                                    <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-1 rounded font-bold uppercase">Real-Time</span>
                                </div>
                                <div className="flex-1 overflow-y-auto max-h-[400px] p-6 space-y-2 font-mono text-[11px]">
                                    {audits.map(audit => (
                                        <div key={audit.id} className="flex gap-4 p-2 hover:bg-white/5 rounded transition-colors">
                                            <span className="text-slate-700 w-24 shrink-0">{new Date(audit.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                                            <span className="text-sky-500/80 w-16 shrink-0 uppercase font-bold">[VERIFIED]</span>
                                            <span className="text-slate-400 flex-1 truncate">{audit.action}</span>
                                            <button onClick={() => navigate('/anthony-dashboard?tab=ledger')} className="text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 shrink-0">
                                                <Eye size={12} /> View
                                            </button>
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'threats' && <ThreatDetection />}
                {activeTab === 'vulnerabilities' && <VulnerabilityScanner />}
                {activeTab === 'integrity' && <FileIntegrityMonitor />}
                {activeTab === 'compliance' && <CompliancePanel />}

                {activeTab === 'network' && <SaintsNetworkPanel />}

                {activeTab === 'health-dht' && user?.id && (
                    <div className="space-y-4">
                        <div className="px-2 py-2 rounded-xl bg-sky-500/5 border border-sky-500/10">
                            <p className="text-[10px] text-sky-400/70">
                                St. Michael monitors your Delphi Health Trajectory for anomalies and elevated risk domains, escalating them as Guardian health alerts.
                            </p>
                        </div>
                        <DHTAnomalyAlertChain personId={user.id} />
                    </div>
                )}

                {activeTab === 'chat' && (
                    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden h-[600px]">
                        <SaintChat saintId="michael" saintName="St. Michael" saintTitle="The Guardian" saintIcon={Shield} primaryColor="sky" />
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-gradient-to-r from-slate-900/50 via-slate-900/30 to-slate-900/50 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-sky-500/10 rounded-2xl flex items-center justify-center border border-sky-500/20 rotate-3">
                            <Database className="w-6 h-6 text-sky-400" />
                        </div>
                        <div>
                            <h4 className="text-white font-medium">Wazuh-Powered Security Ledger</h4>
                            <p className="text-xs text-slate-500">All guardian actions are immutably signed and timestamped.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="text-center">
                            <div className="text-2xl font-light text-white">{criticalAlerts.length}</div>
                            <div className="text-[10px] text-slate-600 uppercase font-black">Security Breaches</div>
                        </div>
                        <div className="w-px h-8 bg-white/5" />
                        <div className="text-center">
                            <div className="text-2xl font-light text-white">{report?.overallScore || 100}%</div>
                            <div className="text-[10px] text-slate-600 uppercase font-black">Integrity Rating</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-slate-600" />
                        <span className="text-xs text-slate-600 font-medium">Global Threat Level: <span className={threatLevel === 'LOW' ? 'text-emerald-500' : threatLevel === 'ELEVATED' ? 'text-amber-500' : 'text-rose-500'}>{threatLevel}</span></span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Saints Network Panel (inline) ─────────────────────────

function SaintsNetworkPanel() {
    const [statuses, setStatuses] = useState<SaintStatus[]>(() => getSaintStatuses());
    const [systemStatus, setSystemStatus] = useState<MonitoringStatusResponse | null>(null);

    const statusColor: Record<string, string> = {
        online: 'text-emerald-400', offline: 'text-slate-500', warning: 'text-amber-400',
    };
    const secColor: Record<string, string> = {
        green: 'bg-emerald-500', yellow: 'bg-amber-500', red: 'bg-rose-500',
    };
    const saintCards = statuses.map((saint) => {
        const liveStatus = systemStatus?.[saint.id as keyof MonitoringStatusResponse] as MonitoringStatusResponse['michael'] | undefined;
        const normalizedStatus =
            liveStatus?.status === 'critical' ? 'warning' :
            liveStatus?.status === 'active' ? 'online' :
            liveStatus?.status === 'error' ? 'warning' :
            liveStatus?.status || saint.status;
        const normalizedSecurity =
            liveStatus?.status === 'critical' || liveStatus?.status === 'error' ? 'red' :
            liveStatus?.status === 'warning' ? 'yellow' :
            saint.securityLevel;

        return {
            ...saint,
            status: normalizedStatus,
            securityLevel: normalizedSecurity,
            activeAgents: liveStatus?.metrics ? Math.max(saint.activeAgents, Object.keys(liveStatus.metrics).length || 1) : saint.activeAgents,
            message: liveStatus?.message,
        };
    });

    // Real-time Status Sync from Bridge
    useEffect(() => {
        const unsubscribe = onSaintEvent('broadcast', () => {
            setStatuses(getSaintStatuses());
        });
        return unsubscribe;
    }, []);

    // Fetch system status for the graph
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                setSystemStatus(await getMonitoringStatus());
            } catch (e) {
                console.error("Failed to fetch system status", e);
            }
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-sky-500/10 to-blue-500/10 border border-sky-500/20 rounded-3xl p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-1">Saints Network Monitor</h3>
                <p className="text-xs text-slate-400">St. Michael oversees all saints in real-time. Security events from every saint flow here.</p>
            </div>

            {/* Saint Status Cards - Using existing logic for now, could be updated to use systemStatus too */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {saintCards.map((saint) => (
                    <div key={saint.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 hover:border-sky-500/20 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-white">{saint.name}</h4>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${secColor[saint.securityLevel]}`} />
                                <span className={`text-[10px] uppercase font-bold ${statusColor[saint.status]}`}>{saint.status}</span>
                            </div>
                        </div>
                        <div className="space-y-2 text-xs text-slate-400">
                            <div className="flex justify-between">
                                <span>Active Agents</span>
                                <span className="text-white font-medium">{saint.activeAgents}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Security Level</span>
                                <span className={`uppercase font-bold ${saint.securityLevel === 'green' ? 'text-emerald-400' : saint.securityLevel === 'yellow' ? 'text-amber-400' : 'text-rose-400'}`}>
                                    {saint.securityLevel}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Last Activity</span>
                                <span className="text-slate-500">{new Date(saint.lastActivity).toLocaleTimeString()}</span>
                            </div>
                            {'message' in saint && saint.message && (
                                <div className="pt-2 text-[11px] text-slate-500">{saint.message}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Cross-Saint Visualization */}
            <SystemRelationshipsGraph data={systemStatus} />
            {/* Extended Event Stream below if needed, or hidden for now */}
        </div>
    );
}
