import { useEffect, useState } from 'react';
import {
    AlertTriangle,
    Beaker,
    Brain,
    ChevronDown,
    ChevronUp,
    Eye,
    Gavel,
    Lock,
    Scale,
    Shield,
    XCircle,
    Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiClient } from '../../lib/api-client';
import { requestBackendJson } from '../../lib/backend-request';
import { getCapability, getRuntimeReadiness, type RuntimeCapability } from '../../lib/runtime-readiness';

interface Proposal {
    id: string;
    title: string;
    description: string;
    rationale: string;
    type: 'experiment' | 'protocol' | 'alert';
    status: 'pending' | 'ratified' | 'vetoed' | 'executed';
    priority: number;
    confidence_score: number;
    parameters: unknown;
    created_at: string;
}

interface DriftScanResponse {
    status?: string;
    message?: string;
}

interface ProposalsResponse {
    proposals?: Proposal[];
}

interface GovernanceViewProps {
    biometricsReady?: boolean;
    biometricNotice?: string | null;
}

export default function GovernanceView({
    biometricsReady = true,
    biometricNotice = null,
}: GovernanceViewProps) {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [governanceCapability, setGovernanceCapability] = useState<RuntimeCapability | null>(null);

    useEffect(() => {
        void fetchProposals();
    }, [biometricsReady]);

    async function fetchProposals(options?: { preserveNotice?: boolean }) {
        try {
            setLoading(true);
            if (!options?.preserveNotice) {
                setNotice(null);
            }

            const readiness = await getRuntimeReadiness();
            const capability = getCapability(readiness, 'raphael.governance');
            setGovernanceCapability(capability);
            if (capability?.blocking) {
                setProposals([]);
                setError(capability.reason || 'Raphael governance is temporarily unavailable until runtime dependencies recover.');
                return;
            }

            if (!biometricsReady) {
                setProposals([]);
                setError(null);
                return;
            }

            const headers = await apiClient.getAuthHeaders({
                'Bypass-Tunnel-Reminder': 'true',
            });
            const data = await requestBackendJson<ProposalsResponse>(
                '/governance/proposals',
                { headers },
                'Failed to load governance proposals.',
            );
            setProposals(data.proposals || []);
            setError(null);
        } catch (nextError) {
            console.error('Failed to fetch proposals:', nextError);
            setProposals([]);
            setError('Failed to load governance proposals.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function handleAction(id: string, action: 'ratify' | 'veto') {
        if (governanceCapability?.blocking) {
            setError(governanceCapability.reason || 'Raphael governance is temporarily unavailable until runtime dependencies recover.');
            return;
        }
        try {
            const headers = await apiClient.getAuthHeaders({
                'Bypass-Tunnel-Reminder': 'true',
            });
            await requestBackendJson(
                `/governance/proposals/${id}/${action}`,
                {
                    method: 'POST',
                    headers,
                },
                `Failed to ${action} proposal.`,
            );

            await fetchProposals();
        } catch (nextError) {
            console.error(`Failed to ${action} proposal:`, nextError);
            setError(`Failed to ${action} proposal.`);
        }
    }

    async function triggerCheck() {
        if (governanceCapability?.blocking) {
            setError(governanceCapability.reason || 'Raphael governance is temporarily unavailable until runtime dependencies recover.');
            return;
        }
        if (!biometricsReady) {
            setError(null);
            setNotice(biometricNotice || 'Raphael governance drift scans unlock after live biometric sync completes.');
            return;
        }
        try {
            setRefreshing(true);
            setError(null);
            setNotice(null);
            const headers = await apiClient.getAuthHeaders({
                'Bypass-Tunnel-Reminder': 'true',
            });
            const data = await requestBackendJson<DriftScanResponse>(
                '/governance/check-drift',
                { method: 'POST', headers },
                'Failed to run drift scan.',
            );

            setNotice(data?.message || 'Drift scan completed.');
            await fetchProposals({ preserveNotice: true });
        } catch (nextError) {
            console.error('Failed to trigger drift check:', nextError);
            setRefreshing(false);
            setError(nextError instanceof Error ? nextError.message : 'Failed to trigger drift check.');
        }
    }

    return (
        <div className="space-y-6">
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                        <Shield className="h-5 w-5 text-teal-400" />
                        Autonomous Governance
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">St. Raphael's executive oversight and protocol enforcement.</p>
                </div>
                <button
                    onClick={triggerCheck}
                    disabled={loading || refreshing || Boolean(governanceCapability?.blocking) || !biometricsReady}
                    title={!biometricsReady ? 'Drift scans unlock after Raphael receives live biometric data.' : undefined}
                    className="group flex items-center gap-2 rounded-xl border border-teal-500/20 bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-400 shadow-lg shadow-teal-500/5 transition-all hover:bg-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Zap className="h-4 w-4 transition-transform group-hover:scale-110" />
                    {refreshing ? 'Scanning...' : 'Scan for Drift'}
                </button>
            </div>

            {!biometricsReady && (
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
                    {biometricNotice || 'Raphael governance drift scans unlock after live biometric sync completes.'}
                </div>
            )}

            {notice && !error && (
                <div className="rounded-2xl border border-teal-500/20 bg-teal-500/10 px-4 py-3 text-sm text-teal-200">
                    {notice}
                </div>
            )}

            {error && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="p-12 text-center italic text-slate-500">Accessing Akashic Records...</div>
            ) : governanceCapability?.blocking ? (
                <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-rose-500/20 bg-white/[0.02] p-12">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-300">
                        <Lock className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                        <p className="font-medium text-rose-200">Governance blocked</p>
                        <p className="mt-1 text-sm text-slate-400">{governanceCapability.reason || 'Raphael governance is temporarily unavailable.'}</p>
                    </div>
                </div>
            ) : !biometricsReady ? (
                <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-cyan-500/20 bg-white/[0.02] p-12">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300">
                        <Eye className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                        <p className="font-medium text-cyan-100">Waiting for biometric sync</p>
                        <p className="mt-1 text-sm text-slate-400">Raphael will enable governance drift scans after live health data arrives.</p>
                    </div>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-rose-500/20 bg-white/[0.02] p-12">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-300">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                        <p className="font-medium text-rose-200">Governance data is unavailable</p>
                        <p className="mt-1 text-sm text-slate-400">{error}</p>
                    </div>
                </div>
            ) : proposals.length === 0 ? (
                <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-12">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-500/10 text-slate-500">
                        <Scale className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                        <p className="font-medium text-slate-300">No Pending Proposals</p>
                        <p className="mt-1 text-sm text-slate-500">St. Raphael reports 100% protocol compliance.</p>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4">
                    {proposals.map((proposal) => (
                        <ProposalCard
                            key={proposal.id}
                            proposal={proposal}
                            isExpanded={expandedProposal === proposal.id}
                            onToggle={() => setExpandedProposal(expandedProposal === proposal.id ? null : proposal.id)}
                            onAction={handleAction}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function ProposalCard({
    proposal,
    isExpanded,
    onToggle,
    onAction,
}: {
    proposal: Proposal;
    isExpanded: boolean;
    onToggle: () => void;
    onAction: (id: string, action: 'ratify' | 'veto') => void;
}) {
    const isPending = proposal.status === 'pending';

    return (
        <div
            className={`
            overflow-hidden rounded-3xl border transition-all duration-300
            ${isExpanded ? 'border-white/20 bg-white/[0.05]' : 'border-white/5 bg-white/[0.02] hover:border-white/10'}
        `}
        >
            <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                        <div
                            className={`
                            flex h-12 w-12 items-center justify-center rounded-2xl
                            ${proposal.type === 'experiment' ? 'bg-amber-500/10 text-amber-400' : 'bg-teal-500/10 text-teal-400'}
                        `}
                        >
                            {proposal.type === 'experiment' ? <Beaker className="h-6 w-6" /> : <Gavel className="h-6 w-6" />}
                        </div>
                        <div>
                            <div className="mb-1 flex items-center gap-2">
                                <span
                                    className={`
                                    rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                                    ${proposal.priority === 1 ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}
                                `}
                                >
                                    Priority {proposal.priority}
                                </span>
                                <span className="font-mono text-[10px] text-slate-500">
                                    {new Date(proposal.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-white">{proposal.title}</h3>
                            <p className="line-clamp-1 text-sm text-slate-400">{proposal.description}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isPending ? (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onAction(proposal.id, 'veto');
                                    }}
                                    className="rounded-xl bg-red-500/10 p-2 text-red-400 transition-all hover:bg-red-500/20"
                                >
                                    <XCircle className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onAction(proposal.id, 'ratify');
                                    }}
                                    className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition-all hover:scale-105"
                                >
                                    Ratify
                                </button>
                            </div>
                        ) : (
                            <div
                                className={`
                                rounded-xl border px-4 py-1.5 text-xs font-bold uppercase
                                ${proposal.status === 'ratified' ? 'border-teal-500/30 bg-teal-500/5 text-teal-400' : 'border-slate-500/30 bg-slate-500/5 text-slate-400'}
                            `}
                            >
                                {proposal.status}
                            </div>
                        )}
                        <button
                            onClick={onToggle}
                            className="rounded-xl bg-white/5 p-2 text-slate-400 transition-all hover:text-white"
                        >
                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-6 grid grid-cols-1 gap-8 border-t border-white/10 pt-6 md:grid-cols-2">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Detailed Description</h4>
                                        <p className="text-sm leading-relaxed text-slate-300">{proposal.description}</p>
                                    </div>
                                    <div>
                                        <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">AI Rationale</h4>
                                        <div className="flex gap-3 rounded-xl border border-teal-500/10 bg-teal-500/5 p-3">
                                            <Brain className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                                            <p className="text-xs italic leading-relaxed text-teal-400/90">{proposal.rationale}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Parameters</h4>
                                        <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                                            <pre className="whitespace-pre-wrap font-mono text-[10px] text-teal-400">
                                                {JSON.stringify(proposal.parameters, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-slate-400" />
                                            <span className="text-xs text-slate-400">Confidence Score</span>
                                        </div>
                                        <span className="text-sm font-bold text-white">{(proposal.confidence_score * 100).toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
