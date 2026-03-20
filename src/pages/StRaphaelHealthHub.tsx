import { useState, useEffect } from 'react';
import {
    Activity, Heart, Droplet, Moon, Footprints,
    CheckCircle, Shield, Clock,
    Zap, ArrowLeft, Brain, Target, Beaker, FileText,
    ChevronRight, Link2, MessagesSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConnections } from '../contexts/ConnectionsContext';

// Causal Twin Components
import WhatIfSimulator from '../components/causal-twin/WhatIfSimulator';
import ExperimentLab from '../components/causal-twin/ExperimentLab';
import EvidenceLedgerView from '../components/causal-twin/EvidenceLedgerView';
import ModelHealthPanel from '../components/causal-twin/ModelHealthPanel';
import GovernanceView from '../components/causal-twin/GovernanceView';

// Specialized Healthcare Components
import RaphaelChat from '../components/RaphaelChat';
import DelphiView from '../components/dht/DelphiView';
import TrajectoryDashboard from '../components/TrajectoryDashboard';
import DeviceMonitorDashboard from '../components/DeviceMonitorDashboard';
import ComprehensiveAnalyticsDashboard from '../components/ComprehensiveAnalyticsDashboard';
import ConnectionRotationConfig from '../components/ConnectionRotationConfig';
import ConnectionRotationMonitor from '../components/ConnectionRotationMonitor';
import PredictiveHealthInsights from '../components/PredictiveHealthInsights';

// Legacy components to preserve functionality
import MedicationTracker from '../components/MedicationTracker';
import HealthGoals from '../components/HealthGoals';
import PhoneHealthConnect from '../components/PhoneHealthConnect';
import ComprehensiveHealthConnectors from '../components/ComprehensiveHealthConnectors';
import SecurityIntegrityBadge from '../components/shared/SecurityIntegrityBadge';
import { apiClient } from '../lib/api-client';
import { requestBackendJson } from '../lib/backend-request';

interface Insight {
    text: string;
    severity: 'info' | 'warning' | 'attention';
    category: string;
}

interface VitalsData {
    heartRate: { avg: number; max: number };
    hrv: { avg: number };
    steps: { total: number };
    sleep: { hours: number };
    glucose?: { avg: number };
}

type ActiveView = 'overview' | 'simulation' | 'lab' | 'governance' | 'analytics' | 'trajectory' | 'chat';

