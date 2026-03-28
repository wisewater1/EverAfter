import React, { useState, useEffect } from 'react';
import {
    Shield, Scale, Zap, CheckCircle2, XCircle,
    AlertTriangle, Info, ArrowRight, Gavel,
    ChevronDown, ChevronUp, Lock, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildApiUrl } from '../../lib/env';
import { apiClient } from '../../lib/api-client';
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
    parameters: any;
    created_at: string;
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
    const [governanceCapability, setGovernanceCapability] = useState<RuntimeCapability | null>(null);

    useEffect(() => {
        fetchProposals();
    }, []);

    async function fetchProposals() {
        try {
            const readiness = await getRuntimeReadiness();
            const capability = getCapability(readiness, 'raphael.governance');
            setGovernanceCapability(capability);
            if (capability?.blocking) {
                setProposals([]);
                setError(capability.reason || 'Raphael governance is temporarily unavailable until runtime dependencies recover.');
                return;
            }

            const headers = await apiClient.getAuthHeaders({
                'Bypass-Tunnel-Reminder': 'true',
            });
            const response = await fetch(buildApiUrl('/governance/proposals'), { headers });
            if (response.ok) {
                const data = await response.json();
                setProposals(data.proposals || []);
                setError(null);
            } else {
                const data = await response.json().catch(() => ({}));
                setError(data?.detail || `Failed to load governance proposals (${response.status}).`);
            }
        } catch (error) {
            console.error('Failed to fetch proposals:', error);
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
            const response = await fetch(buildApiUrl(`/governance/proposals/${id}/${action}`), {
                method: 'POST',
                headers,
            });
            if (response.ok) {
                fetchProposals();
            } else {
                const data = await response.json().catch(() => ({}));
                setError(data?.detail || `Failed to ${action} proposal.`);
            }
        } catch (error) {
            console.error(`Failed to ${action} proposal:`, error);
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
            return;
        }
        try {
            setRefreshing(true);
            setError(null);
            const headers = await apiClient.getAuthHeaders({
                'Bypass-Tunnel-Reminder': 'true',
            });
            const response = await fetch(buildApiUrl('/governance/check-drift'), { method: 'POST', headers });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.detail || `Failed to run drift scan (${response.status}).`);
            }
            fetchProposals();
        } catch (error) {
            console.error('Failed to trigger drift check:', error);
            setRefreshing(false);
            setError(error instanceof Error ? error.message : 'Failed to trigger drift check.');
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-teal-400" />
                        Autonomous Governance
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">St. Raphael's executive oversight and protocol enforcement.</p>
                </div>
                <button
                    onClick={triggerCheck}
                    disabled={refreshing || Boolean(governanceCapability?.blocking) || !biometricsReady}
                    title={!biometricsReady ? 'Drift scans unlock after Raphael receives live biometric data.' : undefined}
                    className="px-4 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm font-medium hover:bg-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-teal-500/5 group"
                >
                    <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    {refreshing ? 'Scanning…' : 'Scan for Drift'}
                </button>
            </div>

            {!biometricsReady && (
                <div className="px-4 py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-200">
                    {biometricNotice || 'Raphael governance drift scans unlock after live biometric sync completes.'}
                </div>
            )}

            {error && (
                <div className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="p-12 text-center text-slate-500 italic">Accessing Akashic Records...</div>
            ) : governanceCapability?.blocking ? (
                <div className="p-12 rounded-3xl bg-white/[0.02] border border-dashed border-rose-500/20 flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-300">
                        <Lock className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                        <p className="text-rose-200 font-medium">Governance blocked</p>
                        <p className="text-slate-400 text-sm mt-1">{governanceCapability.reason || 'Raphael governance is temporarily unavailable.'}</p>
                    </div>
                </div>
            ) : proposals.length === 0 && !biometricsReady ? (
                <div className="p-12 rounded-3xl bg-white/[0.02] border border-dashed border-cyan-500/20 flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-300">
                        <Eye className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                        <p className="text-cyan-100 font-medium">Waiting for biometric sync</p>
                        <p className="text-slate-400 text-sm mt-1">Raphael will enable governance drift scans after live health data arrives.</p>
                    </div>
                </div>
            ) : proposals.length === 0 ? (
                <div className="p-12 rounded-3xl bg-white/[0.02] border border-dashed border-white/10 flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-500">
                        <Scale className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                        <p className="text-slate-300 font-medium">No Pending Proposals</p>
                        <p className="text-slate-500 text-sm mt-1">St. Raphael reports 100% protocol compliance.</p>
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

function ProposalCard({ proposal, isExpanded, onToggle, onAction }: {
    proposal: Proposal,
    isExpanded: boolean,
    onToggle: () => void,
    onAction: (id: string, action: 'ratify' | 'veto') => void
}) {
    const isPending = proposal.status === 'pending';

    return (
        <div className={`
            rounded-3xl border transition-all duration-300 overflow-hidden
            ${isExpanded ? 'bg-white/[0.05] border-white/20' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}
        `}>
            <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                        <div className={`
                            w-12 h-12 rounded-2x flex items-center justify-center
                            ${proposal.type === 'experiment' ? 'bg-amber-500/10 text-amber-400' : 'bg-teal-500/10 text-teal-400'}
                        `}>
                            {proposal.type === 'experiment' ? <Beaker className="w-6 h-6" /> : <Gavel className="w-6 h-6" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`
                                    px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                                    ${proposal.priority === 1 ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}
                                `}>
                                    Priority {proposal.priority}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                    {new Date(proposal.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-white">{proposal.title}</h3>
                            <p className="text-slate-400 text-sm line-clamp-1">{proposal.description}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isPending ? (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAction(proposal.id, 'veto'); }}
                                    className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAction(proposal.id, 'ratify'); }}
                                    className="px-4 py-2 rounded-xl bg-teal-500 text-white text-sm font-bold shadow-lg shadow-teal-500/20 hover:scale-105 transition-all"
                                >
                                    Ratify
                                </button>
                            </div>
                        ) : (
                            <div className={`
                                px-4 py-1.5 rounded-xl border text-xs font-bold uppercase
                                ${proposal.status === 'ratified' ? 'border-teal-500/30 text-teal-400 bg-teal-500/5' : 'border-slate-500/30 text-slate-400 bg-slate-500/5'}
                            `}>
                                {proposal.status}
                            </div>
                        )}
                        <button
                            onClick={onToggle}
                            className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all"
                        >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
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
                            <div className="pt-6 mt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Detailed Description</h4>
                                        <p className="text-slate-300 text-sm leading-relaxed">{proposal.description}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">AI Rationale</h4>
                                        <div className="p-3 rounded-xl bg-teal-500/5 border border-teal-500/10 flex gap-3">
                                            <Brain className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                                            <p className="text-teal-400/90 text-xs italic leading-relaxed">{proposal.rationale}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Parameters</h4>
                                        <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                                            <pre className="text-[10px] text-teal-400 font-mono whitespace-pre-wrap">
                                                {JSON.stringify(proposal.parameters, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-slate-400" />
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

// Re-using Beaker from lucide-react (ensure it's imported at top)
import { Beaker } from 'lucide-react';
