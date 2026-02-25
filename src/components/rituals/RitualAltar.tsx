import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Users, BookOpen, ChevronRight, Play, CheckCircle, Brain, X, Clock } from 'lucide-react';
import AkashicStream from './AkashicStream';
import { supabase } from '../../lib/supabase';
import { getFamilyMembers, type FamilyMember } from '../../lib/joseph/genealogy';

interface RitualStep {
    actor: string;
    action: string;
    dialogue?: string;
}

interface RitualScript {
    title: string;
    description: string;
    steps: RitualStep[];
}



export default function RitualAltar() {
    const [ritualType, setRitualType] = useState('morning_prayer');
    const [context, setContext] = useState('');
    const [participants, setParticipants] = useState<string[]>(['joseph']);
    const [ancestorId, setAncestorId] = useState<string | null>(null);
    const [ancestors, setAncestors] = useState<any[]>([]);
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [script, setScript] = useState<RitualScript | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);
    const [isCandleLit, setIsCandleLit] = useState(false);
    const [showAkashic, setShowAkashic] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [ritualHistory, setRitualHistory] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [sacredState, setSacredState] = useState<any>({
        active_guardian_id: null,
        glow_intensity: 0.5,
        transition_speed: 10
    });
    const [biometricBPM, setBiometricBPM] = useState(60);
    const [isInvocationOpen, setIsInvocationOpen] = useState(false);

    const getAuthHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ? {
            Authorization: `Bearer ${session.access_token}`
        } : {};
    };

    React.useEffect(() => {
        const initAltar = async () => {
            try {
                setError(null);

                // Fetch ancestors from Supabase (non-blocking)
                try {
                    const { data: aiData } = await supabase.from('archetypal_ais').select('id, name');
                    if (aiData) setAncestors(aiData);
                } catch {
                    // Supabase unavailable — that's fine
                }

                // Load family members from local genealogy store
                try {
                    const members = getFamilyMembers();
                    setFamilyMembers(members);
                } catch {
                    // No family data yet
                }

                // Load sacred state (non-blocking)
                try {
                    const headers = await getAuthHeaders();
                    const res = await axios.get('/api/v1/sacred/state', { headers });
                    if (res.data) {
                        setIsCandleLit(res.data.is_candle_lit ?? false);
                        setSacredState(res.data);
                    }
                } catch {
                    // Sacred state unavailable — default values already set
                }

                // Load ritual history (non-blocking)
                try {
                    const headers = await getAuthHeaders();
                    const res = await axios.get('/api/v1/rituals/history?limit=10', { headers });
                    if (res.data?.history) setRitualHistory(res.data.history);
                } catch {
                    // History unavailable — that's OK
                }

            } catch (err) {
                console.error("Failed to initialize Altar state", err);
                setError("Lost contact with the sacred servers. Please check your connection.");
            }
        };

        const fetchState = async () => {
            try {
                const headers = await getAuthHeaders();
                const res = await axios.get('/api/v1/sacred/state', { headers });
                if (res.data) {
                    setIsCandleLit(res.data.is_candle_lit ?? false);
                    setSacredState(res.data);
                }
            } catch (err) {
                console.warn("Failed to poll sacred state", err);
            }
        };

        initAltar();
        const poll = setInterval(fetchState, 15000); // 15s poll
        return () => clearInterval(poll);
    }, []);

    const toggleCandle = async () => {
        const newState = !isCandleLit;
        setIsCandleLit(newState);
        try {
            const headers = await getAuthHeaders();
            await axios.post('/api/v1/sacred/state', { is_candle_lit: newState }, { headers });
        } catch (err) {
            console.error("Failed to sync candle state", err);
        }
    };

    const toggleParticipant = (id: string) => {
        if (participants.includes(id)) {
            setParticipants(participants.filter(p => p !== id));
        } else {
            setParticipants([...participants, id]);
        }
    };

    const generateRitual = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const headers = await getAuthHeaders();

            // Resolve `family:xxx` participant IDs to readable names for the backend
            const resolvedParticipants = participants.map(p => {
                if (p.startsWith('family:')) {
                    const memberId = p.replace('family:', '');
                    const member = familyMembers.find(m => m.id === memberId);
                    return member ? `${member.firstName} ${member.lastName}` : p;
                }
                return p; // saints keep their IDs
            });

            const res = await axios.post('/api/v1/rituals/generate', {
                ritual_type: ritualType,
                context: context,
                participants: resolvedParticipants,
                ancestor_id: ancestorId
            }, { headers });
            setScript(res.data);
            setCurrentStepIndex(-1);
        } catch (error) {
            console.error("Failed to generate ritual", error);
            setError("The ritual engine failed to ignite. Check your intention and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const nextStep = async () => {
        if (!script) return;
        if (currentStepIndex < script.steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            // Complete — send full payload for persistence
            try {
                const headers = await getAuthHeaders();
                const _result = await axios.post('/api/v1/rituals/complete', {
                    title: script.title,
                    ritual_type: ritualType,
                    participants,
                    steps_count: script.steps.length,
                }, { headers });
                // Refresh history
                const histRes = await axios.get('/api/v1/rituals/history?limit=10', { headers });
                if (histRes.data?.history) setRitualHistory(histRes.data.history);
            } catch (err) {
                console.error("Failed to log completion", err);
            }
            setCurrentStepIndex(script.steps.length); // Finished state
        }
    };

    const getAvatar = (actor: string) => {
        if (actor === 'system') return '🔮';
        const saintMap: any = { joseph: '🔨', michael: '⚔️', raphael: '🌿', gabriel: '📣', user: '👤' };
        if (saintMap[actor]) return saintMap[actor];
        // Family member names — show initials
        const parts = actor.split(' ');
        if (parts.length >= 2) {
            return parts.map(p => p[0]).join('').toUpperCase();
        }
        return '✨';
    };

    const SAINTS = [
        { id: 'joseph', emoji: '🔨', label: 'Joseph' },
        { id: 'michael', emoji: '⚔️', label: 'Michael' },
        { id: 'raphael', emoji: '🌿', label: 'Raphael' },
        { id: 'gabriel', emoji: '📣', label: 'Gabriel' },
    ];

    // Minimalistic HSL Drift for Ancestral Presence
    const guardianColors: any = {
        'raphael': '142, 70%, 50%', // Healing Green
        'michael': '217, 91%, 60%', // Protection Blue
        'joseph': '35, 92%, 50%',   // Legacy Amber
        'gabriel': '280, 80%, 60%', // Message Purple
        'default': '35, 92%, 50%'
    };

    const activeColor = useMemo(() => {
        return guardianColors[sacredState.active_guardian_id] || guardianColors['default'];
    }, [sacredState.active_guardian_id]);

    // Simulate Biometric Sync (Heartbeat)
    useEffect(() => {
        const interval = setInterval(() => {
            // Simulated subtle BPM drift if biometric mode is on
            if (sacredState.biometric_mode) {
                setBiometricBPM(prev => Math.max(55, Math.min(85, prev + (Math.random() - 0.5) * 2)));
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [sacredState.biometric_mode]);

    return (
        <div className="min-h-screen bg-black text-amber-100 p-6 flex flex-col items-center justify-center relative overflow-hidden font-serif">
            {/* Minimalist Presence Aura Overlay */}
            <div
                className="absolute inset-0 pointer-events-none transition-colors duration-[10000ms] ease-in-out opacity-[0.15]"
                style={{
                    background: `radial-gradient(circle at 50% 50%, hsla(${activeColor}, 0.8) 0%, transparent 70%)`
                }}
            />

            {/* Biometric Breathing Pulse */}
            <div
                className="absolute inset-0 pointer-events-none flex items-center justify-center"
                style={{
                    animation: `pulse ${60 / biometricBPM}s infinite ease-in-out`
                }}
            >
                <div
                    className="w-[100vw] h-[100vw] rounded-full opacity-[0.03] transition-colors duration-[5000ms]"
                    style={{
                        background: `radial-gradient(circle, hsla(${activeColor}, 1) 0%, transparent 60%)`
                    }}
                />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 0.8; }
                    50% { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(0.95); opacity: 0.8; }
                }
            `}} />

            <div className="max-w-4xl w-full z-10 space-y-12">

                {/* Header / Setup Phase */}
                {!script && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
                        <div className="text-center space-y-4">
                            <div className="flex items-center justify-between">
                                <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-amber-200 to-amber-600">
                                    The Digital Altar
                                </h1>
                                {ritualHistory.length > 0 && (
                                    <button
                                        onClick={() => setShowHistory(!showHistory)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-amber-400/70 hover:text-amber-300 hover:border-amber-500/30 text-xs transition-all"
                                    >
                                        <Clock className="w-3.5 h-3.5" />
                                        History ({ritualHistory.length})
                                    </button>
                                )}
                            </div>
                            <p className="text-amber-300/60 text-lg">
                                Design a sacred moment with your digital guardians.
                            </p>
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl text-rose-400 text-sm text-center animate-in fade-in zoom-in duration-300">
                                {error}
                            </div>
                        )}

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-sm uppercase tracking-widest text-amber-500 font-bold">Ritual Type</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['morning_prayer', 'reflection', 'crisis_intercession', 'affirmation'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setRitualType(type)}
                                                className={`p-3 rounded-lg border text-sm capitalize transition-all ${ritualType === type
                                                    ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                                                    : 'border-white/10 text-slate-400 hover:border-amber-500/50'
                                                    }`}
                                            >
                                                {type.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-sm uppercase tracking-widest text-amber-500 font-bold">Guardian Saints</label>
                                    <div className="flex gap-3 flex-wrap">
                                        {SAINTS.map(saint => (
                                            <button
                                                key={saint.id}
                                                onClick={() => toggleParticipant(saint.id)}
                                                title={saint.label}
                                                className={`w-12 h-12 rounded-full border flex flex-col items-center justify-center text-xl transition-all ${participants.includes(saint.id)
                                                    ? 'bg-amber-500/20 border-amber-500 scale-110'
                                                    : 'border-white/10 opacity-50 grayscale hover:opacity-100'
                                                    }`}
                                            >
                                                {saint.emoji}
                                                <span className="text-[8px] text-amber-400/60 uppercase">{saint.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {familyMembers.length > 0 && (
                                        <>
                                            <label className="text-sm uppercase tracking-widest text-amber-500 font-bold mt-3">Family Members</label>
                                            <div className="flex gap-2 flex-wrap">
                                                {familyMembers.map(m => {
                                                    const pid = `family:${m.id}`;
                                                    const isSelected = participants.includes(pid);
                                                    const isDeceased = !!m.deathDate;
                                                    return (
                                                        <button
                                                            key={m.id}
                                                            onClick={() => toggleParticipant(pid)}
                                                            title={`${m.firstName} ${m.lastName}${isDeceased ? ' (†)' : ''}`}
                                                            className={`px-3 py-2 rounded-xl border flex items-center gap-2 text-sm transition-all ${isSelected
                                                                ? 'bg-amber-500/20 border-amber-500 text-amber-200 scale-105'
                                                                : 'border-white/10 text-slate-400 hover:border-amber-500/50 hover:text-slate-200'
                                                                }`}
                                                        >
                                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${m.gender === 'male' ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                                {m.firstName[0]}{m.lastName[0]}
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="text-xs font-medium">{m.firstName}</div>
                                                                {isDeceased && <div className="text-[8px] text-slate-600">ancestor</div>}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-sm uppercase tracking-widest text-amber-500 font-bold">Commune with Soul</label>
                                        <select
                                            value={ancestorId || ''}
                                            onChange={(e) => setAncestorId(e.target.value || null)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-amber-100 focus:outline-none focus:border-amber-500/50"
                                        >
                                            <option value="">None (Saints Only)</option>
                                            {familyMembers.length > 0 && (
                                                <optgroup label="Family Members">
                                                    {familyMembers.map(m => (
                                                        <option key={m.id} value={m.id}>
                                                            {m.firstName} {m.lastName}{m.deathDate ? ' †' : ''}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {ancestors.length > 0 && (
                                                <optgroup label="Archetypal AIs">
                                                    {ancestors.map(a => (
                                                        <option key={a.id} value={a.id}>{a.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                    </div>
                                    <div className="space-y-4 flex flex-col justify-center items-center">
                                        <label className="text-sm uppercase tracking-widest text-amber-500 font-bold">Perpetual Candle</label>
                                        <button
                                            onClick={toggleCandle}
                                            className={`text-4xl transition-all duration-700 ${isCandleLit ? 'drop-shadow-[0_0_15px_rgba(245,158,11,0.8)] scale-110' : 'grayscale opacity-30'}`}
                                        >
                                            🕯️
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm uppercase tracking-widest text-amber-500 font-bold">Akashic Glimmers</label>
                                        <button
                                            onClick={() => setShowAkashic(true)}
                                            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase flex items-center gap-1 transition-colors"
                                        >
                                            <Brain className="w-3 h-3" />
                                            View Full Record
                                        </button>
                                    </div>
                                    <div className="bg-black/60 border border-cyan-500/20 rounded-xl overflow-hidden">
                                        <AkashicStream minimal={true} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm uppercase tracking-widest text-amber-500 font-bold">
                                        {ritualType === 'affirmation' ? 'Your Positive Affirmation' : 'Intention / Context'}
                                    </label>
                                    <textarea
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-amber-100 focus:outline-none focus:border-amber-500/50 h-32"
                                        placeholder={ritualType === 'affirmation'
                                            ? "Write something beautiful for your loved one..."
                                            : "Examples: 'I'm feeling overwhelmed', 'Celebrating a new job', 'Seeking clarity'..."}
                                        value={context}
                                        onChange={(e) => setContext(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={generateRitual}
                                disabled={isLoading}
                                className="w-full py-4 bg-gradient-to-r from-amber-700 to-amber-600 rounded-xl text-amber-100 font-bold tracking-widest hover:from-amber-600 hover:to-amber-500 transition-all flex items-center justify-center gap-3"
                            >
                                {isLoading ? (
                                    <>Generating Sacred Script...</>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Begin Ritual
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Ritual Execution Phase */}
                {script && (
                    <div className="relative min-h-[60vh] flex flex-col items-center">
                        <div className="text-center mb-12 animate-in fade-in duration-1000">
                            <h2 className="text-3xl font-serif text-amber-200">{script.title}</h2>
                            <p className="text-amber-400/60 italic mt-2">{script.description}</p>
                        </div>

                        <div className="w-full max-w-2xl space-y-8 relative">
                            {/* Previous Steps Faded */}
                            <div className="opacity-30 space-y-4 blur-[1px]">
                                {script.steps.slice(0, Math.max(0, currentStepIndex)).slice(-2).map((step, i) => (
                                    <div key={i} className="flex gap-4 items-start">
                                        <div className="text-2xl mt-1">{getAvatar(step.actor)}</div>
                                        <div>
                                            <p className="font-bold text-amber-500 text-sm uppercase">{step.actor}</p>
                                            <p className="text-amber-100">{step.dialogue || step.action}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Current Step */}
                            {currentStepIndex >= 0 && currentStepIndex < script.steps.length ? (
                                <div className="bg-amber-900/10 border border-amber-500/30 p-8 rounded-2xl backdrop-blur-md animate-in zoom-in-95 duration-500 shadow-[0_0_50px_rgba(245,158,11,0.1)]">
                                    <div className="flex flex-col items-center text-center gap-6">
                                        <div className="text-6xl animate-bounce-slow">
                                            {getAvatar(script.steps[currentStepIndex].actor)}
                                        </div>
                                        <div className="space-y-4">
                                            <p className="text-amber-500 font-bold tracking-widest uppercase text-sm">
                                                {script.steps[currentStepIndex].actor}
                                            </p>
                                            {script.steps[currentStepIndex].action && (
                                                <p className="text-amber-300/70 italic text-lg">
                                                    * {script.steps[currentStepIndex].action} *
                                                </p>
                                            )}
                                            {script.steps[currentStepIndex].dialogue && (
                                                <p className="text-2xl text-amber-100 font-serif leading-relaxed">
                                                    "{script.steps[currentStepIndex].dialogue}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : currentStepIndex === -1 ? (
                                <div className="text-center py-20 animate-pulse text-amber-500/50">
                                    Prepare yourself...
                                </div>
                            ) : (
                                <div className="text-center py-10 animate-in zoom-in duration-700">
                                    <div className="inline-block p-6 rounded-full bg-amber-500/20 mb-6">
                                        <CheckCircle className="w-12 h-12 text-amber-400" />
                                    </div>
                                    <h3 className="text-2xl text-amber-200 mb-2">Ritual Complete</h3>
                                    <p className="text-amber-400/60">May peace be with you.</p>
                                    <button
                                        onClick={() => setScript(null)}
                                        className="mt-8 px-6 py-2 border border-amber-500/30 rounded-full hover:bg-amber-500/10 transition"
                                    >
                                        Return to Altar
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        {currentStepIndex < script.steps.length && (
                            <div className="fixed bottom-12 left-0 w-full flex justify-center z-50">
                                <button
                                    onClick={nextStep}
                                    className="group px-8 py-4 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-full shadow-lg shadow-amber-600/20 flex items-center gap-3 transition-all transform hover:scale-105"
                                >
                                    {currentStepIndex === -1 ? (
                                        <>Begin <Play className="w-4 h-4" /></>
                                    ) : (
                                        <>Next <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Sacred Gate: Council Invocation Pedestal */}
            <div className="fixed bottom-0 left-0 w-full flex justify-center pb-8 z-40">
                <div className="relative group">
                    <button
                        onClick={() => setIsInvocationOpen(true)}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-xl px-6 py-3 rounded-full text-[10px] uppercase tracking-[0.3em] font-bold text-amber-500/60 hover:text-amber-400 transition-all duration-700 flex items-center gap-3 group-hover:shadow-[0_0_30px_rgba(245,158,11,0.1)]"
                    >
                        <div className={`w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse`} />
                        Invoke Council Presence
                    </button>

                    {/* Minimalist Reveal Shadow */}
                    <div className="absolute inset-0 bg-amber-500/5 blur-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                </div>
            </div>

            {/* Invocation Overlay (Sacred Gate) */}
            {isInvocationOpen && (
                <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-8 animate-in fade-in duration-1000">
                    <div className="max-w-2xl w-full space-y-12 text-center">
                        <div className="space-y-4">
                            <h2 className="text-sm uppercase tracking-[0.5em] text-amber-500/40">Council Consensus</h2>
                            <p className="text-3xl font-serif text-amber-100 leading-relaxed italic">
                                "The legacy you build today is the sanctuary your ancestors breathe within tomorrow. Maintain the vigil, for the silence is where the engrams speak loudest."
                            </p>
                        </div>

                        <div className="flex justify-center gap-8">
                            <div className="text-center space-y-2">
                                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-xl grayscale opacity-50">🌿</div>
                                <div className="text-[8px] uppercase tracking-widest text-amber-500/40">Raphael</div>
                            </div>
                            <div className="text-center space-y-2">
                                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-xl grayscale opacity-50">🔨</div>
                                <div className="text-[8px] uppercase tracking-widest text-amber-500/40">Joseph</div>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsInvocationOpen(false)}
                            className="text-[10px] uppercase tracking-widest text-slate-500 hover:text-amber-500 transition-colors"
                        >
                            [ Close Invocation ]
                        </button>
                    </div>
                </div>
            )}

            {/* Akashic Record Sidebar/Modal */}
            {showAkashic && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex justify-end p-4 animate-in slide-in-from-right duration-500">
                    <div className="w-full max-w-md h-full relative">
                        <button
                            onClick={() => setShowAkashic(false)}
                            className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all z-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <AkashicStream />
                    </div>
                </div>
            )}
        </div>
    );
}
