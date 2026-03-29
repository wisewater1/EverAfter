import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Wallet, PieChart, TrendingUp, TrendingDown, Shield, MessageSquare, Plus, DollarSign, Sparkles, Building2, RefreshCcw, Loader2 } from 'lucide-react';
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
import { isAuthFailureMessage } from '../../lib/auth-session';
import { BankStatusResponse, Transaction, financeApi } from '../../lib/gabriel/finance';
import { openPlaidLink } from '../../lib/gabriel/plaidLink';
import { getCapability, getRuntimeReadiness, type RuntimeCapability } from '../../lib/runtime-readiness';

type GabrielView = 'budget' | 'ledger' | 'reports' | 'wisegold';

const GABRIEL_VIEWS: Array<{ key: GabrielView; label: string; mobileLabel: string; icon: typeof Wallet }> = [
    { key: 'budget', label: 'Budget Envelopes', mobileLabel: 'Budget', icon: Wallet },
    { key: 'ledger', label: 'Transactions', mobileLabel: 'Ledger', icon: DollarSign },
    { key: 'reports', label: 'Reports & Analysis', mobileLabel: 'Reports', icon: PieChart },
    { key: 'wisegold', label: 'Sovereign Economy', mobileLabel: 'WiseGold', icon: Sparkles },
];

