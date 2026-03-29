import { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Coins,
  HeartPulse,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import CrossChainBridgeModal from './CrossChainBridgeModal';
import { isAuthFailureMessage } from '../../lib/auth-session';
import { financeApi } from '../../lib/gabriel/finance';
import { getCapability, getRuntimeReadiness, type RuntimeCapability } from '../../lib/runtime-readiness';

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

interface WiseGoldPolicy {
  current_tax_rate: number;
  current_base_manna: number;
  daily_manna_pool: number;
  total_circulating: number;
  last_gold_price: number;
  stress_level: number;
  last_tick_velocity: number;
  last_gold_delta: number;
  last_tick_at: string | null;
}

interface SocialStanding {
  reputation_bps: number;
  normalized_score: number;
  daily_manna_multiplier_bps: number;
  governance_weight_bps: number;
  tier: string;
  total_interactions: number;
  distinct_peers: number;
  reciprocal_peers: number;
  inbound_sentiment_avg: number;
  inbound_rapport_avg: number;
  outbound_sentiment_avg: number;
  last_calculated_at: string | null;
}

interface SovereignCovenant {
  id: string;
  name: string;
  total_vault: number;
  members: number;
  quorum: number;
  pending_withdrawals: number;
}

interface LedgerEntry {
  id: string;
  entry_type: string;
  direction: 'credit' | 'debit' | 'info';
  amount: number;
  balance_after: number | null;
  status: string;
  description: string;
  covenant_name?: string | null;
  created_at: string | null;
  metadata?: Record<string, unknown>;
}

interface WalletResponse {
  wallet: WiseGoldWallet;
  ritual_bond: RitualBond;
  living_will: LivingWill;
  policy: WiseGoldPolicy;
  social_standing: SocialStanding;
  policy_summary?: PolicySummary;
}

interface WiseGoldAttestation {
  id: string;
  covenant_id: string;
  covenant_key: string;
  covenant_name: string | null;
  status: string;
  attestation_type: string;
  wallet_address: string | null;
  issued_at: string | null;
  expires_at: string | null;
  last_verified_at: string | null;
  metadata?: Record<string, unknown>;
}

interface PolicyActionEvaluation {
  allowed: boolean;
  reason_code: string;
  reason: string;
  effective_limit: number;
  attested: boolean;
  attestation_count: number;
}

interface PolicySummary {
  attestation_status: {
    active: boolean;
    count: number;
  };
  limits: {
    mint: number;
    withdraw: number;
    bridge: number;
  };
  actions: {
    mint: PolicyActionEvaluation;
    withdraw: PolicyActionEvaluation;
    bridge: PolicyActionEvaluation;
  };
}

function formatTimestamp(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

function formatEntryType(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeWiseGoldError(error: unknown, fallbackMessage: string): string {
  const message = error instanceof Error ? error.message : String(error || '');
  const compact = message.trim();

  if (isAuthFailureMessage(compact)) {
    return 'WiseGold requires an authenticated session.';
  }

  if (!compact || compact === 'Internal Server Error') {
    return fallbackMessage;
  }

  return compact;
}

export default function WiseGoldPanel() {
  const { user, session } = useAuth();
  const token = session?.access_token || '';

  const [wallet, setWallet] = useState<WiseGoldWallet | null>(null);
  const [bond, setBond] = useState<RitualBond | null>(null);
  const [will, setWill] = useState<LivingWill | null>(null);
  const [policy, setPolicy] = useState<WiseGoldPolicy | null>(null);
  const [socialStanding, setSocialStanding] = useState<SocialStanding | null>(null);
  const [covenants, setCovenants] = useState<SovereignCovenant[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [attestations, setAttestations] = useState<WiseGoldAttestation[]>([]);
  const [policySummary, setPolicySummary] = useState<PolicySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [heartbeatSending, setHeartbeatSending] = useState(false);
  const [wgoldPriceUsd, setWgoldPriceUsd] = useState<number | null>(null);
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wiseGoldCapability, setWiseGoldCapability] = useState<RuntimeCapability | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [covenantAmounts, setCovenantAmounts] = useState<Record<string, string>>({});
  const [activeCovenantAction, setActiveCovenantAction] = useState<string | null>(null);

  const clearWiseGoldState = (message: string) => {
    setWallet(null);
    setBond(null);
    setWill(null);
    setPolicy(null);
    setSocialStanding(null);
    setCovenants([]);
    setLedger([]);
    setAttestations([]);
    setPolicySummary(null);
    setWgoldPriceUsd(null);
    setError(message);
  };

  const loadWiseGoldData = async () => {
    setLoading(true);
    setActionMessage(null);

    if (!user) {
      setError('Sign in to access WiseGold.');
      setLoading(false);
      return;
    }

    if (!token) {
      const message = 'WiseGold requires an authenticated session.';
      clearWiseGoldState(message);
      setLoading(false);
      return;
    }

    try {
      const readiness = await getRuntimeReadiness();
      const capability = getCapability(readiness, 'gabriel.wisegold');
      setWiseGoldCapability(capability);
      if (capability?.blocking) {
        const message = capability.reason || 'WiseGold is temporarily unavailable until runtime dependencies recover.';
        clearWiseGoldState(message);
        return;
      }

      const [walletData, covenantData, ledgerData, priceData, attestationData, policySummaryData] = await Promise.all([
        financeApi.getWiseGoldWallet(),
        financeApi.getWiseGoldCovenants(),
        financeApi.getWiseGoldLedger(12),
        financeApi.getWiseGoldPrice(),
        financeApi.getWiseGoldAttestations(),
        financeApi.getWiseGoldPolicySummary(),
      ]);

      setWallet(walletData.wallet);
      setBond(walletData.ritual_bond);
      setWill(walletData.living_will);
      setPolicy(walletData.policy);
      setSocialStanding(walletData.social_standing);
      setCovenants(covenantData);
      setLedger(ledgerData);
      setAttestations(attestationData);
      setPolicySummary(policySummaryData || walletData.policy_summary || null);
      setError(null);
      setWgoldPriceUsd(priceData?.xau_usd_price ?? null);
    } catch (err) {
      const message = normalizeWiseGoldError(err, 'WiseGold live data is temporarily unavailable.');
      console.error('WiseGold data load failed:', err);
      clearWiseGoldState(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWiseGoldData();
  }, [user, token]);

  const handleHeartbeat = async () => {
    if (!token) return;
    if (wiseGoldCapability?.blocking) {
      setError(wiseGoldCapability.reason || 'WiseGold is temporarily unavailable until runtime dependencies recover.');
      return;
    }
    setHeartbeatSending(true);
    setActionMessage(null);
    try {
      await financeApi.syncWiseGoldHeartbeat();
      setActionMessage('Proof-of-life heartbeat synchronized.');
      await loadWiseGoldData();
    } catch (err) {
      const message = normalizeWiseGoldError(err, 'Failed to sync heartbeat.');
      setError(message);
    } finally {
      setHeartbeatSending(false);
    }
  };

  const handleCovenantAction = async (covenantId: string, action: 'deposit' | 'withdraw') => {
    if (!token) return;
    if (wiseGoldCapability?.blocking) {
      setError(wiseGoldCapability.reason || 'WiseGold is temporarily unavailable until runtime dependencies recover.');
      return;
    }
    const rawAmount = covenantAmounts[covenantId] ?? '';
    const amount = parseFloat(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid WGOLD amount before submitting.');
      return;
    }

    setActiveCovenantAction(`${action}:${covenantId}`);
    setActionMessage(null);
    try {
      const data = await financeApi.submitWiseGoldCovenantAction(covenantId, action, amount);

      setActionMessage(
        action === 'deposit'
          ? `Deposited ${amount.toFixed(2)} WGOLD.`
          : data.status === 'PENDING_QUORUM'
            ? `Withdrawal request submitted for quorum review.`
            : `Withdrew ${amount.toFixed(2)} WGOLD.`,
      );
      setCovenantAmounts((current) => ({ ...current, [covenantId]: '' }));
      await loadWiseGoldData();
    } catch (err) {
      const message = normalizeWiseGoldError(err, `Failed to ${action} WGOLD.`);
      setError(message);
    } finally {
      setActiveCovenantAction(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Syncing with Sovereign Network...</div>;
  }

  if (!wallet || !bond || !will || !policy || !socialStanding || !policySummary) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-300">
        {error || 'WiseGold is unavailable.'}
      </div>
    );
  }

  const tierColors = {
    Seed: 'text-slate-400',
    Bronze: 'text-amber-600',
    Gold: 'text-yellow-400',
    Diamond: 'text-cyan-400',
  } as const;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionMessage && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {actionMessage}
        </div>
      )}

      <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 rounded-2xl p-6 border border-amber-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <Coins className="w-32 h-32 text-amber-500 animate-pulse" />
        </div>

        <h2 className="text-2xl font-light text-white mb-2 relative z-10 flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-amber-400" />
          Sovereign 3.0 Economy
        </h2>
        <p className="text-slate-300 text-sm max-w-2xl relative z-10 mb-6 font-medium">
          Your WGOLD economy is now driven by a live ledger, policy state, covenant vaults, and scheduled manna issuance.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-4 rounded-xl flex flex-col">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
              <Coins className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-200">WGOLD Balance</h3>
            </div>
            <div className="text-2xl font-bold font-mono text-white flex-1">
              {wallet.balance.toFixed(2)} <span className="text-xs text-amber-500">WGOLD</span>
              {wgoldPriceUsd !== null && (
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
                {wgoldPriceUsd !== null && <span className="text-xs text-slate-400 font-mono">${wgoldPriceUsd.toFixed(2)}/g</span>}
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

          <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-slate-200">Ritual Bond NFT</h3>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <div className={`text-lg font-bold ${tierColors[bond.tier]}`}>
                  {bond.tier} Tier
                </div>
                <div className="text-xs text-slate-400 mt-1">Score: {bond.ritual_score.toFixed(2)}</div>
              </div>
              <div className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-md text-xs font-bold font-mono">
                {bond.multiplier.toFixed(1)}x
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-4 rounded-xl relative group">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200">Proof-of-Life</h3>
              </div>
              <span className={`flex h-2 w-2 rounded-full ${will.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`}></span>
            </div>
            <div className="text-xs text-slate-300 mb-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className={will.status === 'ACTIVE' ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>{will.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Synced:</span>
                <span className="font-mono text-[10px]">{formatTimestamp(will.last_heartbeat)}</span>
              </div>
            </div>
            <button
              onClick={handleHeartbeat}
              disabled={heartbeatSending}
              className={`w-full py-1.5 rounded-lg text-xs font-medium flex justify-center items-center gap-2 transition-all ${
                heartbeatSending
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              <HeartPulse className={`w-3.5 h-3.5 ${heartbeatSending ? 'animate-ping' : ''}`} />
              {heartbeatSending ? 'Syncing...' : 'Sync Biometrics'}
            </button>
          </div>

          <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-200">AI Sentient Policy</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded">
                <span className="text-slate-400">Current Tax:</span>
                <span className="text-rose-400 font-mono">{(policy.current_tax_rate * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded">
                <span className="text-slate-400">Base Manna/Day:</span>
                <span className="text-amber-400 font-mono">{policy.current_base_manna.toFixed(2)} WGOLD</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded">
                <span className="text-slate-400">Pool Size:</span>
                <span className="text-cyan-400 font-mono">{policy.daily_manna_pool.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded">
                <span className="text-slate-400">Last Tick:</span>
                <span className="text-slate-300 font-mono text-[10px]">{formatTimestamp(policy.last_tick_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          Social Standing Oracle
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Community Tier</div>
            <div className="mt-2 text-xl font-semibold text-white">{socialStanding.tier}</div>
            <div className="mt-1 text-sm text-amber-400 font-mono">
              {(socialStanding.reputation_bps / 100).toFixed(2)} / 100
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Daily Emission Multiplier</div>
            <div className="mt-2 text-xl font-semibold text-emerald-400 font-mono">
              {(socialStanding.daily_manna_multiplier_bps / 10000).toFixed(2)}x
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Governance weight {(socialStanding.governance_weight_bps / 10000).toFixed(2)}x
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Network Reach</div>
            <div className="mt-2 text-xl font-semibold text-white">{socialStanding.distinct_peers} peers</div>
            <div className="mt-1 text-xs text-slate-400">
              {socialStanding.reciprocal_peers} reciprocal / {socialStanding.total_interactions} interactions
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Inbound Trust Signal</div>
            <div className="mt-2 text-xl font-semibold text-cyan-400">
              {(socialStanding.inbound_rapport_avg * 100).toFixed(0)}%
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Sentiment {(socialStanding.inbound_sentiment_avg * 100).toFixed(0)}% / updated {formatTimestamp(socialStanding.last_calculated_at)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Covenant Attestation
          </h3>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Status</span>
              <span className={`text-xs font-medium ${policySummary.attestation_status.active ? 'text-emerald-400' : 'text-rose-400'}`}>
                {policySummary.attestation_status.active ? 'Attested' : 'Not Attested'}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {policySummary.attestation_status.count} active covenant attestation{policySummary.attestation_status.count === 1 ? '' : 's'}.
            </div>
          </div>
          <div className="space-y-3">
            {attestations.length === 0 ? (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
                No active covenant attestation is available for policy-gated actions.
              </div>
            ) : attestations.map((attestation) => (
              <div key={attestation.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">{attestation.covenant_name || 'Unnamed Covenant'}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{attestation.attestation_type}</div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${attestation.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                    {attestation.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500">Covenant Key</span>
                    <div className="mt-1 font-mono text-slate-300">{attestation.covenant_key.slice(0, 14)}...</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Expires</span>
                    <div className="mt-1 text-slate-300">{formatTimestamp(attestation.expires_at)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Policy Limits
          </h3>
          <div className="space-y-3">
            {([
              ['Mint', policySummary.actions.mint],
              ['Withdraw', policySummary.actions.withdraw],
              ['Bridge', policySummary.actions.bridge],
            ] as const).map(([label, action]) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-white">{label}</div>
                  <div className="text-sm font-mono text-amber-400">
                    {action.effective_limit.toFixed(2)} WGOLD
                  </div>
                </div>
                <div className={`mt-2 text-xs ${action.allowed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {action.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
              {covenants.map((cov) => {
                const actionBusy = activeCovenantAction?.endsWith(cov.id) ?? false;
                return (
                  <div key={cov.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-indigo-500/30 transition-colors space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-200">{cov.name}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                          <span>{cov.members} Members</span>
                          <span>Quorum: {cov.quorum} Alive</span>
                          <span>Pending: {cov.pending_withdrawals}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-amber-500">
                          {cov.total_vault.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs">WGOLD</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={covenantAmounts[cov.id] ?? ''}
                        onChange={(event) => setCovenantAmounts((current) => ({ ...current, [cov.id]: event.target.value }))}
                        placeholder="Amount"
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                      />
                      <button
                        onClick={() => void handleCovenantAction(cov.id, 'deposit')}
                        disabled={actionBusy}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        Deposit
                      </button>
                      <button
                        onClick={() => void handleCovenantAction(cov.id, 'withdraw')}
                        disabled={actionBusy}
                        className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50 flex items-center gap-1"
                      >
                        Request Withdrawal <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            WGOLD Ledger
          </h3>
          {ledger.length === 0 ? (
            <div className="text-center p-6 bg-slate-950 rounded-xl border border-slate-800/50">
              <p className="text-sm text-slate-400">No WiseGold activity recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
              {ledger.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">{formatEntryType(entry.entry_type)}</div>
                      <div className="text-xs text-slate-400 mt-1">{entry.description}</div>
                      {entry.covenant_name && (
                        <div className="text-[11px] text-indigo-300 mt-1">{entry.covenant_name}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-mono ${entry.direction === 'debit' ? 'text-rose-400' : entry.direction === 'credit' ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {entry.direction === 'debit' ? '-' : entry.direction === 'credit' ? '+' : ''}{entry.amount.toFixed(2)} WGOLD
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">{entry.status}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{formatTimestamp(entry.created_at)}</span>
                    <span>
                      Balance After:{' '}
                      {entry.balance_after !== null ? entry.balance_after.toFixed(2) : 'n/a'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-center">
        <div className="text-center opacity-70">
          <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-slate-300 font-medium">Policy Telemetry</h4>
          <p className="text-xs text-slate-500 mt-1">
            24h velocity: {policy.last_tick_velocity.toLocaleString(undefined, { maximumFractionDigits: 2 })} WGOLD
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Gold delta: {policy.last_gold_delta >= 0 ? '+' : ''}{policy.last_gold_delta.toFixed(2)} / stress {policy.stress_level.toFixed(1)}
          </p>
        </div>
      </div>

      <CrossChainBridgeModal
        isOpen={isBridgeModalOpen}
        onClose={() => setIsBridgeModalOpen(false)}
        currentBalance={wallet.balance}
        maxBridgeLimit={policySummary.limits.bridge}
        onSuccess={() => {
          void loadWiseGoldData();
        }}
      />
    </div>
  );
}
