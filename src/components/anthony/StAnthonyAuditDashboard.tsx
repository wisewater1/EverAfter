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

export default function StAnthonyAuditDashboard() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'readiness' | 'flow' | 'jit' | 'ledger' | 'stream' | 'chat' | 'dht-recovery'>('readiness');
    const ledgerFilter = searchParams.get('filter') || undefined;

    useEffect(() => {
        const requestedTab = searchParams.get('tab');
        if (!requestedTab) return;

        const allowedTabs = new Set(['readiness', 'flow', 'jit', 'ledger', 'stream', 'chat', 'dht-recovery']);
        if (allowedTabs.has(requestedTab)) {
            setActiveTab(requestedTab as typeof activeTab);
        }
    }, [searchParams]);

    return (
        <div className="space-y-8 p-6 bg-slate-950 min-h-screen text-slate-200">
            {/* Header Section */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/saints')}
                        className="p-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-slate-400 hover:text-white rounded-xl transition-all"
                        title="Back to Saints"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/10">
                            <Search className="w-6 h-6 text-amber-500" />
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-light tracking-tight text-white flex items-center gap-2">
                                St. Anthony <span className="text-amber-500/50 text-xl font-thin">| Audit & Recovery</span>
                            </h1>
                            <p className="text-slate-400 max-w-2xl leading-relaxed text-sm">
                                "The Finder of Lost Things" — Tracking your digital assets, recovering lost data, and maintaining a ledger of all system events.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <SaintsQuickNav />

            {/* Navigation Tabs */}
            <div className="flex items-center gap-6 border-b border-slate-800 overflow-x-auto custom-scrollbar">
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
            <div className="min-h-[600px] mt-8">
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
