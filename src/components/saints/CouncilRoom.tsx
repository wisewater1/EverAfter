import { useState, useRef, useEffect } from 'react';
import { Shield, Heart, Users, Search, Banknote, Brain, Sparkles, Send, Scroll, Star, Target, Activity } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import MissionBoard from './MissionBoard';

// --- Types & Constants ---

interface CouncilMember {
    id: string;
    name: string;
    role: string;
    icon: any;
    color: string;           // Text color
    glowColor: string;       // Shadow/Glow color
    gradient: string;        // Background gradient
    description: string;
}

const COUNCIL_MEMBERS: CouncilMember[] = [
    {
        id: 'michael',
        name: 'St. Michael',
        role: 'Defense & Security',
        icon: Shield,
        color: 'text-rose-400',
        glowColor: 'rgba(251, 113, 133, 0.5)',
        gradient: 'from-rose-500/20 to-orange-600/20',
        description: 'Protector against threats'
    },
    {
        id: 'raphael',
        name: 'St. Raphael',
        role: 'Health & Healing',
        icon: Heart,
        color: 'text-emerald-400',
        glowColor: 'rgba(52, 211, 153, 0.5)',
        gradient: 'from-emerald-500/20 to-teal-600/20',
        description: 'Guardian of well-being'
    },
    {
        id: 'gabriel',
        name: 'St. Gabriel',
        role: 'Communication & Finance',
        icon: Banknote,
        color: 'text-amber-400',
        glowColor: 'rgba(251, 191, 36, 0.5)',
        gradient: 'from-amber-500/20 to-yellow-600/20',
        description: 'Messenger of clarity'
    },
    {
        id: 'joseph',
        name: 'St. Joseph',
        role: 'Family & Logistics',
        icon: Users,
        color: 'text-indigo-400',
        glowColor: 'rgba(129, 140, 248, 0.5)',
        gradient: 'from-indigo-500/20 to-violet-600/20',
        description: 'Patron of the family'
    },
    {
        id: 'anthony',
        name: 'St. Anthony',
        role: 'Memory & Discovery',
        icon: Search,
        color: 'text-sky-400',
        glowColor: 'rgba(56, 189, 248, 0.5)',
        gradient: 'from-sky-500/20 to-cyan-600/20',
        description: 'Finder of lost things'
    },
];

interface TranscriptItem {
    saint: string;
    content: string;
}

interface DeliberationResult {
    transcript: TranscriptItem[];
    consensus: string;
    action_items: string[];
}

// --- Components ---