export default function StRaphaelHealthHub() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { openConnectionsPanel, getActiveConnectionsCount } = useConnections();

    const [activeView, setActiveView] = useState<ActiveView>('overview');
    const [insights, setInsights] = useState<Insight[]>([]);
    const [vitals, setVitals] = useState<VitalsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasData, setHasData] = useState(false);
    const [lastRun, setLastRun] = useState<Date | null>(null);
    const [statusAura, setStatusAura] = useState<'stable' | 'drift' | 'critical'>('stable');

    const activeConnectionsCount = getActiveConnectionsCount();

    useEffect(() => {
        loadHubData();
    }, []);

    async function loadHubData() {
        try {
            setLoading(true);
            const data = await requestBackendJson<any>(
                '/api/me/raphael/summary',
                {},
                'Failed to load Raphael hub summary.',
            );
            if (data.metrics && data.metrics.length > 0) {
                setHasData(true);
                setVitals(data.vitals);
                setInsights(data.insights || []);
                setLastRun(data.lastRun ? new Date(data.lastRun) : null);

                const warningCount = (data.insights || []).filter((i: Insight) => i.severity === 'warning').length;
                const attentionCount = (data.insights || []).filter((i: Insight) => i.severity === 'attention').length;

                if (attentionCount > 0) setStatusAura('critical');
                else if (warningCount > 0) setStatusAura('drift');
                else setStatusAura('stable');
            }
        } catch (error) {
            console.error('Failed to load Hub data:', error);
        } finally {
            setLoading(false);
        }
    }

    const auraStyles = {
        stable: 'bg-teal-500/5',
        drift: 'bg-amber-500/5',
        critical: 'bg-red-500/5'
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-teal-500/20 border-t-teal-400 rounded-full animate-spin"></div>
                    <div className="text-teal-400 text-sm font-medium animate-pulse">Initializing Neural Hub...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-[#0a0a0f] relative overflow-hidden pb-32">
            {/* Dynamic Status Aura */}
            <div className="fixed inset-0 pointer-events-none transition-colors duration-1000">
                <div className={`absolute top-0 right-1/4 w-[500px] h-[500px] ${auraStyles[statusAura]} rounded-full blur-[120px] transition-all duration-1000`}></div>
                <div className={`absolute bottom-0 left-1/4 w-[500px] h-[500px] ${auraStyles[statusAura]} rounded-full blur-[120px] transition-all duration-1000`}></div>
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

                {/* Cinematic Header */}
                <div className="mb-8 p-8 rounded-[32px] bg-gradient-to-br from-[#12121a]/95 via-[#0d0d12]/95 to-[#12121a]/95 backdrop-blur-3xl border border-white/[0.03] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 flex items-center justify-center shadow-lg shadow-teal-500/10">
                                <Brain className="w-8 h-8 text-teal-400" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white tracking-tight">St. Raphael Hub</h1>
                                <p className="text-slate-400 text-sm mt-1">Sovereign 2.0 Collective Intelligence • {user?.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <SecurityIntegrityBadge />
                            <button
                                onClick={() => openConnectionsPanel('health')}
                                className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-slate-400 hover:text-white transition-all relative"
                            >
                                <Link2 className="w-5 h-5" />
                                {activeConnectionsCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
                                        {activeConnectionsCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/5 text-slate-300 hover:text-white transition-all flex items-center gap-2 group"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                <span className="font-medium">Exit</span>
                            </button>
                        </div>
                    </div>

                    {/* Neural Vitals Row */}
                    {hasData && vitals ? (
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            <VitalDisplay icon={Heart} label="Heart Rate" value={vitals.heartRate.avg} unit="bpm" />
                            <VitalDisplay icon={Activity} label="HRV" value={vitals.hrv.avg} unit="ms" />
                            <VitalDisplay icon={Footprints} label="Steps" value={vitals.steps.total} unit="steps" />
                            <VitalDisplay icon={Moon} label="Sleep" value={vitals.sleep.hours} unit="hrs" />
                            {vitals.glucose ? (
                                <VitalDisplay icon={Droplet} label="Glucose" value={vitals.glucose.avg} unit="mg/dL" />
                            ) : (
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-center items-center opacity-40">
                                    <Droplet className="w-4 h-4 text-slate-600 mb-1" />
                                    <span className="text-[10px] text-slate-600 uppercase">Glucose (Link Required)</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-8 rounded-2xl bg-teal-500/5 border border-teal-500/10 text-center">
                            <p className="text-teal-400/60 italic text-sm">Waiting for biometric sync...</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Sidebar Navigation */}
                    <div className="lg:col-span-3 space-y-4">
                        <NavButton
                            active={activeView === 'overview'}
                            onClick={() => setActiveView('overview')}
                            icon={Layout}
                            label="Command Overview"
                        />
                        <NavButton
                            active={activeView === 'simulation'}
                            onClick={() => setActiveView('simulation')}
                            icon={Target}
                            label="Decision Simulator"
                        />
                        <NavButton
                            active={activeView === 'lab'}
                            onClick={() => setActiveView('lab')}
                            icon={Beaker}
                            label="Experiment Lab"
                        />
                        <NavButton
                            active={activeView === 'governance'}
                            onClick={() => setActiveView('governance')}
                            icon={Shield}
                            label="Governance"
                        />
                        <NavButton
                            active={activeView === 'analytics'}
                            onClick={() => setActiveView('analytics')}
                            icon={Activity}
                            label="Biometric Analytics"
                        />
                        <NavButton
                            active={activeView === 'trajectory'}
                            onClick={() => setActiveView('trajectory')}
                            icon={Brain}
                            label="Neural Trajectory"
                        />
                        <NavButton
                            active={activeView === 'lab'}
                            onClick={() => setActiveView('lab')}
                            icon={Beaker}
                            label="Evidence Ledger"
                        />
                        <NavButton
                            active={activeView === 'chat'}
                            onClick={() => setActiveView('chat')}
                            icon={MessagesSquare}
                            label="Raphael AI Oracle"
                        />
                        <div className="pt-4 mt-4 border-t border-white/5">
                            <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-4 px-4 font-bold">Autonomous Status</h4>
                            <div className="p-4 rounded-2x bg-white/[0.02] border border-white/5 space-y-3">
                                <StatusLine label="Model Stability" value="98.2%" color="text-teal-400" />
                                <StatusLine label="Last Synapse" value={lastRun ? formatTime(lastRun) : 'N/A'} color="text-slate-400" />
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-9">
                        {activeView === 'overview' && (
                            <div className="space-y-6">
                                {/* Summary View */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2 px-2">
                                            <Zap className="w-4 h-4 text-teal-400" />
                                            Priority Insights
                                        </h3>
                                        {insights.length > 0 ? (
                                            <div className="grid gap-4">
                                                {insights.map((insight, idx) => (
                                                    <HubInsightCard key={idx} insight={insight} />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-white/5">
                                                <CheckCircle className="w-8 h-8 text-teal-500/20 mx-auto mb-3" />
                                                <p className="text-slate-500 text-sm italic">All systems aligned.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2 px-2">
                                            <Clock className="w-4 h-4 text-purple-400" />
                                            Daily Regimen
                                        </h3>
                                        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#12121a] to-[#0d0d12] border border-white/5">
                                            <MedicationTracker />
                                        </div>
                                        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#12121a] to-[#0d0d12] border border-white/5 mt-6">
                                            <HealthGoals />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <SynapsePulse />
                                    <FamilyHealthHeatmap />
                                </div>

                                {/* Connection Section */}
                                <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">Neural Connect</h3>
                                            <p className="text-slate-500 text-sm">Manage autonomous data sources</p>
                                        </div>
                                        <button className="text-teal-400 hover:text-teal-300 text-sm font-medium flex items-center gap-1 group">
                                            Add Connection <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                    <div className="space-y-8">
                                        <PhoneHealthConnect />
                                        <ComprehensiveHealthConnectors />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeView === 'simulation' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="p-8 rounded-[32px] bg-gradient-to-br from-[#12121a] to-[#0d0d12] border border-white/[0.03]">
                                    <div className="mb-8">
                                        <h3 className="text-2xl font-bold text-white mb-2">Decision Simulator</h3>
                                        <p className="text-slate-400 text-sm">Adjust environmental variables to project counterfactual health outcomes.</p>
                                    </div>
                                    <WhatIfSimulator />
                                </div>
                            </div>
                        )}

                        {activeView === 'lab' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <ExperimentLab />
                            </div>
                        )}

                        {activeView === 'analytics' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <DeviceMonitorDashboard />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <ConnectionRotationConfig />
                                    <ConnectionRotationMonitor />
                                </div>
                                <ComprehensiveAnalyticsDashboard />
                            </div>
                        )}

                        {activeView === 'trajectory' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <TrajectoryDashboard userId={user?.id || ''} />
                                <PredictiveHealthInsights />
                                <div className="p-8 rounded-[32px] bg-gradient-to-br from-[#0d0d12] to-[#13131a] border border-white/[0.03]">
                                    <DelphiView personId={user?.id || ''} memberName={user?.email?.split('@')[0] || 'You'} />
                                </div>
                            </div>
                        )}

                        {activeView === 'governance' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <GovernanceView />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <ModelHealthPanel />
                                    <EvidenceLedgerView />
                                </div>
                            </div>
                        )}

                        {activeView === 'chat' && (
                            <div className="h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <RaphaelChat />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Sub-components for Hub
function VitalDisplay({ icon: Icon, label, value, unit }: any) {
    return (
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all group">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-teal-500/10 group-hover:bg-teal-500/20 transition-all">
                    <Icon className="w-5 h-5 text-teal-400" />
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white tracking-tight">{typeof value === 'number' ? value.toFixed(1) : value}</span>
                <span className="text-xs text-slate-500 font-medium">{unit}</span>
            </div>
        </div>
    );
}

function NavButton({ active, onClick, icon: Icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group ${active
                ? 'bg-teal-500/10 border border-teal-500/20 text-white shadow-[0_0_20px_rgba(20,184,166,0.1)]'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02] border border-transparent'
                }`}
        >
            <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${active ? 'text-teal-400' : 'group-hover:text-slate-400'}`} />
                <span className="text-sm font-semibold">{label}</span>
            </div>
            <ChevronRight className={`w-4 h-4 transition-transform ${active ? 'text-teal-400' : 'opacity-0 group-hover:opacity-100'}`} />
        </button>
    );
}

function StatusLine({ label, value, color }: any) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600 font-medium uppercase">{label}</span>
            <span className={`text-[10px] font-bold ${color}`}>{value}</span>
        </div>
    );
}

function HubInsightCard({ insight }: { insight: Insight }) {
    const colors = {
        info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        attention: 'text-red-400 bg-red-500/10 border-red-500/20'
    };

    return (
        <div className={`p-4 rounded-2xl border ${colors[insight.severity]} backdrop-blur-xl flex gap-4 animate-in fade-in zoom-in duration-500`}>
            <div className="mt-1">
                <Shield className="w-4 h-4" />
            </div>
            <div className="flex-1">
                <p className="text-sm font-medium leading-relaxed italic">"{insight.text}"</p>
                <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black tracking-widest opacity-60">{insight.category}</span>
                    <div className="flex items-center gap-3">
                        <button className="text-[9px] font-bold uppercase tracking-widest hover:underline text-white/40 hover:text-white">Scientific Context</button>
                        <button className="text-[9px] font-bold uppercase tracking-widest hover:underline text-teal-400">Log to Akashic</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SynapsePulse() {
    const [pulsing, setPulsing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const triggerPulse = async () => {
        setPulsing(true);
        setResult(null);
        setError(null);
        try {
            const headers = await apiClient.getAuthHeaders();
            const data = await requestBackendJson<any>('/api/v1/causal-twin/predictions', { headers }, 'Failed to trigger synapse pulse.');
            const prediction = data?.predictions?.[0];
            if (!prediction) {
                throw new Error('No synapse prediction was returned.');
            }

            setResult(prediction);
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Failed to trigger synapse pulse.');
        } finally {
            setPulsing(false);
        }
    };

    return (
        <div className="p-8 rounded-[32px] bg-gradient-to-br from-teal-500/10 via-transparent to-transparent border border-teal-500/20 relative overflow-hidden group">
            <div className={`absolute inset-0 bg-teal-500/5 animate-pulse pointer-events-none ${pulsing ? 'opacity-100' : 'opacity-0'}`}></div>

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Synapse Pulse</h3>
                    </div>
                    <p className="text-slate-400 text-sm max-w-md">
                        Cross-reference your current vitals with genealogical health patterns and clinical evidence via the Akashic Records.
                    </p>
                </div>

                <button
                    onClick={triggerPulse}
                    disabled={pulsing}
                    className={`px-8 py-4 rounded-2xl font-bold text-sm tracking-widest uppercase transition-all flex items-center gap-3 shadow-lg shadow-teal-500/20 active:scale-95 ${pulsing
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-teal-500 text-white hover:bg-teal-400 hover:-translate-y-1'
                        }`}
                >
                    <Zap className={`w-4 h-4 ${pulsing ? 'animate-bounce' : ''}`} />
                    {pulsing ? 'Processing...' : 'Trigger Pulse'}
                </button>
            </div>

            {error && (
                <div className="relative mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div>
                        <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4">Neural Trajectory Prediction</h4>
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                            <p className="text-slate-300 text-sm leading-relaxed mb-4">
                                {result.narrative?.split('.')[0]}.
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                        <span>Confidence</span>
                                        <span className="text-teal-400">{result.confidence?.score}%</span>
                                    </div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-teal-500" style={{ width: `${result.confidence?.score}%` }}></div>
                                    </div>
                                </div>
                                <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                    {result.evidence?.label}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4">Akashic Grounding</h4>
                        <div className="space-y-3">
                            {result.narrative?.split('.').slice(1, 3).map((text: string, i: number) => (
                                <div key={i} className="flex gap-3 text-sm text-slate-400 italic">
                                    <Shield className="w-4 h-4 text-teal-500/40 shrink-0" />
                                    <span>{text}.</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function FamilyHealthHeatmap() {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadFamilyMap = async () => {
            try {
                const headers = await apiClient.getAuthHeaders();
                const data = await requestBackendJson<any>('/api/v1/causal-twin/ancestry/family-map', { headers }, 'Failed to load family risk map.');
                if (!cancelled) {
                    setMembers(data.family_map || []);
                    setError(null);
                }
            } catch (e) {
                console.error(e);
                if (!cancelled) {
                    setMembers([]);
                    setError(e instanceof Error ? e.message : 'Failed to load family risk map.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadFamilyMap();

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) return null;

    return (
        <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Trinity Synapse: Family Risk Map
            </h3>
            {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </div>
            ) : members.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-6 text-sm text-slate-400">
                    No family risk map is available yet.
                </div>
            ) : (
                <div className="flex flex-wrap gap-3">
                    {members.map((m, i) => (
                        <div
                            key={i}
                            className="px-4 py-2 rounded-xl border flex items-center gap-2 group cursor-help transition-all hover:bg-white/5"
                            style={{ borderColor: `${m.colour}40`, backgroundColor: `${m.colour}10` }}
                        >
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: m.colour }}></div>
                            <span className="text-xs font-bold text-white/80 group-hover:text-white">{m.member_name}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-black">{m.risk_level}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Layout({ className }: { className?: string }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>; }

function formatTime(d: Date) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
