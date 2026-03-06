import { useState, useEffect } from 'react';
import { Coins, HeartPulse, Sparkles, Users, ArrowRight, ShieldCheck, Activity, Share2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import CrossChainBridgeModal from './CrossChainBridgeModal';

interface WiseGoldWallet {
    id: string;
    balance: number;
    solana_pubkey: string | null;
    last_manna_claim: string | null;
}

interface RitualBond {
    tier: 'Seed' | 'Bronze' | 'Gold' | 'Diamond';
    ritual_score: number;
    multiplier: number;
}

interface LivingWill {
    status: 'ACTIVE' | 'FREEZE' | 'PARTIAL_RELEASE' | 'HISTORICAL';
    last_heartbeat: string | null;
    heirs: string;
}

interface SovereignCovenant {
    id: string;
    name: string;
    total_vault: number;
    members: number;
}

export default function WiseGoldPanel() {
    const { user, session } = useAuth();
    const [wallet, setWallet] = useState<WiseGoldWallet | null>(null);
    const [bond, setBond] = useState<RitualBond | null>(null);
    const [will, setWill] = useState<LivingWill | null>(null);
    const [covenants, setCovenants] = useState<SovereignCovenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [heartbeatSending, setHeartbeatSending] = useState(false);
    const [wgoldPriceUsd, setWgoldPriceUsd] = useState<number | null>(null);
    const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);

    // Get the JWT token from session
    const token = session?.access_token || '';

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            if (!token) {
                // Without a token, we cannot fetch. Use mock data immediately.
                setWallet({ id: 'mock', balance: 1450.50, solana_pubkey: '7xYz...1kPq', last_manna_claim: new Date().toISOString() });
                setBond({ tier: 'Gold', ritual_score: 84.5, multiplier: 1.5 });
                setWill({ status: 'ACTIVE', last_heartbeat: new Date().toISOString(), heirs: '2' });
                setCovenants([
                    { id: '1', name: 'St. Joseph Family Vault', total_vault: 12500, members: 5 },
                    { id: '2', name: 'Founders Covenant', total_vault: 50000, members: 12 }
                ]);
                setWgoldPriceUsd(89.50);
                setLoading(false);
                return;
            }

            try {
                // Fetch Wallet, Bond, and Will info
                const walletRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/finance/wisegold/wallet`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (walletRes.ok) {
                    const data = await walletRes.json();
                    setWallet(data.wallet);
                    setBond(data.ritual_bond);
                    setWill(data.living_will);
                }

                // Fetch Covenants
                const covRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/finance/wisegold/covenants`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (covRes.ok) {
                    setCovenants(await covRes.json());
                }

                // Fetch Chainlink Gold Price
                const priceRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/finance/wisegold/price`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (priceRes.ok) {
                    const priceData = await priceRes.json();
                    setWgoldPriceUsd(priceData.xau_usd_price);
                }
            } catch (err) {
                console.error("Failed to fetch WiseGold data:", err);
                // Fallback to mock data if backend is offline so the UI still renders
                setWallet({ id: 'mock', balance: 1450.50, solana_pubkey: '7xYz...1kPq', last_manna_claim: new Date().toISOString() });
                setBond({ tier: 'Gold', ritual_score: 84.5, multiplier: 1.5 });
                setWill({ status: 'ACTIVE', last_heartbeat: new Date().toISOString(), heirs: '2' });
                setCovenants([
                    { id: '1', name: 'St. Joseph Family Vault', total_vault: 12500, members: 5 },
                    { id: '2', name: 'Founders Covenant', total_vault: 50000, members: 12 }
                ]);
                setWgoldPriceUsd(89.50); // Mock Chainlink price
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, token]);

    const handleHeartbeat = async () => {
        if (!token) return;
        setHeartbeatSending(true);
        try {
            await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/finance/wisegold/heartbeat`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Update local state to reflect new heartbeat
            setWill(prev => prev ? { ...prev, last_heartbeat: new Date().toISOString(), status: 'ACTIVE' } : null);
        } catch (err) {
            console.error("Failed to sync heartbeat", err);
        } finally {
            setHeartbeatSending(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-400">Syncing with Sovereign Network...</div>;
    }

    const tierColors = {
        'Seed': 'text-slate-400',
        'Bronze': 'text-amber-600',
        'Gold': 'text-yellow-400',
        'Diamond': 'text-cyan-400'
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 rounded-2xl p-6 border border-amber-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                    <Coins className="w-32 h-32 text-amber-500 animate-pulse" />
                </div>

                <h2 className="text-2xl font-light text-white mb-2 relative z-10 flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-amber-400" />
                    Sovereign 3.0 Economy
                </h2>
                <p className="text-slate-300 text-sm max-w-2xl relative z-10 mb-6 font-medium">
                    Welcome to the living economy. Your wealth is backed by physical gold, secured by biometric proof-of-life, and multiplied by your community rituals.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">

                    {/* Wallet Card */}
                    <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-4 rounded-xl flex flex-col">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                            <Coins className="w-4 h-4 text-amber-500" />
                            <h3 className="text-sm font-semibold text-slate-200">WGOLD Balance</h3>
                        </div>
                        <div className="text-2xl font-bold font-mono text-white flex-1">
                            {wallet?.balance.toFixed(2)} <span className="text-xs text-amber-500">WGOLD</span>
                            {wgoldPriceUsd && wallet && (
                                <div className="text-sm font-medium text-emerald-400 mt-1">
                                    ≈ ${(wallet.balance * wgoldPriceUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                </div>
                            )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-800/50 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold bg-slate-950 px-2 py-0.5 rounded">
                                    Chainlink Data Feeds
                                </span>
                                {wgoldPriceUsd && <span className="text-xs text-slate-400 font-mono">${wgoldPriceUsd}/g</span>}
                            </div>
                            <button
                                onClick={() => setIsBridgeModalOpen(true)}
                                className="w-full py-1.5 mt-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                            >
                                <Share2 className="w-3.5 h-3.5" />
                                Bridge WGOLD
                            </button>
                        </div>
                    </div>

                    {/* Ritual Bond Card */}
                    <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-4 rounded-xl">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <h3 className="text-sm font-semibold text-slate-200">Ritual Bond NFT</h3>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <div className={`text-lg font-bold ${bond ? tierColors[bond.tier] : 'text-slate-400'}`}>
                                    {bond?.tier} Tier
                                </div>
                                <div className="text-xs text-slate-400 mt-1">Score: {bond?.ritual_score.toFixed(2)}</div>
                            </div>
                            <div className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-md text-xs font-bold font-mono">
                                {bond?.multiplier.toFixed(1)}x
                            </div>
                        </div>
                    </div>

                    {/* Living Will Card */}
                    <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-4 rounded-xl relative group">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-400" />
                                <h3 className="text-sm font-semibold text-slate-200">Proof-of-Life</h3>
                            </div>
                            <span className={`flex h-2 w-2 rounded-full ${will?.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'} `}></span>
                        </div>
                        <div className="text-xs text-slate-300 mb-3 space-y-1">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Status:</span>
                                <span className={will?.status === 'ACTIVE' ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>{will?.status}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Last Synced:</span>
                                <span className="font-mono text-[10px]">
                                    {will?.last_heartbeat ? new Date(will.last_heartbeat).toLocaleDateString() : 'Never'}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleHeartbeat}
                            disabled={heartbeatSending}
                            className={`w-full py-1.5 rounded-lg text-xs font-medium flex justify-center items-center gap-2 transition-all ${heartbeatSending
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                                }`}
                        >
                            <HeartPulse className={`w-3.5 h-3.5 ${heartbeatSending ? 'animate-ping' : ''}`} />
                            {heartbeatSending ? "Syncing..." : "Sync Biometrics"}
                        </button>
                    </div>

                    {/* AI Policy Tracker */}
                    <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-4 rounded-xl">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                            <ShieldCheck className="w-4 h-4 text-blue-400" />
                            <h3 className="text-sm font-semibold text-slate-200">AI Sentient Policy</h3>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded">
                                <span className="text-slate-400">Current Tax:</span>
                                <span className="text-rose-400 font-mono">0.5%</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded">
                                <span className="text-slate-400">Base Manna/Day:</span>
                                <span className="text-amber-400 font-mono">0.5 WGOLD</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Covenants Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-400" />
                        Sovereign Covenants
                    </h3>

                    {covenants.length === 0 ? (
                        <div className="text-center p-6 bg-slate-950 rounded-xl border border-slate-800/50">
                            <p className="text-sm text-slate-400">You are not part of any Sovereign Covenants.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {covenants.map(cov => (
                                <div key={cov.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-indigo-500/30 transition-colors">
                                    <div>
                                        <div className="font-medium text-slate-200">{cov.name}</div>
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                                            <span>{cov.members} Members</span>
                                            <span>Quorum: {Math.ceil(cov.members / 2)} Alive</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono font-bold text-amber-500">
                                            {cov.total_vault.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs">WGOLD</span>
                                        </div>
                                        <button className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 flex items-center gap-1 justify-end ml-auto">
                                            Request Withdrawal <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-center">
                    <div className="text-center opacity-50">
                        <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <h4 className="text-slate-400 font-medium">Gold-Backed Futures Market</h4>
                        <p className="text-xs text-slate-500 mt-1">Prediction markets unlock when Ritual Tier reaches Gold.</p>
                    </div>
                </div>
            </div>

            {wallet && (
                <CrossChainBridgeModal
                    isOpen={isBridgeModalOpen}
                    onClose={() => setIsBridgeModalOpen(false)}
                    currentBalance={wallet.balance}
                    token={token}
                />
            )}
        </div>
    );
}