export default function CouncilRoom() {
    const [query, setQuery] = useState('');
    const [isDeliberating, setIsDeliberating] = useState(false);
    const [result, setResult] = useState<DeliberationResult | null>(null);
    const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
    const [showConsensus, setShowConsensus] = useState(false);

    // New State for Saint Runtime
    const [coordinationMode, setCoordinationMode] = useState(false);
    const [activeTab, setActiveTab] = useState<'transcript' | 'missions'>('transcript');

    const transcriptEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [result?.transcript, showConsensus]);

    const handleDeliberate = async () => {
        if (!query.trim() || isDeliberating) return;

        setIsDeliberating(true);
        setResult(null);
        setShowConsensus(false);
        setActiveSpeaker(null);

        try {
            // Summoning Sequence
            await new Promise(r => setTimeout(r, 1500));

            const data = await apiClient.deliberate(query, undefined, coordinationMode);
            const fullResult = data as DeliberationResult;

            // Initialize empty transcript
            setResult({ ...fullResult, transcript: [] });

            // Stream Transcript
            const currentTranscript: TranscriptItem[] = [];
            for (const item of fullResult.transcript) {
                setActiveSpeaker(item.saint);

                // Variable read time based on length
                const readTime = Math.min(3000, Math.max(1000, item.content.length * 30));
                await new Promise(r => setTimeout(r, readTime));

                currentTranscript.push(item);
                setResult(prev => prev ? { ...prev, transcript: [...currentTranscript] } : null);
            }

            setActiveSpeaker(null);

            // Dramatic pause before consensus
            await new Promise(r => setTimeout(r, 1000));
            setShowConsensus(true);
            setResult(fullResult); // Ensure full result is set

        } catch (error) {
            console.error("Council failed:", error);
        } finally {
            setIsDeliberating(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-black text-slate-200 overflow-hidden relative font-sans selection:bg-indigo-500/30">
            {/* --- Deep Void Background --- */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#05050A] to-black pointer-events-none" />

            {/* Animated Stars/Particles (CSS only implementation) */}
            <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDuration: '3s' }} />
                <div className="absolute top-3/4 left-2/3 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" style={{ animationDuration: '5s' }} />
                <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-violet-400 rounded-full animate-pulse" style={{ animationDuration: '4s' }} />
            </div>

            {/* --- Header --- */}
            <div className="relative z-30 px-4 md:px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur-md flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                        <Users className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-medium text-slate-100 tracking-wide">High Council Chamber</h2>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${isDeliberating ? 'bg-indigo-500 animate-pulse' : 'bg-slate-600'}`} />
                                <p className="text-[10px] text-indigo-400/80 uppercase tracking-widest hidden sm:block">
                                    {isDeliberating ? 'Session Active' : 'Awaiting Inquiry'}
                                </p>
                            </div>

                            {/* Coordination Toggle */}
                            <div className="flex items-center gap-2 bg-slate-900/50 rounded-full px-2 py-1 border border-white/10">
                                <span className={`text-[10px] font-medium transition-colors ${!coordinationMode ? 'text-indigo-400' : 'text-slate-500'}`}>Solo</span>
                                <button
                                    onClick={() => {
                                        setCoordinationMode(!coordinationMode);
                                        if (!coordinationMode) setActiveTab('missions');
                                    }}
                                    className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${coordinationMode ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-300 ${coordinationMode ? 'left-4.5' : 'left-0.5'}`} style={{ left: coordinationMode ? '1.1rem' : '0.125rem' }} />
                                </button>
                                <span className={`text-[10px] font-medium transition-colors ${coordinationMode ? 'text-emerald-400' : 'text-slate-500'}`}>Co-op</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Main Content Split --- */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">

                {/* LEFT (Top on Mobile): The Holographic Round Table */}
                <div className="w-full lg:w-[45%] h-[300px] lg:h-auto relative flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-white/5 bg-white/[0.02] shrink-0">

                    {/* The Table Container */}
                    <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 scale-75 sm:scale-90 lg:scale-100 transition-transform duration-500">

                        {/* Floor Reflection/Glow */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-indigo-500/5 blur-3xl rounded-full transition-opacity duration-1000 ${isDeliberating ? 'opacity-100' : 'opacity-20'}`} />

                        {/* Glass Table Surface */}
                        <div className="absolute inset-0 rounded-full border border-white/10 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm shadow-2xl ring-1 ring-white/5">
                            {/* Inner Rings */}
                            <div className="absolute inset-8 rounded-full border border-white/5 opacity-50" />
                            <div className="absolute inset-24 rounded-full border border-dashed border-white/10 opacity-30 animate-[spin_60s_linear_infinite]" />
                        </div>

                        {/* Central Hologram / Projector */}
                        {/* Central Hologram / Projector / Input */}
                        <div className="absolute inset-0 flex items-center justify-center z-50">
                            {!isDeliberating ? (
                                <div className="relative w-64 group/input">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full opacity-0 group-hover/input:opacity-50 blur transition-opacity duration-500" />
                                    <div className="relative flex items-center bg-black/80 border border-indigo-500/30 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.2)] backdrop-blur-xl overflow-hidden">
                                        <input
                                            type="text"
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleDeliberate()}
                                            placeholder="Ask the Council..."
                                            className="w-full bg-transparent pl-4 pr-10 py-2.5 text-slate-200 placeholder-slate-500 text-xs font-medium text-center focus:outline-none"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleDeliberate}
                                            disabled={!query.trim()}
                                            className="absolute right-1 p-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-full transition-colors disabled:opacity-0"
                                        >
                                            <Send className="w-3 h-3" />
                                        </button>
                                    </div>
                                    {/* Helper Text */}
                                    <div className="absolute -bottom-8 left-0 right-0 text-center opacity-0 group-hover/input:opacity-100 transition-opacity duration-300">
                                        <span className="text-[10px] text-indigo-400/80 tracking-widest uppercase">Summon Consensus</span>
                                    </div>
                                </div>
                            ) : (
                                <div className={`relative transition-all duration-1000 scale-110`}>
                                    <div className={`w-24 h-24 rounded-full bg-black/60 border border-indigo-500/30 flex items-center justify-center backdrop-blur-xl z-20 relative overflow-hidden`}>
                                        <Brain className={`w-10 h-10 text-indigo-400 transition-all duration-500 animate-pulse drop-shadow-[0_0_10px_rgba(129,140,248,0.8)]`} />

                                        {/* Holographic Scanline */}
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent animate-[scan_2s_linear_infinite]" />
                                    </div>
                                    {/* Projector Beam base */}
                                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-indigo-500/10 transition-all duration-1000 scale-150 opacity-100`} />
                                </div>
                            )}
                        </div>

                        {/* Saints Nodes */}
                        {COUNCIL_MEMBERS.map((saint, i) => {
                            const total = COUNCIL_MEMBERS.length;
                            const angle = (i * (360 / total)) - 90; // Start from top
                            const radius = 140; // px
                            // Calculate position
                            const x = radius * Math.cos(angle * (Math.PI / 180));
                            const y = radius * Math.sin(angle * (Math.PI / 180));

                            const isActive = activeSpeaker === saint.id;

                            return (
                                <div
                                    key={saint.id}
                                    className={`absolute flex flex-col items-center justify-center transition-all duration-500 ease-out z-30`}
                                    style={{
                                        left: '50%',
                                        top: '50%',
                                        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) ${isActive ? 'scale-110' : 'scale-100'}`
                                    }}
                                >
                                    {/* Connection Line to Center (only when active) */}
                                    <div
                                        className={`absolute top-1/2 left-1/2 w-[140px] h-[1px] bg-gradient-to-r from-transparent via-${saint.color.split('-')[1]}-500/50 to-transparent origin-left transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                                        style={{
                                            transform: `rotate(${angle + 180}deg)`,
                                            width: '140px'
                                        }}
                                    />

                                    {/* Avatar Node */}
                                    <div className={`relative group cursor-pointer`}>
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-xl border transition-all duration-300
                                            ${isActive
                                                ? `bg-slate-900/90 border-white/20 shadow-[0_0_30px_${saint.glowColor}] translate-y-[-4px]`
                                                : `bg-slate-900/40 border-white/5 hover:bg-slate-800/60 hover:border-white/20`
                                            }
                                        `}>
                                            <saint.icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'text-white drop-shadow-md' : saint.color}`} />

                                            {/* Speaking Wave Animation */}
                                            {isActive && (
                                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-${saint.color.split('-')[1]}-400`}></span>
                                                    <span className={`relative inline-flex rounded-full h-3 w-3 bg-${saint.color.split('-')[1]}-500`}></span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Label Tooltip */}
                                        <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap transition-all duration-300 pointer-events-none ${isActive ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-2 group-hover:opacity-100'}`}>
                                            <span className="px-2 py-1 rounded bg-black/80 border border-white/10 text-[10px] font-medium text-slate-300 backdrop-blur-md">
                                                {saint.name}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT (Bottom on Mobile): The Transcript & Interaction */}
                <div className="flex-1 flex flex-col bg-slate-950/30 backdrop-blur-sm relative border-l border-white/5 min-h-0">

                    {/* Tab Switcher (Visible only when Coordination Enabled) */}
                    {coordinationMode && (
                        <div className="flex items-center border-b border-white/5 bg-slate-900/50">
                            <button
                                onClick={() => setActiveTab('transcript')}
                                className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'transcript' ? 'border-indigo-500 text-indigo-300 bg-indigo-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Scroll className="w-3 h-3" />
                                    Transcript
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('missions')}
                                className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'missions' ? 'border-emerald-500 text-emerald-300 bg-emerald-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Activity className="w-3 h-3" />
                                    Mission Board
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Mission Board View */}
                    {activeTab === 'missions' && coordinationMode ? (
                        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar bg-slate-950/50">
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 mb-4">
                                <h3 className="text-emerald-400 text-sm font-medium mb-1 flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    Active Operations
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Real-time tracking of autonomous agent missions and collaborative tasks.
                                </p>
                            </div>
                            <MissionBoard />
                        </div>
                    ) : (
                        /* Transcript Scroll Area */
                        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 custom-scrollbar">

                            {/* Empty State */}
                            {!result && !isDeliberating && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 min-h-[200px]">
                                    <div className="p-4 rounded-full bg-white/5 border border-white/5">
                                        <Sparkles className="w-8 h-8 opacity-40" />
                                    </div>
                                    <div className="text-center max-w-sm">
                                        <h3 className="text-sm font-medium text-slate-400 mb-1">The Council is Assembled</h3>
                                        <p className="text-xs text-slate-600">The saints await your query to begin their deliberation.</p>
                                    </div>
                                </div>
                            )}

                            {/* Message Stream */}
                            {result?.transcript.map((item, idx) => {
                                const saint = COUNCIL_MEMBERS.find(s => s.id === item.saint) || COUNCIL_MEMBERS[0];
                                return (
                                    <div key={idx} className="group animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
                                        <div className="flex gap-4 items-start max-w-3xl">
                                            {/* Avatar Column */}
                                            <div className="flex flex-col items-center gap-1 mt-1 shrink-0">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-slate-900 border border-white/10 shadow-lg ${saint.color}`}>
                                                    <saint.icon className="w-4 h-4" />
                                                </div>
                                            </div>

                                            {/* Text Column */}
                                            <div className="flex-1 space-y-1 min-w-0">
                                                <div className="flex items-baseline gap-2">
                                                    <span className={`text-xs font-bold uppercase tracking-wider ${saint.color} drop-shadow-sm truncate`}>
                                                        {saint.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-600 font-mono hidden sm:inline-block">
                                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                <div className="text-sm md:text-[15px] leading-relaxed text-slate-300 font-serif opacity-90 break-words">
                                                    {item.content}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Consensus Decree - The "Sealed" Document */}
                            {showConsensus && result?.consensus && (
                                <div className="my-8 md:my-12 animate-in zoom-in-95 duration-1000 ease-out fill-mode-forwards">
                                    <div className="relative max-w-2xl mx-auto">
                                        {/* Glowing Backlight */}
                                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-lg blur opacity-20" />

                                        <div className="relative bg-[#0F0F16] border border-indigo-500/30 rounded-lg p-1 overflow-hidden">
                                            {/* Decree Header */}
                                            <div className="bg-slate-900/50 border-b border-indigo-500/20 px-6 py-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Scroll className="w-4 h-4 text-indigo-400" />
                                                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-[0.2em]">Council Decree</span>
                                                </div>
                                                <Star className="w-3 h-3 text-indigo-500/50" />
                                            </div>

                                            {/* Decree Content */}
                                            <div className="p-6 md:p-8 text-center">
                                                <p className="text-base md:text-xl text-white font-serif italic leading-relaxed">
                                                    "{result.consensus}"
                                                </p>
                                            </div>

                                            {/* Action Items Footer */}
                                            {result.action_items.length > 0 && (
                                                <div className="bg-indigo-950/10 border-t border-indigo-500/10 p-6">
                                                    <h4 className="text-[10px] font-bold text-indigo-400/70 uppercase mb-4 text-center">Required Actions</h4>
                                                    <div className="grid gap-3">
                                                        {result.action_items.map((action, i) => (
                                                            <div key={i} className="flex items-center gap-3 text-sm text-slate-300 bg-slate-900/40 px-4 py-2 rounded border border-white/5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                                                {action}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={transcriptEndRef} className="h-4" />
                        </div>
                    )}

                    {/* Input Area (Bottom - Hidden/Removed as moved to center) */}
                    {/* <div className="hidden" /> */}

                </div>
            </div>
        </div>
    );
}
