import React, { useState } from 'react';
import axios from 'axios';
import {
    Users, MessageSquare, CheckCircle, Brain,
    Shield, Heart, DollarSign, Home, Database,
    Sparkles, ArrowRight, Loader
} from 'lucide-react';

interface TranscriptItem {
    saint: string;
    content: string;
    perspective: string;
}

interface DeliberationResponse {
    transcript: TranscriptItem[];
    consensus: string;
    action_items: string[];
    query: string;
}

const SAINTS = [
    { id: 'joseph', name: 'St. Joseph', title: 'Guardian of Family', icon: Home, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { id: 'gabriel', name: 'St. Gabriel', title: 'Guardian of Wealth', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { id: 'raphael', name: 'St. Raphael', title: 'Guardian of Health', icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    { id: 'michael', name: 'St. Michael', title: 'Guardian of Safety', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { id: 'anthony', name: 'St. Anthony', title: 'Guardian of Truth', icon: Database, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
];

export default function CouncilOracle() {
    const [query, setQuery] = useState('');
    const [isDeliberating, setIsDeliberating] = useState(false);
    const [result, setResult] = useState<DeliberationResponse | null>(null);
    const [activeSaint, setActiveSaint] = useState<string | null>(null);

    const handleDeliberate = async () => {
        if (!query.trim()) return;

        setIsDeliberating(true);
        setResult(null);
        setActiveSaint(null);

        try {
            // Simulate "thinking" sequence for visual flair
            for (const saint of SAINTS) {
                setActiveSaint(saint.id);
                await new Promise(r => setTimeout(r, 600)); // Fake delay for UX
            }

            const response = await axios.post('/api/v1/saints/council/deliberate', { query });
            setResult(response.data);
        } catch (error) {
            console.error("Deliberation failed:", error);
            // Mock error state or toast here
        } finally {
            setIsDeliberating(false);
            setActiveSaint(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans">
            <div className="max-w-6xl mx-auto space-y-12">

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

                {/* The Virtual Table */}
                <div className="relative">
                    {/* Connection Lines (Decoration) */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6 relative z-10">
                        {SAINTS.map((saint) => {
                            const Icon = saint.icon;
                            const isActive = activeSaint === saint.id;
                            const hasSpoken = result?.transcript.some(t => t.saint === saint.id);

                            return (
                                <div
                                    key={saint.id}
                                    className={`relative group transition-all duration-500 ${isActive ? 'scale-105 -translate-y-2' : 'hover:-translate-y-1'
                                        }`}
                                >
                                    <div className={`
                                        h-full p-6 rounded-2xl border backdrop-blur-xl transition-all duration-500
                                        flex flex-col items-center text-center gap-4
                                        ${isActive
                                            ? `${saint.bg} ${saint.border} shadow-lg shadow-${saint.color.split('-')[1]}-500/20 ring-1 ring-${saint.color.split('-')[1]}-400/50`
                                            : hasSpoken
                                                ? 'bg-slate-900/60 border-indigo-500/30'
                                                : 'bg-slate-900/40 border-white/5 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'
                                        }
                                    `}>
                                        <div className={`p-3 rounded-xl bg-slate-950/50 ${saint.color}`}>
                                            <Icon className={`w-8 h-8 ${isActive ? 'animate-pulse' : ''}`} />
                                        </div>
                                        <div>
                                            <h3 className={`font-serif font-medium ${isActive || hasSpoken ? 'text-white' : 'text-slate-400'}`}>
                                                {saint.name}
                                            </h3>
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                                                {saint.title}
                                            </p>
                                        </div>

                                        {isActive && (
                                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-xs font-bold px-2 py-0.5 rounded-full bg-white text-black animate-bounce shadow-xl">
                                                DELIBERATING
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
                            className="flex-1 bg-transparent border-none text-lg px-4 py-3 focus:ring-0 text-white placeholder-slate-500"
                            disabled={isDeliberating}
                        />
                        <button
                            onClick={handleDeliberate}
                            disabled={isDeliberating || !query.trim()}
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
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">

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
                                    {result.action_items.map((item, i) => (
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
                                        const saint = SAINTS.find(s => s.id === t.saint);
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
