import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, GitBranch, Heart, Wallet, TrendingUp, TrendingDown, Minus,
    Dna, Users, AlertTriangle, Sparkles, ShieldAlert, Activity,
} from 'lucide-react';
import StarfieldBackground from '../components/StarfieldBackground';
import { getFamilyTreeAnalysis, type FamilyMemberVitality } from '../components/trinity/trinityApi';

type RiskLevel = FamilyMemberVitality['riskLevel'];

const RISK: Record<RiskLevel, { ring: string; chip: string; label: string }> = {
    low: { ring: '#10b981', chip: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', label: 'Low risk' },
    moderate: { ring: '#f59e0b', chip: 'bg-amber-500/10 border-amber-500/30 text-amber-300', label: 'Moderate' },
    high: { ring: '#fb923c', chip: 'bg-orange-500/10 border-orange-500/30 text-orange-300', label: 'High risk' },
    critical: { ring: '#ef4444', chip: 'bg-rose-500/10 border-rose-500/30 text-rose-300', label: 'Critical' },
};

function Traj({ t }: { t: FamilyMemberVitality['trajectory'] }) {
    if (t === 'improving') return <span className="inline-flex items-center gap-1 text-emerald-300"><TrendingUp className="h-3.5 w-3.5" />improving</span>;
    if (t === 'declining') return <span className="inline-flex items-center gap-1 text-rose-300"><TrendingDown className="h-3.5 w-3.5" />declining</span>;
    return <span className="inline-flex items-center gap-1 text-slate-400"><Minus className="h-3.5 w-3.5" />stable</span>;
}

function Ring({ score, color, size = 56, deceased = false }: { score: number; color: string; size?: number; deceased?: boolean }) {
    const r = (size - 8) / 2;
    const c = 2 * Math.PI * r;
    const off = c - (Math.max(0, Math.min(100, score)) / 100) * c;
    return (
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} stroke="#1e293b" strokeWidth="4" fill="none" />
                {!deceased && <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} className="transition-all duration-1000" />}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white">{deceased ? '🕊' : score}</span>
            </div>
        </div>
    );
}

