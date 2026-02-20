import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, Users, BookOpen, ChevronRight, Play, CheckCircle } from 'lucide-react';

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

import saintAvatars from '../../assets/saint_avatars.json'; // Assuming this exists or using placeholders

export default function RitualAltar() {
    const [ritualType, setRitualType] = useState('morning_prayer');
    const [context, setContext] = useState('');
    const [participants, setParticipants] = useState<string[]>(['joseph']);
    const [script, setScript] = useState<RitualScript | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);

    const toggleParticipant = (id: string) => {
        if (participants.includes(id)) {
            setParticipants(participants.filter(p => p !== id));
        } else {
            setParticipants([...participants, id]);
        }
    };

    const generateRitual = async () => {
        setIsLoading(true);
        try {
            const res = await axios.post('/api/v1/rituals/generate', {
                ritual_type: ritualType,
                context: context,
                participants: participants
            });
            setScript(res.data);
            setCurrentStepIndex(-1);
        } catch (error) {
            console.error("Failed to generate ritual", error);
        } finally {
            setIsLoading(false);
        }
    };

    const nextStep = () => {
        if (!script) return;
        if (currentStepIndex < script.steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            // Complete
            axios.post('/api/v1/rituals/complete', { title: script.title });
            setCurrentStepIndex(script.steps.length); // Finished state
        }
    };

    const getAvatar = (actor: string) => {
        if (actor === 'system') return '🔮';
        // Mock mapping or lookup
        const map: any = { joseph: '🔨', michael: '⚔️', raphael: '🌿', gabriel: '📣', user: '👤' };
        return map[actor] || '✨';
    };

    return (
        <div className="min-h-screen bg-black text-amber-100 p-6 flex flex-col items-center justify-center relative overflow-hidden font-serif">
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-900/20 rounded-full blur-[100px] animate-pulse"></div>
            </div>

            <div className="max-w-4xl w-full z-10 space-y-12">

                {/* Header / Setup Phase */}
                {!script && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
                        <div className="text-center space-y-4">
                            <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-amber-200 to-amber-600">
                                The Digital Altar
                            </h1>
                            <p className="text-amber-300/60 text-lg">
                                Design a sacred moment with your digital guardians.
                            </p>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-sm uppercase tracking-widest text-amber-500 font-bold">Ritual Type</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['morning_prayer', 'reflection', 'crisis_intercession', 'celebration'].map(type => (
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
                                    <label className="text-sm uppercase tracking-widest text-amber-500 font-bold">Participants</label>
                                    <div className="flex gap-4">
                                        {['joseph', 'michael', 'raphael'].map(saint => (
                                            <button
                                                key={saint}
                                                onClick={() => toggleParticipant(saint)}
                                                className={`w-12 h-12 rounded-full border flex items-center justify-center text-2xl transition-all ${participants.includes(saint)
                                                        ? 'bg-amber-500/20 border-amber-500 scale-110'
                                                        : 'border-white/10 opacity-50 grayscale hover:opacity-100'
                                                    }`}
                                            >
                                                {getAvatar(saint)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm uppercase tracking-widest text-amber-500 font-bold">Intention / Context</label>
                                <textarea
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-amber-100 focus:outline-none focus:border-amber-500/50"
                                    placeholder="Examples: 'I'm feeling overwhelmed', 'Celebrating a new job', 'Seeking clarity'..."
                                    value={context}
                                    onChange={(e) => setContext(e.target.value)}
                                />
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
        </div>
    );
}
