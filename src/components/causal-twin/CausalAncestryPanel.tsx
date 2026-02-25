import React, { useState } from 'react';
import { X, TrendingUp, AlertTriangle, CheckCircle, Lightbulb, Archive, ChevronRight, Dna } from 'lucide-react';
import ConfidenceBadge from './ConfidenceBadge';
import SafetyDisclaimer from './SafetyDisclaimer';
import type { FamilyMember } from '../../lib/joseph/genealogy';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

interface AncestryResult {
    member_name: string;
    age: number;
    projections: Record<string, any>;
    confidence: { score: number; level: string };
    risk_factors: Array<{ factor: string; impact: string; modifiable: boolean }>;
    interventions: Array<{ action: string; expected_gain: string; difficulty: string }>;
    narrative: string;
    disclaimer: string;
}

interface Props {
    member: FamilyMember;
    onClose: () => void;
}

const HORIZONS = [
    { key: '3650d', label: '10 Years', years: 10 },
    { key: '7300d', label: '20 Years', years: 20 },
    { key: '10950d', label: '30 Years', years: 30 },
];

const IMPACT_COLORS: Record<string, string> = {
    high: 'text-red-400 bg-red-500/10 border-red-500/20',
    moderate: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    positive: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    low: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

const DIFFICULTY_COLORS: Record<string, string> = {
    low: 'text-emerald-400',
    medium: 'text-amber-400',
    high: 'text-red-400',
};

export default function CausalAncestryPanel({ member, onClose }: Props) {
    const [result, setResult] = useState<AncestryResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedHorizon, setSelectedHorizon] = useState('3650d');
    const [archived, setArchived] = useState(false);
    const [error, setError] = useState('');

    const birthYear = member.birthDate
        ? new Date(member.birthDate).getFullYear()
        : undefined;

    const traits: string[] = member.aiPersonality?.traits || [];

    async function loadPrediction() {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/v1/causal-twin/ancestry/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    member_id: member.id,
                    first_name: member.firstName,
                    last_name: member.lastName,
                    traits,
                    birth_year: birthYear,
                    occupation: member.occupation,
                    generation: member.generation,
                }),
            });
            if (!res.ok) throw new Error('Prediction failed');
            const data = await res.json();
            setResult(data);
        } catch (e) {
            setError('Could not load prediction. Backend may be offline.');
        }
        setLoading(false);
    }

    async function archiveToLegacy() {
        if (!result) return;
        // Record in evidence ledger
        await fetch(`${API_BASE}/api/v1/causal-twin/evidence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recommendation_text: `Causal Ancestry Trajectory for ${result.member_name}: ${result.narrative}`,
                data_sources: ['causal_ancestry', `family_member:${member.id}`],
                confidence: result.confidence?.score || 50,
                evidence_type: 'population_prior',
            }),
        }).catch(() => { });
        setArchived(true);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#0f0f18] border border-white/8 shadow-[0_32px_80px_rgba(0,0,0,0.8)]">

                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-br from-[#1a1a24] to-[#0f0f18] border-b border-white/5 p-6 flex items-center justify-between backdrop-blur-xl z-10 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                            <Dna className="w-6 h-6 text-teal-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{member.firstName} {member.lastName}</h2>
                            <p className="text-xs text-slate-500">Causal Ancestry Trajectory</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <SafetyDisclaimer compact />

                    {/* Traits preview */}
                    {traits.length > 0 && (
                        <div>
                            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Traits analysed</p>
                            <div className="flex flex-wrap gap-1.5">
                                {traits.map(t => (
                                    <span key={t} className="px-2.5 py-1 rounded-lg text-xs bg-white/5 border border-white/8 text-slate-400">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Predict button */}
                    {!result && !loading && (
                        <button
                            onClick={loadPrediction}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500/20 to-cyan-500/20 hover:from-teal-500/30 hover:to-cyan-500/30 text-teal-300 font-semibold transition-all border border-teal-500/20 flex items-center justify-center gap-2"
                        >
                            <TrendingUp className="w-5 h-5" />
                            Predict Health Trajectory
                        </button>
                    )}

                    {loading && (
                        <div className="flex items-center justify-center py-12 gap-3">
                            <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-slate-400">Simulating health future...</span>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    {result && (
                        <>
                            {/* Confidence + age */}
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="text-sm text-slate-400">Age estimate: <span className="text-white font-semibold">{result.age}</span></div>
                                <ConfidenceBadge
                                    score={result.confidence?.score || 0}
                                    level={(result.confidence?.level || 'low') as 'high' | 'moderate' | 'low'}
                                    label="Prediction confidence"
                                />
                            </div>

                            {/* Horizon selector */}
                            <div className="flex gap-2">
                                {HORIZONS.map(h => (
                                    <button
                                        key={h.key}
                                        onClick={() => setSelectedHorizon(h.key)}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${selectedHorizon === h.key
                                                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                                : 'text-slate-500 border border-transparent hover:border-white/8 hover:text-slate-300'
                                            }`}
                                    >
                                        {h.label}
                                    </button>
                                ))}
                            </div>

                            {/* Metric projections */}
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(result.projections || {}).map(([metric, horizons]: [string, any]) => {
                                    const data = horizons[selectedHorizon] || Object.values(horizons)[0] || {};
                                    return (
                                        <div key={metric} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-teal-500/15 transition-colors">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                                                {metric.replace(/_/g, ' ')}
                                            </p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-bold text-white">{data.mid ?? '—'}</span>
                                                <span className="text-xs text-slate-500">{data.unit ?? ''}</span>
                                            </div>
                                            {data.low != null && data.high != null && (
                                                <>
                                                    <div className="mt-2 h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400"
                                                            style={{ width: `${Math.min(100, Math.max(5, ((data.mid - data.low) / (data.high - data.low || 1)) * 100))}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                                                        <span>{data.low}</span>
                                                        <span>{data.high}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Risk factors */}
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                    <span className="text-sm font-semibold text-white">Risk Factors</span>
                                </div>
                                <div className="space-y-2">
                                    {result.risk_factors.map((rf, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${IMPACT_COLORS[rf.impact] || IMPACT_COLORS.low}`}>
                                                {rf.impact}
                                            </span>
                                            <span className="text-xs text-slate-300">{rf.factor}</span>
                                            {rf.modifiable && (
                                                <span className="ml-auto text-[10px] text-teal-400/70">modifiable</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Interventions */}
                            <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/10">
                                <div className="flex items-center gap-2 mb-3">
                                    <Lightbulb className="w-4 h-4 text-teal-400" />
                                    <span className="text-sm font-semibold text-white">Suggested Interventions</span>
                                </div>
                                <div className="space-y-2">
                                    {result.interventions.map((iv, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                            <ChevronRight className="w-3.5 h-3.5 text-teal-400 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs text-white">{iv.action}</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">
                                                    {iv.expected_gain} · <span className={DIFFICULTY_COLORS[iv.difficulty]}>{iv.difficulty} effort</span>
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Narrative */}
                            {result.narrative && (
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                    <p className="text-xs text-slate-400 italic leading-relaxed">"{result.narrative}"</p>
                                </div>
                            )}

                            {/* Archive */}
                            <button
                                onClick={archiveToLegacy}
                                disabled={archived}
                                className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm transition-all border ${archived
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default'
                                        : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/20'
                                    }`}
                            >
                                {archived ? <CheckCircle className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                {archived ? 'Archived to Legacy Vault' : '💾 Archive to Legacy Vault'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
