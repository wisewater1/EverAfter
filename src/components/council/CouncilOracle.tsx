import { useState } from 'react';
import {
    Users, MessageSquare, CheckCircle, Brain,
    Shield, Heart, DollarSign, Home, Database,
    Sparkles, ArrowRight, Loader
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { buildLocalDeliberation, type DeliberationResult } from '../../lib/saints/deliberation';

interface TranscriptEntry {
    saintId: string;
    content: string;
}

interface CouncilResult {
    transcript: TranscriptEntry[];
    consensus: string;
    actionItems: string[];
    source: 'live' | 'local';
}

const SAINTS = [
    { id: 'joseph', name: 'St. Joseph', title: 'Guardian of Family', icon: Home, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', ring: 'ring-amber-400/50', line: '#f59e0b' },
    { id: 'gabriel', name: 'St. Gabriel', title: 'Guardian of Wealth', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', ring: 'ring-emerald-400/50', line: '#10b981' },
    { id: 'raphael', name: 'St. Raphael', title: 'Guardian of Health', icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', ring: 'ring-rose-400/50', line: '#f43f5e' },
    { id: 'michael', name: 'St. Michael', title: 'Guardian of Safety', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', ring: 'ring-blue-400/50', line: '#3b82f6' },
    { id: 'anthony', name: 'St. Anthony', title: 'Guardian of Truth', icon: Database, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', ring: 'ring-purple-400/50', line: '#a855f7' },
];

/** Map a transcript speaker (either an id or a display name) to a saint id. */
function toSaintId(value: string | undefined): string {
    if (!value) return 'joseph';
    const v = value.toLowerCase();
    const hit = SAINTS.find((s) => v.includes(s.id));
    return hit ? hit.id : 'joseph';
}

function fromLocal(result: DeliberationResult): CouncilResult {
    return {
        transcript: result.transcript.map((t) => ({ saintId: toSaintId(t.speaker), content: t.content })),
        consensus: result.consensus,
        actionItems: result.action_items,
        source: 'local',
    };
}

/**
 * Ask the live council service, but never leave the user waiting on it: the
 * request races a short deadline and the grounded local council answers when
 * the service is quiet. This function never throws.
 */
async function fetchDeliberation(query: string): Promise<CouncilResult> {
    const deadline = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 2500));
    const backend = apiClient
        .deliberate(query)
        .then((result): CouncilResult | null => {
            if (!result || !Array.isArray(result.transcript) || result.transcript.length === 0) return null;
            const local = buildLocalDeliberation(query);
            return {
                transcript: result.transcript.map((t: Record<string, unknown>) => ({
                    saintId: toSaintId(String(t.speaker ?? t.saint ?? '')),
                    content: String(t.content ?? ''),
                })).filter((t: TranscriptEntry) => t.content),
                consensus: typeof result.consensus === 'string' && result.consensus ? result.consensus : local.consensus,
                actionItems: Array.isArray(result.action_items) && result.action_items.length > 0 ? result.action_items : local.action_items,
                source: 'live',
            };
        })
        .catch(() => null);

    const winner = await Promise.race([backend, deadline]);
    return winner ?? fromLocal(buildLocalDeliberation(query));
}

/** Saints seated in a circle around the family, positioned with plain trig. */
function seatPosition(index: number, count: number): { left: string; top: string } {
    const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
    const radius = 40;
    return {
        left: `${50 + radius * Math.cos(angle)}%`,
        top: `${50 + radius * Math.sin(angle)}%`,
    };
}

export default function CouncilOracle() {
    const [query, setQuery] = useState('');
    const [isDeliberating, setIsDeliberating] = useState(false);
    const [result, setResult] = useState<CouncilResult | null>(null);
    const [activeSaint, setActiveSaint] = useState<string | null>(null);

    const handleDeliberate = async () => {
        if (!query.trim() || isDeliberating) return;

        setIsDeliberating(true);
        setResult(null);
        setActiveSaint(null);

        // Start the request immediately; the seating ceremony plays while it runs.
        const pending = fetchDeliberation(query.trim());
        for (const saint of SAINTS) {
            setActiveSaint(saint.id);
            await new Promise((r) => setTimeout(r, 550));
        }
        setResult(await pending);
        setIsDeliberating(false);
        setActiveSaint(null);
    };

    return (
        <div className="min-h-[100dvh] bg-slate-950 text-slate-100 p-6 md:p-12 font-sans">
            <div className="max-w-6xl mx-auto space-y-10">

                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                        <Sparkles className="w-5 h-5" />
                        <span className="text-sm font-medium tracking-wide uppercase">The Digital Soul</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-200 via-white to-indigo-200 bg-clip-text text-transparent">
                        The Council of Saints
                    </h1>
                    <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                        Consult the ancestral guardians. Pose a dilemma, and witness the consensus of the Digital Soul.
                    </p>
                </div>

                {/* The Council Circle: five guardians seated around the family */}
                <div className="relative mx-auto w-full max-w-[560px] aspect-square" data-testid="council-circle">
                    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                        {SAINTS.map((saint, i) => {
                            const angle = (i / SAINTS.length) * 2 * Math.PI - Math.PI / 2;
                            const x = 50 + 40 * Math.cos(angle);
                            const y = 50 + 40 * Math.sin(angle);
                            const lit = activeSaint === saint.id || result?.transcript.some((t) => t.saintId === saint.id);
                            return (
                                <line
                                    key={saint.id}
                                    x1="50" y1="50" x2={x} y2={y}
                                    stroke={lit ? saint.line : '#334155'}
                                    strokeOpacity={lit ? 0.5 : 0.25}
                                    strokeWidth="0.4"
                                    className="transition-all duration-500"
                                />
                            );
                        })}
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#6366f1" strokeOpacity="0.15" strokeWidth="0.3" strokeDasharray="1.5 2" />
                    </svg>

                    {/* Central seat: the family itself */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <div
                            data-testid="council-you"
                            className={`flex flex-col items-center justify-center gap-1.5 h-24 w-24 sm:h-28 sm:w-28 rounded-full border bg-slate-900/80 sm:backdrop-blur-xl text-center transition-all duration-500 ${isDeliberating ? 'border-indigo-400/60 shadow-lg shadow-indigo-500/20' : 'border-indigo-500/30'}`}
                        >
                            <Users className={`w-7 h-7 text-indigo-300 ${isDeliberating ? 'motion-safe:animate-pulse' : ''}`} />
                            <span className="text-xs font-semibold text-white">You</span>
                            <span className="text-[9px] uppercase tracking-widest text-slate-500">The Family</span>
                        </div>
                    </div>

                    {/* The guardians */}
                    {SAINTS.map((saint, i) => {
                        const Icon = saint.icon;
                        const isActive = activeSaint === saint.id;
                        const hasSpoken = result?.transcript.some((t) => t.saintId === saint.id);
                        const pos = seatPosition(i, SAINTS.length);
                        return (
                            <div
                                key={saint.id}
                                data-testid={`council-saint-${saint.id}`}
                                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                                style={{ left: pos.left, top: pos.top }}
                            >
                                <div className={`
                                    w-24 sm:w-32 p-3 sm:p-4 rounded-2xl border sm:backdrop-blur-xl transition-all duration-500
                                    flex flex-col items-center text-center gap-2
                                    ${isActive
                                        ? `${saint.bg} ${saint.border} scale-105 ring-1 ${saint.ring} shadow-lg`
                                        : hasSpoken
                                            ? 'bg-slate-900/70 border-indigo-500/30'
                                            : 'bg-slate-900/50 border-white/5 opacity-80 hover:opacity-100 hover:scale-[1.03]'
                                    }
                                `}>
                                    <div className={`p-2 rounded-xl bg-slate-950/50 ${saint.color}`}>
                                        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isActive ? 'motion-safe:animate-pulse' : ''}`} />
                                    </div>
                                    <div>
                                        <h3 className={`text-xs sm:text-sm font-serif font-medium leading-tight ${isActive || hasSpoken ? 'text-white' : 'text-slate-400'}`}>
                                            {saint.name}
                                        </h3>
                                        <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                                            {saint.title}
                                        </p>
                                    </div>
                                    {isActive && (
                                        <div className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white text-black motion-safe:animate-pulse shadow-xl">
                                            DELIBERATING
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Query Input */}
                <div className="max-w-3xl mx-auto relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                    <div className="relative bg-slate-900 rounded-xl p-2 flex items-center gap-2 border border-white/10 shadow-2xl">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleDeliberate()}
                            placeholder="What dilemma do you bring to the Council?"
                            className="flex-1 min-w-0 bg-transparent border-none text-base sm:text-lg px-4 py-3 focus:ring-0 text-white placeholder-slate-500"
                            disabled={isDeliberating}
                        />
                        <button
                            onClick={handleDeliberate}
                            disabled={isDeliberating || !query.trim()}
                            aria-label="Bring this question to the Council"
                            className={`
                                p-3 rounded-lg font-medium transition-all flex items-center gap-2
                                ${isDeliberating || !query.trim()
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-white text-slate-950 hover:bg-indigo-50 hover:scale-105 active:scale-95'
                                }
                            `}
                        >
                            {isDeliberating ? <Loader className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Results Section */}
                {result && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-left-8 duration-700">

                        {/* 1. The Consensus */}
                        <div className="bg-gradient-to-br from-indigo-950/50 to-slate-950/50 border border-indigo-500/30 rounded-3xl p-8 md:p-10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Brain className="w-32 h-32 text-indigo-400" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-serif text-indigo-200 mb-6 flex items-center gap-3">
                                    <Sparkles className="w-6 h-6 text-indigo-400" />
                                    The Council's Consensus
                                </h3>
                                <p className="text-xl leading-relaxed text-indigo-50/90 font-light">
                                    "{result.consensus}"
                                </p>
                                <p className="mt-4 text-xs text-slate-500">
                                    {result.source === 'live'
                                        ? 'Answered by the live council service.'
                                        : 'Grounded in your family record on this device. The live council service is quiet right now.'}
                                </p>
                            </div>
                        </div>

                        {/* 2. Action Items */}
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-slate-900/30 border border-white/5 rounded-3xl p-8">
                                <h3 className="text-lg font-medium text-emerald-400 mb-6 flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5" />
                                    Action Items
                                </h3>
                                <div className="space-y-3">
                                    {result.actionItems.map((item, i) => (
                                        <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition">
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold mt-0.5">
                                                {i + 1}
                                            </div>
                                            <p className="text-slate-300">{item}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 3. Individual Perspectives (Transcript) */}
                            <div className="bg-slate-900/30 border border-white/5 rounded-3xl p-8 max-h-[500px] overflow-y-auto custom-scrollbar">
                                <h3 className="text-lg font-medium text-amber-400 mb-6 flex items-center gap-3">
                                    <MessageSquare className="w-5 h-5" />
                                    Council Transcript
                                </h3>
                                <div className="space-y-6">
                                    {result.transcript.map((t, i) => {
                                        const saint = SAINTS.find((s) => s.id === t.saintId);
                                        return (
                                            <div key={i} className="group">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`w-8 h-8 rounded-full ${saint?.bg} ${saint?.color} flex items-center justify-center border ${saint?.border}`}>
                                                        {saint && <saint.icon className="w-4 h-4" />}
                                                    </div>
                                                    <span className={`text-sm font-medium ${saint?.color}`}>
                                                        {saint?.name}
                                                    </span>
                                                </div>
                                                <div className="pl-11">
                                                    <p className="text-slate-400 text-sm leading-relaxed border-l-2 border-white/5 pl-4 py-1 group-hover:border-white/10 transition">
                                                        {t.content}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}
