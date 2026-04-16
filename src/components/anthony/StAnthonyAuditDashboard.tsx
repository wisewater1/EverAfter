import { useEffect, useState } from 'react';
import { ArrowLeft, Search, FileText, Activity, MessageCircle, ShieldCheck, Network, Key } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SaintChat from '../SaintChat';
import LostFoundLedger from './LostFoundLedger';
import EventStream from './EventStream';
import ContinuousControls from './ContinuousControls';
import DataFlowMap from './DataFlowMap';
import JITAccess from './JITAccess';
import SaintsQuickNav from '../shared/SaintsQuickNav';
import SecurityIntegrityBadge from '../shared/SecurityIntegrityBadge';
import AnthonyStaleDataPanel from './AnthonyStaleDataPanel';
import { useAuth } from '../../contexts/AuthContext';

type AnthonyTab = 'readiness' | 'flow' | 'jit' | 'ledger' | 'stream' | 'chat' | 'dht-recovery';

const ANTHONY_TABS: Array<{ key: AnthonyTab; label: string; mobileLabel: string; icon: typeof ShieldCheck }> = [
    { key: 'readiness', label: 'Audit Readiness', mobileLabel: 'Readiness', icon: ShieldCheck },
    { key: 'flow', label: 'Data Flow Map', mobileLabel: 'Flow', icon: Network },
    { key: 'ledger', label: 'Cryptographic Ledger', mobileLabel: 'Ledger', icon: FileText },
    { key: 'stream', label: 'Event Stream', mobileLabel: 'Stream', icon: Activity },
    { key: 'jit', label: 'JIT Access', mobileLabel: 'JIT', icon: Key },
    { key: 'chat', label: 'Consult St. Anthony', mobileLabel: 'Chat', icon: MessageCircle },
    { key: 'dht-recovery', label: 'Health Recovery', mobileLabel: 'Recovery', icon: Search },
];

export default function StAnthonyAuditDashboard() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<AnthonyTab>('readiness');
    const ledgerFilter = searchParams.get('filter') || undefined;
    const activeTabConfig = ANTHONY_TABS.find((tab) => tab.key === activeTab) ?? ANTHONY_TABS[0];

    useEffect(() => {
        const requestedTab = searchParams.get('tab');
        if (!requestedTab) return;

        const allowedTabs = new Set(ANTHONY_TABS.map((tab) => tab.key));
        if (allowedTabs.has(requestedTab)) {
            setActiveTab(requestedTab as AnthonyTab);
        }
    }, [searchParams]);

    return (
        <div className="min-h-screen space-y-6 bg-slate-950 p-4 text-slate-200 sm:space-y-8 sm:p-6">
            {/* Header Section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-2 text-slate-400 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 shadow-lg shadow-amber-500/10 sm:h-12 sm:w-12">
                            <Search className="w-6 h-6 text-amber-500" />
                        </div>
                        <div className="space-y-1">
                            <h1 className="flex items-center gap-2 text-2xl font-light tracking-tight text-white sm:text-3xl">
                                <span>St. Anthony</span>
                                <span className="hidden text-xl font-thin text-amber-500/50 sm:inline">| Audit & Recovery</span>
                            </h1>
                            <p className="text-xs leading-relaxed text-slate-400 sm:hidden">
                                Audit trails, recovery, and event proofs.
                            </p>
                            <p className="hidden max-w-2xl text-xs leading-relaxed text-slate-400 sm:block sm:text-sm">
                                "The Finder of Lost Things" — Tracking your digital assets, recovering lost data, and maintaining a ledger of all system events.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-end">
                    <SecurityIntegrityBadge />
                </div>
            </div>

            <SaintsQuickNav />

            {/* Navigation Tabs */}
            <div className="sm:hidden">
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Audit View
                </label>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-2">
                    <div className="mb-2 flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                        <activeTabConfig.icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{activeTabConfig.label}</span>
                    </div>
                    <select
                        value={activeTab}
                        onChange={(event) => setActiveTab(event.target.value as AnthonyTab)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-amber-500/40"
                    >
                        {ANTHONY_TABS.map((tab) => (
                            <option key={tab.key} value={tab.key}>
                                {tab.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="hidden items-center gap-6 overflow-x-auto border-b border-slate-800 custom-scrollbar sm:flex">
                <button
                    onClick={() => setActiveTab('readiness')}
                    className={`pb-4 text-sm font-medium transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'readiness' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'}`}
                >
                    <ShieldCheck className="w-4 h-4" />
                    Audit Readiness
                    {activeTab === 'readiness' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('flow')}
                    className={`pb-4 text-sm font-medium transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'flow' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'}`}
                >
                    <Network className="w-4 h-4" />
                    Data Flow Map
                    {activeTab === 'flow' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('ledger')}
                    className={`pb-4 text-sm font-medium transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'ledger' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'}`}
                >
                    <FileText className="w-4 h-4" />
                    Cryptographic Ledger
                    {activeTab === 'ledger' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('stream')}
                    className={`pb-4 text-sm font-medium transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'stream' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'}`}
                >
                    <Activity className="w-4 h-4" />
                    Event Stream
                    {activeTab === 'stream' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('jit')}
                    className={`pb-4 text-sm font-medium transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'jit' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'}`}
                >
                    <Key className="w-4 h-4" />
                    JIT Access
                    {activeTab === 'jit' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`pb-4 text-sm font-medium transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'chat' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'}`}
                >
                    <MessageCircle className="w-4 h-4" />
                    Consult St. Anthony
                    {activeTab === 'chat' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('dht-recovery')}
                    className={`pb-4 text-sm font-medium transition-all relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'dht-recovery' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'}`}
                >
                    <Search className="w-4 h-4" />
                    ⚕ Health Recovery
                    {activeTab === 'dht-recovery' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                </button>
            </div>

            {/* Content Area */}
            <div className="mt-6 min-h-[600px] sm:mt-8">
                {activeTab === 'readiness' && <ContinuousControls />}
                {activeTab === 'flow' && <DataFlowMap />}
                {activeTab === 'jit' && <JITAccess />}
                {activeTab === 'ledger' && <LostFoundLedger filterToken={ledgerFilter} />}
                {activeTab === 'stream' && <EventStream />}
                {activeTab === 'chat' && (
                    <div className="max-w-4xl mx-auto h-[600px] bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                        <SaintChat
                            saintId="anthony"
                            saintName="St. Anthony"
                            saintTitle="The Finder of Lost Things"
                            saintIcon={Search}
                            primaryColor="amber"
                            initialMessage="I am here to help you find what is lost, whether it be data, purpose, or peace. How may I assist you?"
                        />
                    </div>
                )}
                {activeTab === 'dht-recovery' && user?.id && (
                    <div className="space-y-4">
                        <div className="px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/10">
                            <p className="text-[10px] text-amber-400/70">
                                St. Anthony finds what is lost in your Delphi Health Trajectory — stale readings, data gaps, and high-uncertainty signals that need to be recovered.
                            </p>
                        </div>
                        <AnthonyStaleDataPanel personId={user.id} />
                    </div>
                )}
            </div>
        </div>
    );
}
