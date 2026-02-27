import { useState } from 'react';
import { ArrowLeft, Wallet, PieChart, TrendingUp, Shield, MessageSquare, Plus, DollarSign, Menu, ChevronLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BudgetEnvelopes from './BudgetEnvelopes';
import TransactionLedger from './TransactionLedger';
import CouncilChat from './CouncilChat';
import SecurityIntegrityBadge from '../shared/SecurityIntegrityBadge';
import SaintsGuardian from '../saints/SaintsGuardian';
import SaintsQuickNav from '../shared/SaintsQuickNav';

export default function StGabrielFinanceDashboard() {
    const navigate = useNavigate();
    const [activeView, setActiveView] = useState<'budget' | 'ledger' | 'reports'>('budget');
    const [showCouncil, setShowCouncil] = useState(true);

    return (
        <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
            {/* Sidebar Navigation */}
            <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                            <Wallet className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-white tracking-tight">St. Gabriel Finance</h1>
                            <p className="text-xs text-slate-500 font-medium">Financial Steward</p>
                        </div>
                    </div>

                    <nav className="space-y-2">
                        <button
                            onClick={() => setActiveView('budget')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeView === 'budget' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                        >
                            <Wallet className="w-4 h-4" />
                            Budget Envelopes
                        </button>
                        <button
                            onClick={() => setActiveView('ledger')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeView === 'ledger' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                        >
                            <DollarSign className="w-4 h-4" />
                            Transactions
                        </button>
                        <button
                            onClick={() => setActiveView('reports')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeView === 'reports' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                        >
                            <PieChart className="w-4 h-4" />
                            Reports & Analysis
                        </button>
                    </nav>
                </div>

                <div className="mt-auto p-4 border-t border-slate-800">
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">Net Worth</div>
                        <div className="text-2xl font-light text-white">$142,593.00</div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-emerald-400">
                            <TrendingUp className="w-3 h-3" />
                            <span>+2.4% this month</span>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/saints')}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Back to Saints
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Bar */}
                <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6">
                    <h2 className="text-lg font-medium text-white">
                        {activeView === 'budget' && 'Envelope Budget'}
                        {activeView === 'ledger' && 'Transaction Ledger'}
                        {activeView === 'reports' && 'Financial Health Check'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <SecurityIntegrityBadge />
                        <button className="p-2 text-slate-400 hover:text-white transition-colors">
                            <Plus className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowCouncil(!showCouncil)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${showCouncil ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {showCouncil ? 'Hide Council' : 'Ask Council'}
                        </button>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-auto p-6 bg-slate-950 relative">
                    {/* Saints Quick Nav */}
                    <div className="mb-4">
                        <SaintsQuickNav />
                    </div>

                    {/* Saints Guardian Widget */}
                    <SaintsGuardian />

                    {activeView === 'budget' && <BudgetEnvelopes />}
                    {activeView === 'ledger' && <TransactionLedger />}
                    {activeView === 'reports' && (
                        <div className="flex items-center justify-center h-full text-slate-500">
                            Reports coming soon (requires more data)
                        </div>
                    )}
                </main>
            </div>

            {/* The Financial Council (Chat Sidebar) */}
            {showCouncil && (
                <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl">
                    <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Shield className="w-4 h-4 text-indigo-400" />
                            The Financial Council
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">Multi-Agent Advisory Board</p>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <CouncilChat />
                    </div>
                </div>
            )}
        </div>
    );
}
