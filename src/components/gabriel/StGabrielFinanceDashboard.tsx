import { useState, useEffect } from 'react';
import { ArrowLeft, Wallet, PieChart, TrendingUp, Shield, MessageSquare, Plus, DollarSign, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BudgetEnvelopes from './BudgetEnvelopes';
import TransactionLedger from './TransactionLedger';
import CouncilChat from './CouncilChat';
import SecurityIntegrityBadge from '../shared/SecurityIntegrityBadge';
import SaintsGuardian from '../saints/SaintsGuardian';
import SaintsQuickNav from '../shared/SaintsQuickNav';
import TrinitySynapsePanel from '../shared/TrinitySynapsePanel';
import GabrielDHTSummary from './GabrielDHTSummary';
import WiseGoldPanel from './WiseGoldPanel';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL, isProduction } from '../../lib/env';

export default function StGabrielFinanceDashboard() {
    const navigate = useNavigate();
    const { user, session } = useAuth();
    const [activeView, setActiveView] = useState<'budget' | 'ledger' | 'reports' | 'wisegold'>('budget');
    const [showCouncil, setShowCouncil] = useState(true);
    const [wgoldBalance, setWgoldBalance] = useState(0);
    const [wgoldPriceUsd, setWgoldPriceUsd] = useState(72.00);

    useEffect(() => {
        // Fetch WGOLD balance for Net Worth calculation
        const fetchWallet = async () => {
            const token = session?.access_token || '';
            if (!token) {
                if (!isProduction) {
                    setWgoldBalance(1450.50);
                    setWgoldPriceUsd(89.50);
                } else {
                    setWgoldBalance(0);
                    setWgoldPriceUsd(0);
                }
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/finance/wisegold/wallet`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.wallet && data.wallet.balance) {
                        setWgoldBalance(data.wallet.balance);
                    }
                }

                // Fetch live Gold Price from Chainlink (via backend)
                const priceRes = await fetch(`${API_BASE_URL}/api/v1/finance/wisegold/price`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (priceRes.ok) {
                    const priceData = await priceRes.json();
                    if (priceData.xau_usd_price) {
                        setWgoldPriceUsd(priceData.xau_usd_price);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch WiseGold balance or Chainlink price:", err);
                if (!isProduction) {
                    setWgoldBalance(1450.50);
                    setWgoldPriceUsd(89.50);
                } else {
                    setWgoldBalance(0);
                    setWgoldPriceUsd(0);
                }
            }
        };
        fetchWallet();
    }, [session]);

    // Mock USD Net Worth base plus dynamic Chainlink WGOLD value
    const baseNetWorth = 142593.00;
    const wgoldValueUsd = wgoldBalance * wgoldPriceUsd;
    const totalNetWorth = baseNetWorth + wgoldValueUsd;

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

                        <div className="my-2 border-t border-slate-800/50"></div>

                        <button
                            onClick={() => setActiveView('wisegold')}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeView === 'wisegold' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                        >
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            Sovereign Economy
                        </button>
                    </nav>
                </div>

                <div className="mt-auto p-4 border-t border-slate-800">
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">Net Worth</div>
                        <div className="text-2xl font-light text-white">${totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
                        {activeView === 'wisegold' && 'WiseGold Network'}
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
                    {activeView === 'wisegold' && <WiseGoldPanel />}
                    {activeView === 'reports' && (
                        <div className="space-y-5">
                            <div className="rounded-2xl bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-amber-500/5 border border-white/5 p-4">
                                <h2 className="text-base font-semibold text-white mb-0.5 flex items-center gap-2">
                                    ♥ Health × Finance
                                </h2>
                                <p className="text-xs text-slate-500">
                                    How your financial decisions affect — and are affected by — your health.
                                    Powered by Trinity Synapse cross-referencing St. Raphael and St. Joseph.
                                </p>
                            </div>
                            {/* Gabriel DHT Summary — OCEAN-calibrated health message */}
                            {user?.id && <GabrielDHTSummary personId={user.id} />}
                            <TrinitySynapsePanel
                                saint="gabriel"
                                budgetEnvelopes={[]}
                                metricsHistory={[]}
                                familyMembers={[]}
                                healthRiskScore={50}
                            />
                            <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-5">
                                <h3 className="text-sm font-semibold text-white mb-3">How Trinity Synapse Works</h3>
                                <div className="space-y-2 text-xs text-slate-400">
                                    <p>→ <span className="text-amber-400">St. Joseph</span> provides hereditary risk patterns and personality profiles (OCEAN).</p>
                                    <p>→ <span className="text-teal-400">St. Raphael</span> tracks live biometrics (HRV, glucose, sleep, stress) and predicts health trajectories.</p>
                                    <p>→ <span className="text-emerald-400">St. Gabriel</span> correlates your health-spending envelopes with those biometric trends, showing your health investment ROI.</p>
                                </div>
                            </div>
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
