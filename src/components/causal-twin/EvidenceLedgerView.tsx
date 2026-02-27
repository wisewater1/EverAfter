import React, { useState, useEffect } from 'react';
import { FileText, Search, ChevronRight, Clock, Database, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import ConfidenceBadge from './ConfidenceBadge';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const EVIDENCE_ICONS: Record<string, React.ReactNode> = {
    causal_trial: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
    strong_correlation: <Shield className="w-3.5 h-3.5 text-teal-400" />,
    weak_correlation: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
    population_prior: <Database className="w-3.5 h-3.5 text-blue-400" />,
    clinician_entered: <Shield className="w-3.5 h-3.5 text-purple-400" />,
};

export default function EvidenceLedgerView({ memberId }: { memberId?: string }) {
    const [entries, setEntries] = useState<any[]>([]);
    const [quality, setQuality] = useState<any>(null);
    const [selectedEntry, setSelectedEntry] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadEvidence(); }, []);

    async function loadEvidence() {
        setLoading(true);
        try {
            const params = memberId ? `?member_id=${memberId}` : '';
            const res = await fetch(`${API_BASE}/api/v1/causal-twin/evidence${params}`);
            const data = await res.json();
            setEntries(data.entries || []);
            setQuality(data.quality_trend || null);
        } catch (e) { console.error(e); }
        setLoading(false);
    }

    async function loadDetail(id: string) {
        try {
            const res = await fetch(`${API_BASE}/api/v1/causal-twin/evidence/${id}`);
            const data = await res.json();
            setSelectedEntry(data);
        } catch (e) { console.error(e); }
    }

    const evidenceLabels: Record<string, string> = {
        causal_trial: 'Causal Trial',
        strong_correlation: 'Strong Correlation',
        weak_correlation: 'Weak Correlation',
        population_prior: 'Population Research',
        clinician_entered: 'Clinician Input',
    };

    return (
        <div className="space-y-6">
            {/* Quality Trend */}
            {quality && quality.entries > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Recommendation Quality</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${quality.trend === 'improving' ? 'text-emerald-400 bg-emerald-500/10' :
                                quality.trend === 'declining' ? 'text-red-400 bg-red-500/10' :
                                    'text-slate-400 bg-slate-500/10'
                                }`}>
                                {quality.trend}
                            </span>
                            <span className="text-xs text-slate-600">{quality.entries} entries</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Entries / Detail split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* List */}
                <div className="lg:col-span-2 space-y-2">
                    <div className="flex items-center gap-3 mb-3">
                        <FileText className="w-5 h-5 text-teal-400" />
                        <h3 className="text-lg font-semibold text-white">Evidence Ledger</h3>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-slate-500 text-sm">Loading audit trail...</div>
                    ) : entries.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-sm text-slate-500">No recommendations recorded yet.</p>
                        </div>
                    ) : (
                        entries.map(entry => (
                            <button
                                key={entry.id}
                                onClick={() => loadDetail(entry.id)}
                                className={`w-full text-left p-4 rounded-2xl transition-all border ${selectedEntry?.id === entry.id
                                    ? 'bg-teal-500/5 border-teal-500/20'
                                    : 'bg-gradient-to-br from-[#1a1a24] to-[#13131a] border-white/5 hover:border-white/10'
                                    } shadow-[4px_4px_8px_#08080c,-4px_-4px_8px_#1c1c28]`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white font-medium truncate">{entry.recommendation_text}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            {EVIDENCE_ICONS[entry.evidence_type]}
                                            <span className="text-xs text-slate-500">{evidenceLabels[entry.evidence_type]}</span>
                                            <span className="text-xs text-slate-600">•</span>
                                            <ConfidenceBadge score={entry.confidence} level={
                                                entry.confidence >= 80 ? 'high' : entry.confidence >= 50 ? 'moderate' : 'low'
                                            } showScore={false} />
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                                            <Clock className="w-3 h-3" />
                                            <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                                            <span className="text-slate-700">v{entry.model_version}</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0 mt-1" />
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Detail Panel */}
                <div className="lg:col-span-1">
                    {selectedEntry ? (
                        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-teal-500/10 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] sticky top-4">
                            <h4 className="text-sm font-semibold text-teal-300 mb-3">Why This Recommendation?</h4>
                            <p className="text-sm text-white mb-4">{selectedEntry.recommendation_text}</p>

                            <div className="space-y-3">
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Evidence Type</span>
                                    <p className="text-xs text-slate-300 mt-1">{selectedEntry.why?.evidence_explanation}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Confidence</span>
                                    <p className="text-xs text-slate-300 mt-1">{selectedEntry.confidence}%</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Data Sources</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {selectedEntry.data_sources?.map((s: string) => (
                                            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Model Version</span>
                                    <p className="text-xs text-slate-300 mt-1">{selectedEntry.model_version}</p>
                                </div>
                                {selectedEntry.why?.times_this_failed > 0 && (
                                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                                        <span className="text-[10px] text-red-400 uppercase tracking-wider">Failures</span>
                                        <p className="text-xs text-red-300 mt-1">
                                            This recommendation failed {selectedEntry.why.times_this_failed} time(s)
                                        </p>
                                    </div>
                                )}
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Reliability</span>
                                    <p className="text-xs text-slate-300 mt-1">{selectedEntry.why?.reliability_note}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 text-center">
                            <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-xs text-slate-500">Select an entry to inspect its evidence</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
