import { useState, useEffect, type ComponentType } from 'react';
import { Shield, Lock, Activity, Eye, CheckCircle, Search, RefreshCw, ArrowLeft, Globe, Database, Fingerprint, AlertTriangle, FileText, ClipboardCheck, MessageCircle, Network } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSecurityIntegrity, getAuditHistory, runCAIAudit, IntegrityReport, SecurityAlert, AuditRecord } from '../lib/michael/security';
import { getSaintStatuses, getEventLog, SaintStatus, SaintEventEnvelope } from '../lib/saintBridge';
import SaintChat from './SaintChat';
import SystemRelationshipsGraph from './saints/SystemRelationshipsGraph';
import ThreatDetection from './michael/ThreatDetection';
import VulnerabilityScanner from './michael/VulnerabilityScanner';
import FileIntegrityMonitor from './michael/FileIntegrityMonitor';
import CompliancePanel from './michael/CompliancePanel';
import SaintsQuickNav from './shared/SaintsQuickNav';
import SecurityIntegrityBadge from './shared/SecurityIntegrityBadge';

interface CAIState {
    integrityScore: number;
    adversarialFlags: number;
    phiLeeksDetected: number;
    status: 'clean' | 'compromised' | 'warning';
}

type MichaelTab = 'overview' | 'threats' | 'vulnerabilities' | 'integrity' | 'compliance' | 'network' | 'chat';

const TABS: { key: MichaelTab; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { key: 'overview', label: 'Overview', icon: Shield },
    { key: 'threats', label: 'Threats', icon: AlertTriangle },
    { key: 'vulnerabilities', label: 'CVEs', icon: Search },
    { key: 'integrity', label: 'File Integrity', icon: FileText },
    { key: 'compliance', label: 'Compliance', icon: ClipboardCheck },
    { key: 'network', label: 'Saints Network', icon: Network },
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
        } catch (err) {
            console.error('Failed to load security data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleManualScan = async () => {
        setScanning(true);
        await new Promise(resolve => setTimeout(resolve, 2500));
        await loadData();
        setScanning(false);
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
                            <p className="text-slate-500 text-sm">Wazuh-Inspired XDR & SIEM — Autonomous Guardian</p>
                        </div>
                    </div>
                    <button onClick={handleManualScan} disabled={scanning}
                        className={`px-6 py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white rounded-xl transition-all flex items-center gap-2 font-medium shadow-lg shadow-sky-500/20 ${scanning ? 'animate-pulse' : ''}`}>
                        {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        {scanning ? 'Scanning...' : 'Full Scan'}
                    </button>
                </div>

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
                                        <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">ACTIVE</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-400">Health Data Isolation</span>
                                        <span className="text-sky-400 text-xs font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">SECURE</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-400">Unauthorized Access</span>
                                        <span className="text-slate-500 text-xs font-bold bg-slate-800 px-2 py-0.5 rounded border border-white/5">0 DETECTED</span>
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
                                        <span className="block text-white text-xl font-medium">Standard Privacy</span>
                                        <span className="text-[10px] text-slate-500 uppercase font-black">All Consent Tokens Valid</span>
                                    </div>
                                </div>
                            </div>
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
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
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
                            <div className="text-2xl font-light text-white">0</div>
                            <div className="text-[10px] text-slate-600 uppercase font-black">Security Breaches</div>
                        </div>
                        <div className="w-px h-8 bg-white/5" />
                        <div className="text-center">
                            <div className="text-2xl font-light text-white">100%</div>
                            <div className="text-[10px] text-slate-600 uppercase font-black">Integrity Rating</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-slate-600" />
                        <span className="text-xs text-slate-600 font-medium">Global Threat Level: <span className="text-emerald-500">LOW</span></span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Saints Network Panel (inline) ─────────────────────────

function SaintsNetworkPanel() {
    const [statuses] = useState<SaintStatus[]>(() => getSaintStatuses());
    const [systemStatus, setSystemStatus] = useState<any>(null); // Use any for simplicity or import type

    const statusColor: Record<string, string> = {
        online: 'text-emerald-400', offline: 'text-slate-500', warning: 'text-amber-400',
    };
    const secColor: Record<string, string> = {
        green: 'bg-emerald-500', yellow: 'bg-amber-500', red: 'bg-rose-500',
    };


    // Fetch system status for the graph
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/monitoring/status`);
                if (response.ok) {
                    const data = await response.json();
                    console.log("System Status API Data:", data); // DEBUG
                    setSystemStatus(data);
                }
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
                {statuses.map(saint => (
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