export default function StGabrielFinanceDashboard() {
    const navigate = useNavigate();
    const { user, session, loading: authLoading, isDemoMode } = useAuth();
    const cachedBankStatus = financeApi.getCachedBankStatus();
    const cachedTransactions = financeApi.getCachedTransactions(200);
    const cachedMonthCashFlow = (() => {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const bankTransactions = cachedTransactions.filter(
            (transaction) =>
                transaction.source === 'bank' &&
                new Date(transaction.date).getTime() >= startOfMonth.getTime(),
        );

        if (bankTransactions.length === 0) {
            return null;
        }

        return bankTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    })();
    const [activeView, setActiveView] = useState<GabrielView>('budget');
    const [showCouncil, setShowCouncil] = useState(true);
    const [wgoldBalance, setWgoldBalance] = useState(0);
    const [wgoldPriceUsd, setWgoldPriceUsd] = useState(72.00);
    const [bankStatus, setBankStatus] = useState<BankStatusResponse | null>(cachedBankStatus);
    const [bankActionLoading, setBankActionLoading] = useState(false);
    const [financeCardLoading, setFinanceCardLoading] = useState(false);
    const [financeCardError, setFinanceCardError] = useState<string | null>(null);
    const [monthCashFlow, setMonthCashFlow] = useState<number | null>(cachedMonthCashFlow);
    const [showGuardian, setShowGuardian] = useState(false);
    const [financeCapability, setFinanceCapability] = useState<RuntimeCapability | null>(null);
    const [plaidCapability, setPlaidCapability] = useState<RuntimeCapability | null>(null);

    useEffect(() => {
        const idleTimer = window.setTimeout(() => {
            setShowGuardian(true);
        }, 350);

        return () => window.clearTimeout(idleTimer);
    }, []);

    useEffect(() => {
        const fetchFinanceCardState = async () => {
            setFinanceCardLoading(true);
            setFinanceCardError(null);

            if (authLoading || isDemoMode) {
                setWgoldBalance(0);
                setWgoldPriceUsd(0);
                setBankStatus(cachedBankStatus);
                setMonthCashFlow(cachedMonthCashFlow);
                setFinanceCardLoading(false);
                return;
            }

            const token = session?.access_token || '';
            if (!token) {
                setWgoldBalance(0);
                setWgoldPriceUsd(0);
                setBankStatus(cachedBankStatus);
                setMonthCashFlow(cachedMonthCashFlow);
                setFinanceCardLoading(false);
                return;
            }

            try {
                const readiness = await getRuntimeReadiness();
                const nextFinanceCapability = getCapability(readiness, 'gabriel.finance');
                const nextPlaidCapability = getCapability(readiness, 'gabriel.plaid');
                setFinanceCapability(nextFinanceCapability);
                setPlaidCapability(nextPlaidCapability);

                if (nextFinanceCapability?.blocking) {
                    setWgoldBalance(0);
                    setWgoldPriceUsd(0);
                    setBankStatus(null);
                    setMonthCashFlow(null);
                    setFinanceCardError(nextFinanceCapability.reason || 'Gabriel finance is temporarily unavailable until runtime dependencies recover.');
                    return;
                }

                const [walletResult, priceResult, bankStatusResult, transactionsResult] = await Promise.allSettled([
                    financeApi.getWiseGoldWallet(),
                    financeApi.getWiseGoldPrice(),
                    financeApi.getBankStatus(),
                    financeApi.getTransactions(200),
                ]);

                if (walletResult.status === 'fulfilled') {
                    const data = walletResult.value;
                    setWgoldBalance(Number(data?.wallet?.balance || 0));
                } else {
                    setWgoldBalance(0);
                }

                if (priceResult.status === 'fulfilled') {
                    const priceData = priceResult.value;
                    setWgoldPriceUsd(Number(priceData?.xau_usd_price || 0));
                } else {
                    setWgoldPriceUsd(0);
                }

                if (bankStatusResult.status === 'fulfilled') {
                    setBankStatus(bankStatusResult.value);
                } else {
                    setBankStatus(null);
                }

                if (transactionsResult.status === 'fulfilled') {
                    const startOfMonth = new Date();
                    startOfMonth.setDate(1);
                    startOfMonth.setHours(0, 0, 0, 0);
                    const bankTransactions = transactionsResult.value.filter(
                        (transaction: Transaction) =>
                            transaction.source === 'bank' &&
                            new Date(transaction.date).getTime() >= startOfMonth.getTime(),
                    );
                    if (bankTransactions.length > 0) {
                        const total = bankTransactions.reduce(
                            (sum: number, transaction: Transaction) => sum + Number(transaction.amount || 0),
                            0,
                        );
                        setMonthCashFlow(total);
                    } else {
                        setMonthCashFlow(null);
                    }
                } else {
                    setMonthCashFlow(null);
                }
            } catch (err) {
                console.error('Failed to fetch finance sidebar state:', err);
                setWgoldBalance(0);
                setWgoldPriceUsd(0);
                setBankStatus(null);
                setMonthCashFlow(null);
                const message = err instanceof Error ? err.message : 'Unable to load connected account balances.';
                setFinanceCardError(isAuthFailureMessage(message) ? null : message);
            } finally {
                setFinanceCardLoading(false);
            }
        };

        const bootstrapTimer = window.setTimeout(() => {
            void fetchFinanceCardState();
        }, 200);

        return () => window.clearTimeout(bootstrapTimer);
    }, [authLoading, cachedBankStatus, cachedMonthCashFlow, isDemoMode, session]);

    const linkedAccountBalance = useMemo(() => {
        if (!bankStatus?.connected) {
            return 0;
        }

        return bankStatus.connections.reduce((connectionTotal, connection) => {
            const accountTotal = connection.accounts.reduce((sum, account) => {
                return sum + Number(account.current_balance || 0);
            }, 0);
            return connectionTotal + accountTotal;
        }, 0);
    }, [bankStatus]);

    const latestSyncText = useMemo(() => {
        const syncDates = bankStatus?.connections
            .map((connection) => connection.last_synced_at)
            .filter(Boolean)
            .map((value) => new Date(value as string).getTime()) || [];

        if (syncDates.length === 0) {
            return null;
        }

        return new Date(Math.max(...syncDates)).toLocaleString();
    }, [bankStatus]);

    const wgoldValueUsd = wgoldBalance * wgoldPriceUsd;
    const totalNetWorth = linkedAccountBalance + wgoldValueUsd;
    const activeViewConfig = GABRIEL_VIEWS.find((view) => view.key === activeView) ?? GABRIEL_VIEWS[0];

    async function refreshFinanceCardState() {
        if (authLoading || isDemoMode || !session?.access_token) {
            setBankStatus(cachedBankStatus);
            setMonthCashFlow(cachedMonthCashFlow);
            setFinanceCardError(null);
            setFinanceCardLoading(false);
            return;
        }

        setFinanceCardLoading(true);
        setFinanceCardError(null);
        try {
            const status = await financeApi.getBankStatus();
            setBankStatus(status);

            const transactions = await financeApi.getTransactions(200);
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const bankTransactions = transactions.filter(
                (transaction) =>
                    transaction.source === 'bank' &&
                    new Date(transaction.date).getTime() >= startOfMonth.getTime(),
            );
            setMonthCashFlow(
                bankTransactions.length > 0
                    ? bankTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
                    : null,
            );
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to refresh connected account balances.';
            setFinanceCardError(isAuthFailureMessage(message) ? null : message);
        } finally {
            setFinanceCardLoading(false);
        }
    }

    async function handleBankAction() {
        if (authLoading || isDemoMode || !session?.access_token) {
            setActiveView('ledger');
            return;
        }

        if (financeCapability?.blocking) {
            setFinanceCardError(financeCapability.reason || 'Gabriel finance is temporarily unavailable until runtime dependencies recover.');
            return;
        }

        if (plaidCapability?.blocking) {
            setFinanceCardError(plaidCapability.reason || 'Plaid is temporarily unavailable until runtime dependencies recover.');
            return;
        }

        if (!bankStatus?.configured) {
            setActiveView('ledger');
            return;
        }

        try {
            setBankActionLoading(true);
            setFinanceCardError(null);

            if (bankStatus.connected) {
                await financeApi.syncBankTransactions();
            } else {
                const tokenResponse = await financeApi.createBankLinkToken();
                await openPlaidLink({
                    linkToken: tokenResponse.link_token,
                    onSuccess: async (publicToken, metadata) => {
                        await financeApi.exchangeBankPublicToken({
                            public_token: publicToken,
                            institution_id: metadata?.institution?.institution_id ?? metadata?.institution?.id ?? null,
                            institution_name: metadata?.institution?.name ?? null,
                        });
                    },
                });
            }

            await refreshFinanceCardState();
        } catch (err) {
            console.error('Failed to complete bank action:', err);
            const message = err instanceof Error ? err.message : 'Unable to connect or sync bank account.';
            setFinanceCardError(isAuthFailureMessage(message) ? null : message);
        } finally {
            setBankActionLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen flex-col overflow-hidden bg-slate-950 font-sans text-slate-200 lg:h-screen lg:flex-row">
            {/* Sidebar Navigation */}
            <div className="w-full border-b border-slate-800 bg-slate-900 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
                <div className="p-4 sm:p-6">
                    <div className="mb-5 flex items-center gap-3 sm:mb-8">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                            <Wallet className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-semibold text-white tracking-tight">St. Gabriel Finance</h1>
                            <p className="text-xs font-medium text-slate-500">
                                <span className="sm:hidden">Financial steward</span>
                                <span className="hidden sm:inline">Financial Steward</span>
                            </p>
                        </div>
                    </div>

                    <div className="lg:hidden">
                        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Finance View
                        </label>
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-2">
                            <div className="mb-2 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                                <activeViewConfig.icon className="h-3.5 w-3.5 shrink-0" />
                                <span>{activeViewConfig.label}</span>
                            </div>
                            <select
                                value={activeView}
                                onChange={(event) => setActiveView(event.target.value as GabrielView)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500/40"
                            >
                                {GABRIEL_VIEWS.map((view) => (
                                    <option key={view.key} value={view.key}>
                                        {view.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <nav className="hidden space-y-2 lg:block">
                        {GABRIEL_VIEWS.map((view) => {
                            const Icon = view.icon;
                            const activeClasses = view.key === 'wisegold'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                            return (
                                <button
                                    key={view.key}
                                    onClick={() => setActiveView(view.key)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeView === view.key ? activeClasses : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                                >
                                    <Icon className={`w-4 h-4 ${view.key === 'wisegold' ? 'text-amber-500' : ''}`} />
                                    {view.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="border-t border-slate-800 p-4 lg:mt-auto">
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">Net Worth</div>
                        {financeCardLoading ? (
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading balances...
                            </div>
                        ) : bankStatus?.connected ? (
                            <>
                                <div className="text-2xl font-light text-white">
                                    ${totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="mt-2 space-y-1 text-xs">
                                    <div className="flex items-center justify-between text-slate-400">
                                        <span>Linked accounts</span>
                                        <span className="text-slate-200">
                                            ${linkedAccountBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-400">
                                        <span>WGOLD value</span>
                                        <span className="text-slate-200">
                                            ${wgoldValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                                <div
                                    className={`flex items-center gap-1 mt-3 text-xs ${
                                        monthCashFlow === null
                                            ? 'text-slate-400'
                                            : monthCashFlow >= 0
                                                ? 'text-emerald-400'
                                                : 'text-rose-400'
                                    }`}
                                >
                                    {monthCashFlow === null ? (
                                        <Building2 className="w-3 h-3" />
                                    ) : monthCashFlow >= 0 ? (
                                        <TrendingUp className="w-3 h-3" />
                                    ) : (
                                        <TrendingDown className="w-3 h-3" />
                                    )}
                                    <span>
                                        {monthCashFlow === null
                                            ? `${bankStatus.connections.length} linked connection${bankStatus.connections.length === 1 ? '' : 's'}`
                                            : `${monthCashFlow >= 0 ? '+' : '-'}$${Math.abs(monthCashFlow).toLocaleString('en-US', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })} net cash flow this month`}
                                    </span>
                                </div>
                                {latestSyncText && (
                                    <div className="mt-1 text-[11px] text-slate-500">
                                        Last synced {latestSyncText}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="text-lg font-medium text-white">Connect a bank account</div>
                                <div className="mt-1 text-xs text-slate-400">
                                    {bankStatus?.configured
                                        ? 'Link a real account to calculate net worth and keep Gabriel in sync.'
                                        : 'Bank linking is not configured on this backend yet.'}
                                </div>
                                {wgoldValueUsd > 0 && (
                                    <div className="mt-3 text-xs text-slate-400">
                                        Current WGOLD asset value:{' '}
                                        <span className="text-amber-300">
                                            ${wgoldValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                        {financeCardError && (
                            <div className="mt-3 text-xs text-rose-400">{financeCardError}</div>
                        )}
                        <button
                            type="button"
                            onClick={handleBankAction}
                            disabled={bankActionLoading}
                            className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {bankActionLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : bankStatus?.connected ? (
                                <RefreshCcw className="w-3.5 h-3.5" />
                            ) : (
                                <Building2 className="w-3.5 h-3.5" />
                            )}
                            {bankStatus?.connected ? 'Sync linked accounts' : bankStatus?.configured ? 'Connect bank account' : 'Open transaction ledger'}
                        </button>
                    </div>
                    <button
                        onClick={() => navigate('/saints')}
                        className="mt-4 flex w-full items-center justify-center gap-2 py-2 text-xs text-slate-500 transition-colors hover:text-slate-300"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        <span className="sm:hidden">Back</span>
                        <span className="hidden sm:inline">Back to Saints</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex min-w-0 flex-1 flex-col">
                {/* Top Bar */}
                <header className="flex min-h-16 flex-col gap-3 border-b border-slate-800 bg-slate-900/50 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-0">
                    <h2 className="text-base font-medium text-white sm:text-lg">
                        {activeView === 'budget' && 'Envelope Budget'}
                        {activeView === 'ledger' && 'Transaction Ledger'}
                        {activeView === 'reports' && 'Financial Health Check'}
                        {activeView === 'wisegold' && 'WiseGold Network'}
                    </h2>
                    <div className="flex items-center gap-3 sm:gap-4">
                        <SecurityIntegrityBadge />
                        <button className="p-2 text-slate-400 transition-colors hover:text-white">
                            <Plus className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowCouncil(!showCouncil)}
                            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${showCouncil ? 'border border-indigo-500/30 bg-indigo-500/20 text-indigo-300' : 'border border-slate-700 bg-slate-800 text-slate-400'}`}
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="sm:hidden">{showCouncil ? 'Hide' : 'Council'}</span>
                            <span className="hidden sm:inline">{showCouncil ? 'Hide Council' : 'Ask Council'}</span>
                        </button>
                    </div>
                </header>

                {/* Content */}
                <main className="relative flex-1 overflow-auto bg-slate-950 p-4 sm:p-6">
                    {/* Saints Quick Nav */}
                    <div className="mb-4">
                        <SaintsQuickNav />
                    </div>

                    {/* Saints Guardian Widget */}
                    {showGuardian ? <SaintsGuardian /> : null}

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
                <div className="flex w-full flex-col border-t border-slate-800 bg-slate-900 shadow-2xl lg:w-96 lg:border-l lg:border-t-0">
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