export default function FamilyIntelligence() {
    const navigate = useNavigate();
    const analysis = useMemo(() => getFamilyTreeAnalysis(), []);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const living = analysis.members.filter((m) => !m.deceased);
    const selected = analysis.members.find((m) => m.id === selectedId) || null;
    const score = analysis.vitalityScore;
    const scoreColor = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';
    const circ = 2 * Math.PI * 64;

    const memberSignals = selected
        ? analysis.hereditary.signals.filter((s: any) => (s.affected_members || []).some((m: any) => m.id === selected.id))
        : [];
    const elderRecord = selected
        ? (analysis.elderCare.elder_members || []).find((e: any) => e.member_id === selected.id)
        : null;

    return (
        <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#070b11] text-slate-200">
            <StarfieldBackground density={0.6} />
            <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
                {/* Header */}
                <div className="mb-6 flex items-center gap-3 sm:gap-4">
                    <button onClick={() => navigate('/family-dashboard')} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/5 bg-slate-900/50 transition hover:bg-slate-900" aria-label="Back to family">
                        <ArrowLeft className="h-5 w-5 text-slate-400" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="flex items-center gap-2 text-xl font-light tracking-tight text-white sm:text-2xl">
                            <Sparkles className="h-5 w-5 text-amber-300" /> Family Intelligence
                        </h1>
                        <p className="text-xs text-slate-500 sm:text-sm">Trinity interlacing St. Joseph, St. Raphael &amp; St. Gabriel — the whole family, analyzed.</p>
                    </div>
                </div>

                {/* Family vitality header */}
                <div className="mb-6 rounded-3xl border border-white/5 bg-gradient-to-br from-[#11131c] to-[#0c0e15] p-5 sm:p-7">
                    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
                        <div className="relative h-40 w-40 flex-shrink-0">
                            <svg className="h-full w-full -rotate-90" viewBox="0 0 150 150">
                                <circle cx="75" cy="75" r="64" stroke="#1e293b" strokeWidth="11" fill="none" />
                                <circle cx="75" cy="75" r="64" stroke={scoreColor} strokeWidth="11" fill="none" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ} className="transition-all duration-1000" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-bold text-white">{score}</span>
                                <span className="text-[10px] uppercase tracking-widest text-slate-500">Family Vitality</span>
                            </div>
                        </div>
                        <div className="w-full flex-1 space-y-3">
                            {[
                                { key: 'joseph', icon: GitBranch, color: '#f59e0b' },
                                { key: 'raphael', icon: Heart, color: '#14b8a6' },
                                { key: 'gabriel', icon: Wallet, color: '#10b981' },
                            ].map(({ key, icon: Icon, color }) => {
                                const b: any = (analysis.breakdown as any)[key] || { label: key, score: 0, weight: 0 };
                                return (
                                    <div key={key}>
                                        <div className="mb-1 flex items-center justify-between">
                                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-300"><Icon className="h-3.5 w-3.5" style={{ color }} />{b.label}</span>
                                            <span className="text-xs font-medium text-white">{Math.round(b.score)}/100 <span className="text-slate-600">({b.weight}%)</span></span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${b.score}%`, backgroundColor: color }} />
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                                <div><p className="text-sm font-semibold text-white">{living.length}</p><p className="text-[9px] uppercase tracking-wider text-slate-500">Living kin</p></div>
                                <div><p className="text-sm font-semibold text-white">{analysis.insights.condition_density}</p><p className="text-[9px] uppercase tracking-wider text-slate-500">Conditions / person</p></div>
                                <div><p className="text-sm font-semibold text-white">{analysis.insights.emergency_months}mo</p><p className="text-[9px] uppercase tracking-wider text-slate-500">Care runway</p></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Per-member vitality grid */}
                <div className="mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-cyan-300" /><h2 className="text-sm font-semibold text-white">Each member — tap to analyze</h2></div>
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {analysis.members.map((m) => {
                        const rc = RISK[m.riskLevel];
                        const active = m.id === selectedId;
                        return (
                            <button key={m.id} onClick={() => setSelectedId(active ? null : m.id)}
                                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-white/5 bg-slate-900/40 hover:border-white/15'}`}>
                                <Ring score={m.wellnessScore} color={rc.ring} deceased={m.deceased} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-white">{m.name}</p>
                                    <p className="text-[11px] text-slate-400">{m.deceased ? 'In remembrance' : `${m.age} yrs · `}{!m.deceased && <Traj t={m.trajectory} />}</p>
                                    {!m.deceased && <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider ${rc.chip}`}>{rc.label}</span>}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Per-member "analyze everything" drill-in */}
                {selected && !selected.deceased && (
                    <div className="mb-6 rounded-3xl border border-cyan-400/20 bg-cyan-500/[0.04] p-5 sm:p-6">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h3 className="flex items-center gap-2 text-base font-semibold text-white"><Activity className="h-4 w-4 text-cyan-300" />{selected.name} — full readout</h3>
                            <button onClick={() => setSelectedId(null)} className="text-xs text-slate-500 hover:text-slate-300">Close</button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {[
                                { label: 'Wellness', value: `${selected.wellnessScore}/100` },
                                { label: 'Risk', value: `${selected.riskScore}/100` },
                                { label: 'Trajectory', value: selected.trajectory },
                                { label: 'Age', value: `${selected.age}` },
                            ].map((s) => (
                                <div key={s.label} className="rounded-xl border border-white/8 bg-black/20 p-3">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-500">{s.label}</p>
                                    <p className="mt-1 text-sm font-semibold capitalize text-white">{s.value}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-500">Watch areas (St. Raphael)</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selected.conditions.length > 0 ? selected.conditions.map((c) => (
                                    <span key={c} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200">{c}</span>
                                )) : <span className="text-xs text-slate-500">No flagged conditions — preventive cadence.</span>}
                            </div>
                        </div>
                        {memberSignals.length > 0 && (
                            <div className="mt-4">
                                <p className="text-[10px] uppercase tracking-widest text-slate-500">Hereditary patterns they share (St. Joseph)</p>
                                <ul className="mt-2 space-y-1.5">
                                    {memberSignals.map((s: any) => (
                                        <li key={s.condition} className="flex items-start gap-2 text-xs text-slate-300"><Dna className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-purple-300" />{s.condition} — {s.pattern} ({s.confidence_label} confidence)</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {elderRecord && (
                            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-200"><Wallet className="h-3.5 w-3.5" />Elder care (St. Gabriel)</p>
                                <p className="mt-1 text-xs text-slate-300">{elderRecord.care_type} care · ${Math.round(elderRecord.estimated_monthly_cost).toLocaleString()}/mo est. · coverage <span className="capitalize">{String(elderRecord.coverage_status)}</span></p>
                            </div>
                        )}
                    </div>
                )}

                {/* Hereditary signals (family-wide) */}
                {analysis.hereditary.signals.length > 0 && (
                    <div className="mb-6 rounded-3xl border border-purple-400/15 bg-purple-500/[0.04] p-5 sm:p-6">
                        <div className="mb-1 flex items-center gap-2"><Dna className="h-4 w-4 text-purple-300" /><h2 className="text-sm font-semibold text-white">Hereditary patterns across generations</h2></div>
                        <p className="mb-4 text-[11px] text-slate-500">{analysis.hereditary.disclaimer}</p>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {analysis.hereditary.signals.map((s: any) => (
                                <div key={s.condition} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-white">{s.condition}</p>
                                        <span className="rounded-full border border-purple-400/25 bg-purple-400/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-purple-200">{s.confidence_label}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-purple-200/80">{s.pattern} · {s.generations_covered} generation{s.generations_covered === 1 ? '' : 's'}</p>
                                    <p className="mt-2 text-xs text-slate-400">{s.explanation}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Elder care */}
                {analysis.elderCare.total_elders > 0 && (
                    <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-5 sm:p-6">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-300" /><h2 className="text-sm font-semibold text-white">Elder-care readiness</h2></div>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${analysis.elderCare.family_coverage_gap > 0 ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
                                {analysis.elderCare.family_coverage_gap > 0 ? `$${Math.round(analysis.elderCare.family_coverage_gap).toLocaleString()}/mo gap` : 'Covered'}
                            </span>
                        </div>
                        <div className="space-y-2">
                            {(analysis.elderCare.elder_members || []).map((e: any) => (
                                <div key={e.member_id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 p-3">
                                    <div className="min-w-0"><p className="truncate text-sm text-white">{e.name}</p><p className="text-[11px] text-slate-500">{e.age} yrs · {e.care_type} care</p></div>
                                    <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider ${e.coverage_status === 'funded' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : e.coverage_status === 'underfunded' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>{e.coverage_status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[10px] text-slate-600"><AlertTriangle className="h-3 w-3" />Family-pattern inferences from your genealogy + health model — not medical or genetic diagnosis.</p>
            </div>
        </div>
    );
}
