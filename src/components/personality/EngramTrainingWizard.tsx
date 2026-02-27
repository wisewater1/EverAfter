import { useState, useEffect, useCallback } from 'react';
import {
    X, Users, Heart, User as UserIcon, ChevronRight, ChevronLeft, Brain,
    Sparkles, CheckCircle, BarChart3, ArrowRight, Home, Shield,
    Loader, TrendingUp, Star
} from 'lucide-react';
import { getFamilyMembers } from '../../lib/joseph/genealogy';
import type { FamilyMember } from '../../lib/joseph/genealogy';
import { supabase } from '../../lib/supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

/* ─── Types ─────────────────────────────────────────────── */

interface ArchetypalAI {
    id: string;
    name: string;
    description: string;
    total_memories: number;
    ai_readiness_score: number;
    is_ai_active: boolean;
}

interface FamilyConnection {
    isFamilyMember: boolean;
    linkedMemberId: string | null;
    relationship: string;
    additionalRelationships: { memberId: string; relationship: string }[];
}

interface PersonalityProfile {
    member_id: string;
    member_name: string;
    scores: Record<string, number>;
    trait_details: Record<string, { score: number; level: string; description: string; facets: Record<string, { score: number; label: string; level: string }> }>;
    traits: string[];
    communication_style: string;
    archetype: { name: string; emoji: string; description: string };
    family_role: { role: string; description: string };
    strengths: string[];
    growth_areas: string[];
    emotional_stability: number;
    radar_data: { subject: string; A: number; fullMark: number }[];
}

interface QuizQuestion {
    id: string;
    text: string;
    category: string;
    number: number;
}

/* ─── Relationship Options ───────────────────────────────── */

const RELATIONSHIP_OPTIONS = [
    { value: 'self', label: 'Myself', icon: '🪞' },
    { value: 'spouse', label: 'Spouse / Partner', icon: '💍' },
    { value: 'parent', label: 'Parent', icon: '👨‍👩‍👧' },
    { value: 'child', label: 'Child', icon: '👶' },
    { value: 'sibling', label: 'Sibling', icon: '🤝' },
    { value: 'grandparent', label: 'Grandparent', icon: '👴' },
    { value: 'grandchild', label: 'Grandchild', icon: '🧒' },
    { value: 'aunt_uncle', label: 'Aunt / Uncle', icon: '🏡' },
    { value: 'cousin', label: 'Cousin', icon: '🌿' },
    { value: 'friend', label: 'Close Friend', icon: '⭐' },
    { value: 'other', label: 'Other', icon: '👤' },
];

const TRAIT_COLORS: Record<string, string> = {
    openness: '#8b5cf6',
    conscientiousness: '#f59e0b',
    extraversion: '#10b981',
    agreeableness: '#3b82f6',
    neuroticism: '#ef4444',
};

const LIKERT = [
    { value: 1, label: 'Strongly Disagree', color: 'border-rose-500/50 bg-rose-500/10 text-rose-400' },
    { value: 2, label: 'Disagree', color: 'border-orange-500/50 bg-orange-500/10 text-orange-400' },
    { value: 3, label: 'Neutral', color: 'border-slate-500/50 bg-slate-500/10 text-slate-400' },
    { value: 4, label: 'Agree', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' },
    { value: 5, label: 'Strongly Agree', color: 'border-green-500/50 bg-green-500/10 text-green-400' },
];

/* ─── Props ──────────────────────────────────────────────── */

interface EngramTrainingWizardProps {
    ai: ArchetypalAI;
    userId: string;
    onClose: () => void;
    onMemorySaved: (ai: ArchetypalAI) => void;
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */

export default function EngramTrainingWizard({ ai, userId, onClose, onMemorySaved }: EngramTrainingWizardProps) {
    // Wizard step: 'family-pre' | 'family-connect' | 'quiz-intro' | 'quiz' | 'results' | 'memory'
    const [step, setStep] = useState<'family-pre' | 'family-connect' | 'quiz-intro' | 'quiz' | 'results' | 'memory'>('family-pre');

    // Family connection state
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [connection, setConnection] = useState<FamilyConnection>({
        isFamilyMember: false,
        linkedMemberId: null,
        relationship: '',
        additionalRelationships: [],
    });

    // Quiz state
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [sessionId, setSessionId] = useState('');
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [profile, setProfile] = useState<PersonalityProfile | null>(null);
    const [quizLoading, setQuizLoading] = useState(false);

    // Memory state
    const [memory, setMemory] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [savedCount, setSavedCount] = useState(ai.total_memories);

    // Load family members for connection options
    useEffect(() => {
        setFamilyMembers(getFamilyMembers());
    }, []);

    /* ── Family pre-question handlers ─────────────────────── */

    const handleFamilyAnswer = (isFamilyMember: boolean) => {
        setConnection(prev => ({ ...prev, isFamilyMember }));
        if (isFamilyMember) {
            setStep('family-connect');
        } else {
            setStep('quiz-intro');
        }
    };

    const handleConnectionSave = async () => {
        // If linked to a St. Joseph family member, save the connection
        if (connection.linkedMemberId) {
            try {
                await supabase.from('engram_family_links').upsert({
                    engram_id: ai.id,
                    user_id: userId,
                    joseph_member_id: connection.linkedMemberId,
                    relationship: connection.relationship,
                    additional_relationships: connection.additionalRelationships,
                    updated_at: new Date().toISOString(),
                });
            } catch {
                // Non-blocking — table may not exist yet, continue
            }
        }
        setStep('quiz-intro');
    };

    /* ── Quiz handlers ────────────────────────────────────── */

    const startQuiz = useCallback(async () => {
        setQuizLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/personality-quiz/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    member_id: ai.id,
                    member_name: ai.name,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setSessionId(data.session_id);
                setQuestions(data.questions);
                setAnswers({});
                setCurrentQ(0);
                setStep('quiz');
            }
        } catch {
            // Fallback: generate simple local questions
            const localQs = generateLocalQuestions();
            setSessionId(`local-${Date.now()}`);
            setQuestions(localQs);
            setAnswers({});
            setCurrentQ(0);
            setStep('quiz');
        } finally {
            setQuizLoading(false);
        }
    }, [ai]);

    const selectAnswer = (value: number) => {
        const q = questions[currentQ];
        if (!q) return;
        const updated = { ...answers, [q.id]: value };
        setAnswers(updated);
        if (currentQ < questions.length - 1) {
            setTimeout(() => setCurrentQ(prev => prev + 1), 280);
        }
    };

    const submitQuiz = useCallback(async () => {
        setQuizLoading(true);
        try {
            let profileData: PersonalityProfile | null = null;

            if (!sessionId.startsWith('local-')) {
                const res = await fetch(`${API_BASE}/api/v1/personality-quiz/submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: sessionId, answers }),
                });
                if (res.ok) {
                    profileData = await res.json();
                }
            }

            // Fallback: compute profile locally from answers
            if (!profileData) {
                profileData = computeLocalProfile(ai.name, ai.id, answers, questions);
            }

            setProfile(profileData);

            // Save profile to Supabase alongside any family connection
            await supabase.from('engram_personality_profiles').upsert({
                engram_id: ai.id,
                user_id: userId,
                profile: profileData,
                joseph_member_id: connection.linkedMemberId,
                relationship: connection.relationship,
                updated_at: new Date().toISOString(),
            }).catch(() => {/* non-blocking */ });

            setStep('results');
        } catch (err) {
            console.error('Quiz submit error:', err);
        } finally {
            setQuizLoading(false);
        }
    }, [sessionId, answers, ai, connection, questions, userId]);

    /* ── Memory save ──────────────────────────────────────── */

    const saveMemory = async () => {
        if (!memory.trim()) return;
        setIsSaving(true);
        try {
            await supabase.from('memories').insert({
                archetypal_ai_id: ai.id,
                user_id: userId,
                content: memory.trim(),
                source: 'manual_training',
                created_at: new Date().toISOString(),
            });
        } catch { /* continue even if offline */ }
        setSavedCount(prev => prev + 1);
        const updated = { ...ai, total_memories: savedCount + 1, ai_readiness_score: Math.min(100, Math.round((savedCount + 1) / 50 * 100)) };
        onMemorySaved(updated);
        setMemory('');
        setIsSaving(false);
    };

    /* ─────────────────────────────────────────────────────── */

    const currentQuestion = questions[currentQ];
    const progress = questions.length > 0 ? ((currentQ + 1) / questions.length) * 100 : 0;
    const answeredCount = Object.keys(answers).length;
    const allAnswered = questions.length > 0 && answeredCount >= questions.length;

    const linkedMember = familyMembers.find(m => m.id === connection.linkedMemberId);

    /* ─── Render ──────────────────────────────────────────── */

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md" onClick={onClose}>
            <div
                className="bg-gradient-to-br from-slate-800/98 to-slate-900/98 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* ─ Header ─ */}
                <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-sm border-b border-white/5 flex items-center justify-between p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white">{ai.name}</h2>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Personality Training Wizard</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ─ Step: Family Pre-Question ─ */}
                {step === 'family-pre' && (
                    <div className="p-6 space-y-6">
                        <div className="text-center space-y-3">
                            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto">
                                <Users className="w-8 h-8 text-amber-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Connect to St. Joseph</h3>
                            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                                Every personality in EverAfter is connected through St. Joseph's family guardian network.
                                Is <strong className="text-white">{ai.name}</strong> a real person in your family?
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleFamilyAnswer(true)}
                                className="flex flex-col items-center gap-3 p-6 bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10 rounded-2xl transition-all group"
                            >
                                <span className="text-3xl">👨‍👩‍👧‍👦</span>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-white">Yes, a family member</p>
                                    <p className="text-[10px] text-slate-500 mt-1">Link to the St. Joseph family tree</p>
                                </div>
                                <div className="px-3 py-1 bg-amber-500/20 rounded-full text-[10px] text-amber-400 font-bold uppercase tracking-wider group-hover:bg-amber-500/30 transition-all">
                                    Connect
                                </div>
                            </button>

                            <button
                                onClick={() => handleFamilyAnswer(false)}
                                className="flex flex-col items-center gap-3 p-6 bg-indigo-500/5 border border-indigo-500/20 hover:border-indigo-500/40 hover:bg-indigo-500/10 rounded-2xl transition-all group"
                            >
                                <span className="text-3xl">✨</span>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-white">No, a custom AI</p>
                                    <p className="text-[10px] text-slate-500 mt-1">Standalone personality companion</p>
                                </div>
                                <div className="px-3 py-1 bg-indigo-500/20 rounded-full text-[10px] text-indigo-400 font-bold uppercase tracking-wider group-hover:bg-indigo-500/30 transition-all">
                                    Continue
                                </div>
                            </button>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-800/40 rounded-xl p-3">
                            <Home className="w-3.5 h-3.5 shrink-0" />
                            <span>Family members are visible to St. Joseph and can interact with the family council, timeline, and health predictions.</span>
                        </div>
                    </div>
                )}

                {/* ─ Step: Family Connection Setup ─ */}
                {step === 'family-connect' && (
                    <div className="p-6 space-y-5">
                        <div className="flex items-center gap-2 mb-2">
                            <button onClick={() => setStep('family-pre')} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <h3 className="text-base font-bold text-white">Family Connections</h3>
                        </div>

                        {/* Primary relationship to the user */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                What is {ai.name}'s relationship to you?
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {RELATIONSHIP_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setConnection(prev => ({ ...prev, relationship: opt.value }))}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${connection.relationship === opt.value
                                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                                            }`}
                                    >
                                        <span>{opt.icon}</span>
                                        <span className="text-xs">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Link to an existing St. Joseph family member */}
                        {familyMembers.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Link to a St. Joseph family member (optional)
                                </label>
                                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                    <button
                                        onClick={() => setConnection(prev => ({ ...prev, linkedMemberId: null }))}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-sm transition-all ${!connection.linkedMemberId
                                            ? 'bg-slate-700/60 border-slate-600/50 text-white'
                                            : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300'
                                            }`}
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-300">?</div>
                                        <span>No specific link</span>
                                    </button>
                                    {familyMembers.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setConnection(prev => ({ ...prev, linkedMemberId: m.id }))}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-sm transition-all ${connection.linkedMemberId === m.id
                                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-100'
                                                : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
                                                }`}
                                        >
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${m.gender === 'male' ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
                                                {m.firstName[0]}{m.lastName[0]}
                                            </div>
                                            <div className="text-left">
                                                <div className="text-xs font-medium">{m.firstName} {m.lastName}</div>
                                                <div className="text-[9px] text-slate-600 capitalize">{m.occupation || 'Family Member'}</div>
                                            </div>
                                            {m.aiPersonality?.isActive && (
                                                <span className="ml-auto text-[8px] font-bold uppercase tracking-wider text-emerald-400">Active</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Summary of selected connection */}
                        {connection.relationship && (
                            <div className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                                <p className="text-xs text-amber-200">
                                    <strong>{ai.name}</strong> will be connected to St. Joseph as a{' '}
                                    <strong>{RELATIONSHIP_OPTIONS.find(o => o.value === connection.relationship)?.label || connection.relationship}</strong>
                                    {linkedMember ? ` linked to ${linkedMember.firstName} ${linkedMember.lastName}` : ''}.
                                    They will appear in the family council and relationship map.
                                </p>
                            </div>
                        )}

                        <button
                            onClick={handleConnectionSave}
                            className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                        >
                            Save Connection & Continue
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ─ Step: Quiz Intro ─ */}
                {step === 'quiz-intro' && (
                    <div className="p-6 space-y-6">
                        {connection.isFamilyMember && connection.relationship && (
                            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                                <CheckCircle className="w-4 h-4 shrink-0" />
                                <span>
                                    Connected as <strong>{RELATIONSHIP_OPTIONS.find(o => o.value === connection.relationship)?.label}</strong>
                                    {linkedMember ? ` — linked to ${linkedMember.firstName} ${linkedMember.lastName}` : ''}
                                </span>
                            </div>
                        )}

                        <div className="text-center space-y-3">
                            <div className="w-16 h-16 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
                                <BarChart3 className="w-8 h-8 text-violet-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white">50-Question Personality Assessment</h3>
                            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                                Based on the scientifically validated <strong className="text-violet-300">OCEAN / Big Five model</strong>,
                                this quiz will generate a detailed personality profile for <strong className="text-white">{ai.name}</strong> —
                                including traits, archetypes, communication style, strengths, and family role.
                            </p>
                        </div>

                        <div className="grid grid-cols-5 gap-2">
                            {[
                                { key: 'O', label: 'Openness', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
                                { key: 'C', label: 'Conscientiousness', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                                { key: 'E', label: 'Extraversion', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                                { key: 'A', label: 'Agreeableness', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                                { key: 'N', label: 'Emotional Sensitivity', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
                            ].map(trait => (
                                <div key={trait.key} className={`p-2.5 rounded-xl border text-center ${trait.color}`}>
                                    <div className="text-xl font-bold">{trait.key}</div>
                                    <div className="text-[8px] font-medium leading-tight mt-1">{trait.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-slate-800/40 rounded-xl p-4 space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>Answer on behalf of {ai.name}</span>
                                <span className="font-bold text-white">~5–8 minutes</span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                If you're completing this for a deceased or non-present family member, answer as you believe they would.
                                Your knowledge of them shapes the AI's personality.
                            </p>
                        </div>

                        <button
                            onClick={startQuiz}
                            disabled={quizLoading}
                            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
                        >
                            {quizLoading
                                ? <><Loader className="w-4 h-4 animate-spin" /> Loading questions...</>
                                : <><Sparkles className="w-4 h-4" /> Begin Personality Quiz</>
                            }
                        </button>

                        <button
                            onClick={() => setStep('memory')}
                            className="w-full py-2.5 text-slate-500 hover:text-slate-300 text-sm transition-colors underline underline-offset-2"
                        >
                            Skip quiz — add memories manually instead
                        </button>
                    </div>
                )}

                {/* ─ Step: Quiz ─ */}
                {step === 'quiz' && currentQuestion && (
                    <div className="p-6 space-y-5">
                        {/* Progress bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Question {currentQ + 1} of {questions.length}</span>
                                <span>{answeredCount} answered</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="text-[10px] text-slate-600 text-right">
                                Answering on behalf of <strong className="text-slate-400">{ai.name}</strong>
                            </div>
                        </div>

                        {/* Category badge */}
                        <div className="inline-block px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 rounded-lg text-[10px] text-violet-400 font-bold uppercase tracking-wider">
                            {currentQuestion.category}
                        </div>

                        {/* Question */}
                        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-5">
                            <p className="text-base text-white leading-relaxed font-light">
                                {currentQuestion.text}
                            </p>
                        </div>

                        {/* Likert options */}
                        <div className="flex flex-col gap-2">
                            {LIKERT.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => selectAnswer(opt.value)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${answers[currentQuestion.id] === opt.value
                                        ? opt.color + ' scale-[1.02]'
                                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                                        }`}
                                >
                                    <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">{opt.value}</span>
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between pt-2">
                            <button
                                onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                                disabled={currentQ === 0}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" /> Previous
                            </button>

                            {allAnswered ? (
                                <button
                                    onClick={submitQuiz}
                                    disabled={quizLoading}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-500/20"
                                >
                                    {quizLoading ? <><Loader className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4" /> Generate Profile</>}
                                </button>
                            ) : (
                                <button
                                    onClick={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))}
                                    disabled={!answers[currentQuestion.id]}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm text-violet-400 hover:text-violet-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    Next <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ─ Step: Results ─ */}
                {step === 'results' && profile && (
                    <div className="p-6 space-y-5">
                        {/* Hero header */}
                        <div className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20 rounded-2xl p-5 text-center space-y-2">
                            <div className="text-4xl">{profile.archetype?.emoji}</div>
                            <h3 className="text-lg font-bold text-white">{profile.archetype?.name}</h3>
                            <p className="text-sm text-slate-400">{profile.archetype?.description}</p>
                            {connection.isFamilyMember && connection.relationship && (
                                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs text-amber-300">
                                    <Home className="w-3 h-3" />
                                    St. Joseph Family · {RELATIONSHIP_OPTIONS.find(o => o.value === connection.relationship)?.label}
                                    {linkedMember && ` · ${linkedMember.firstName}`}
                                </div>
                            )}
                        </div>

                        {/* OCEAN scores */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Personality Dimensions</h4>
                            {Object.entries(profile.scores || {}).map(([trait, score]) => (
                                <div key={trait} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-300 capitalize">{TRAIT_LABELS[trait] || trait}</span>
                                        <span className="font-bold" style={{ color: TRAIT_COLORS[trait] }}>{Math.round(score as number)}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${score}%`, backgroundColor: TRAIT_COLORS[trait] }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Communication style */}
                        <div className="bg-slate-800/40 rounded-xl p-4 space-y-1">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Communication Style</p>
                            <p className="text-sm text-slate-300">{profile.communication_style}</p>
                        </div>

                        {/* Family role */}
                        <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                            <Heart className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Family Role</p>
                                <p className="text-sm font-medium text-white">{profile.family_role?.role}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{profile.family_role?.description}</p>
                            </div>
                        </div>

                        {/* Strengths + Growth */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <TrendingUp className="w-3 h-3" /> Strengths
                                </p>
                                <ul className="space-y-1">
                                    {(profile.strengths || []).slice(0, 3).map((s, i) => (
                                        <li key={i} className="text-xs text-slate-300 flex items-start gap-1">
                                            <span className="text-emerald-400 mt-0.5">•</span> {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 space-y-2">
                                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Star className="w-3 h-3" /> Growth Areas
                                </p>
                                <ul className="space-y-1">
                                    {(profile.growth_areas || []).slice(0, 3).map((g, i) => (
                                        <li key={i} className="text-xs text-slate-300 flex items-start gap-1">
                                            <span className="text-rose-400 mt-0.5">•</span> {g}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Continue to memory training */}
                        <button
                            onClick={() => setStep('memory')}
                            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                            <ArrowRight className="w-4 h-4" />
                            Continue Adding Memories ({savedCount}/50)
                        </button>
                    </div>
                )}

                {/* ─ Step: Memory ─ */}
                {step === 'memory' && (
                    <div className="p-6 space-y-5">
                        {profile && (
                            <div className="flex items-center gap-3 p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-xs text-violet-300">
                                <Sparkles className="w-4 h-4 shrink-0" />
                                <span>Personality profile saved — <strong>{profile.archetype?.name}</strong>. Keep adding memories to reinforce {ai.name}'s responses.</span>
                            </div>
                        )}

                        {/* Progress */}
                        <div className="bg-slate-800/60 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Memories</span>
                                <span className="font-bold text-white">{savedCount} / 50</span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, (savedCount / 50) * 100)}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-500 text-right">{Math.min(100, Math.round((savedCount / 50) * 100))}% to full activation</p>
                        </div>

                        {/* Memory input */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Add a Memory or Story</label>
                            <textarea
                                value={memory}
                                onChange={e => setMemory(e.target.value)}
                                placeholder={`Share a memory, story, or experience that will shape ${ai.name}'s responses...\n\nExamples:\n• "I love hiking at sunset and feel most alive outdoors"\n• "My biggest challenge was learning to trust after heartbreak"\n• "Music has always been my emotional anchor — especially jazz"`}
                                rows={6}
                                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none"
                            />
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-[10px] text-slate-600">
                                    {memory.length > 0 ? `${memory.trim().split(/\s+/).length} words` : 'Min. 5 words recommended'}
                                </p>
                                <button
                                    onClick={saveMemory}
                                    disabled={!memory.trim() || isSaving}
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                                >
                                    {isSaving ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Brain className="w-4 h-4" /> Save Memory</>}
                                </button>
                            </div>
                        </div>

                        <p className="text-center text-xs text-slate-600">
                            Each memory trains {ai.name}'s personality. {50 - savedCount > 0 ? `${50 - savedCount} more to activate full chat.` : 'Ready to activate!'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Local helpers when backend is offline ──────────────── */

function generateLocalQuestions(): QuizQuestion[] {
    const bank = [
        { id: 'O1', text: 'I often get lost in my imagination, creating vivid scenarios.', category: 'Creativity & Imagination', number: 1 },
        { id: 'O2', text: 'I am deeply moved by art, music, or poetry.', category: 'Creativity & Imagination', number: 2 },
        { id: 'O3', text: 'I experience my emotions deeply and believe feelings are important guides.', category: 'Creativity & Imagination', number: 3 },
        { id: 'O4', text: 'I prefer familiar routines and rarely try new ways of doing things.', category: 'Creativity & Imagination', number: 4 },
        { id: 'O5', text: 'I enjoy tackling abstract or theoretical problems.', category: 'Creativity & Imagination', number: 5 },
        { id: 'C1', text: 'I feel capable and effective in most things I undertake.', category: 'Discipline & Organization', number: 6 },
        { id: 'C2', text: 'I keep my belongings neat and organized.', category: 'Discipline & Organization', number: 7 },
        { id: 'C3', text: 'When I make a promise, I always follow through.', category: 'Discipline & Organization', number: 8 },
        {
            id: 'C4', text: "I lack ambition and don't push myself to achieve more.", category: 'Discipline & Organization', number: 9
        },
        {
            id: 'C5', text: "Once I start a task, I persist until it's done.", category: 'Discipline & Organization', number: 10
        },
        { id: 'E1', text: 'I feel energized after spending time with a large group of people.', category: 'Social Energy', number: 11 },
        { id: 'E2', text: 'I tend to take charge in social situations.', category: 'Social Energy', number: 12 },
        { id: 'E3', text: 'I prefer quiet evenings at home to large social gatherings.', category: 'Social Energy', number: 13 },
        { id: 'E4', text: 'I easily strike up conversations with strangers.', category: 'Social Energy', number: 14 },
        { id: 'E5', text: 'I often seek out excitement and adventure.', category: 'Social Energy', number: 15 },
        { id: 'A1', text: 'I try to be considerate and kind to everyone I meet.', category: 'Empathy & Cooperation', number: 16 },
        {
            id: 'A2', text: "People sometimes tell me I'm too trusting.", category: 'Empathy & Cooperation', number: 17
        },
        { id: 'A3', text: 'I go out of my way to help and support others.', category: 'Empathy & Cooperation', number: 18 },
        { id: 'A4', text: 'I rarely argue or push back, preferring to keep the peace.', category: 'Empathy & Cooperation', number: 19 },
        { id: 'A5', text: 'I feel strong empathy for people who are struggling.', category: 'Empathy & Cooperation', number: 20 },
        { id: 'N1', text: 'I worry about things a lot.', category: 'Emotional Patterns', number: 21 },
        { id: 'N2', text: 'I am easily stressed by unexpected changes.', category: 'Emotional Patterns', number: 22 },
        { id: 'N3', text: 'I tend to stay calm and composed even in difficult situations.', category: 'Emotional Patterns', number: 23 },
        { id: 'N4', text: 'My mood can shift quickly and unexpectedly.', category: 'Emotional Patterns', number: 24 },
        { id: 'N5', text: 'I often feel a low-level sense of anxiety or unease.', category: 'Emotional Patterns', number: 25 },
        // Add 25 more rotated variations for the full 50
        { id: 'O6', text: 'I believe that moral rules are fixed and should not be questioned.', category: 'Creativity & Imagination', number: 26 },
        { id: 'O7', text: 'I actively seek out experiences that challenge my worldview.', category: 'Creativity & Imagination', number: 27 },
        { id: 'O8', text: 'I enjoy exploring big philosophical questions about life and meaning.', category: 'Creativity & Imagination', number: 28 },
        { id: 'O9', text: 'I am drawn to unusual or unconventional ideas.', category: 'Creativity & Imagination', number: 29 },
        { id: 'O10', text: 'I find beauty in everyday objects and ordinary situations.', category: 'Creativity & Imagination', number: 30 },
        { id: 'C6', text: 'I carefully weigh pros and cons before making important decisions.', category: 'Discipline & Organization', number: 31 },
        { id: 'C7', text: 'I strive to be the best at whatever I do.', category: 'Discipline & Organization', number: 32 },
        { id: 'C8', text: 'I tend to put things off until the last minute.', category: 'Discipline & Organization', number: 33 },
        { id: 'C9', text: "I stick to plans and don't deviate once I've decided.", category: 'Discipline & Organization', number: 34 },
        { id: 'C10', text: 'I pay close attention to detail in everything I do.', category: 'Discipline & Organization', number: 35 },
        { id: 'E6', text: 'I am a very active and energetic person.', category: 'Social Energy', number: 36 },
        { id: 'E7', text: 'I express my positive feelings freely and enthusiastically.', category: 'Social Energy', number: 37 },
        { id: 'E8', text: 'I enjoy being the center of attention.', category: 'Social Energy', number: 38 },
        { id: 'E9', text: 'I often feel a need for alone time to recharge.', category: 'Social Energy', number: 39 },
        { id: 'E10', text: 'I find social events stimulating rather than draining.', category: 'Social Energy', number: 40 },
        { id: 'A6', text: 'I believe most people have good intentions.', category: 'Empathy & Cooperation', number: 41 },
        {
            id: 'A7', text: "I avoid confrontations even when I know I'm right.", category: 'Empathy & Cooperation', number: 42
        },
        { id: 'A8', text: 'I genuinely care about the well-being of others.', category: 'Empathy & Cooperation', number: 43 },
        { id: 'A9', text: 'I am sometimes seen as too soft or easily swayed.', category: 'Empathy & Cooperation', number: 44 },
        { id: 'A10', text: 'I enjoy collaborative work more than competing.', category: 'Empathy & Cooperation', number: 45 },
        { id: 'N6', text: 'I handle criticism without becoming defensive.', category: 'Emotional Patterns', number: 46 },
        { id: 'N7', text: 'I sometimes feel overwhelmed by strong emotions.', category: 'Emotional Patterns', number: 47 },
        { id: 'N8', text: 'I bounce back quickly from setbacks and disappointments.', category: 'Emotional Patterns', number: 48 },
        { id: 'N9', text: 'I tend to dwell on past mistakes or failures.', category: 'Emotional Patterns', number: 49 },
        { id: 'N10', text: 'I generally feel settled and at peace with who I am.', category: 'Emotional Patterns', number: 50 },
    ];
    return bank;
}

const TRAIT_LABELS: Record<string, string> = {
    openness: 'Openness',
    conscientiousness: 'Conscientiousness',
    extraversion: 'Extraversion',
    agreeableness: 'Agreeableness',
    neuroticism: 'Emotional Sensitivity',
};

function computeLocalProfile(name: string, id: string, answers: Record<string, number>, questions: QuizQuestion[]): PersonalityProfile {
    const traitMap: Record<string, string[]> = {
        openness: ['O1', 'O2', 'O3', 'O4', 'O5', 'O6', 'O7', 'O8', 'O9', 'O10'],
        conscientiousness: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10'],
        extraversion: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10'],
        agreeableness: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10'],
        neuroticism: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9', 'N10'],
    };
    const reverseIds = new Set(['O4', 'O6', 'O10', 'C4', 'C8', 'E3', 'E9', 'N3', 'N6', 'N8', 'N10']);

    const scores: Record<string, number> = {};
    for (const [trait, ids] of Object.entries(traitMap)) {
        let sum = 0, count = 0;
        for (const qid of ids) {
            const raw = answers[qid];
            if (raw !== undefined) {
                sum += reverseIds.has(qid) ? (6 - raw) : raw;
                count++;
            }
        }
        scores[trait] = count > 0 ? Math.round((sum / (count * 5)) * 100) : 50;
    }

    const dominant = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0];
    const archetypes: Record<string, { name: string; emoji: string; description: string }> = {
        openness: { name: 'The Visionary', emoji: '🔮', description: 'Imaginative, curious, and open to new experiences.' },
        conscientiousness: { name: 'The Steward', emoji: '🏰', description: 'Organized, reliable, and driven by duty and excellence.' },
        extraversion: { name: 'The Connector', emoji: '⚡', description: 'Energetic, warm, and thrives in the company of others.' },
        agreeableness: { name: 'The Nurturer', emoji: '💛', description: 'Compassionate, cooperative, and deeply empathetic.' },
        neuroticism: { name: 'The Empath', emoji: '🌊', description: 'Sensitive, deep-feeling, and emotionally attuned.' },
    };

    const familyRoles: Record<string, { role: string; description: string }> = {
        openness: { role: 'The Story Keeper', description: 'Brings creativity and new perspectives to the family narrative.' },
        conscientiousness: { role: 'The Planner', description: 'Keeps the family organized and ensures promises are kept.' },
        extraversion: { role: 'The Connector', description: 'Brings the family together and nurtures relationships.' },
        agreeableness: { role: 'The Peacemaker', description: 'Mediates conflicts and maintains harmony in the family.' },
        neuroticism: { role: 'The Sensitive Heart', description: 'Attuned to the emotional needs of every family member.' },
    };

    return {
        member_id: id,
        member_name: name,
        scores,
        trait_details: {},
        traits: [dominant, Object.entries(scores).sort((a, b) => b[1] - a[1])[1]?.[0] || ''].filter(Boolean),
        communication_style: scores.extraversion > 60
            ? 'Direct and expressive — prefers open conversations and group discussions.'
            : 'Thoughtful and measured — prefers one-on-one and reflective exchanges.',
        archetype: archetypes[dominant],
        family_role: familyRoles[dominant],
        strengths: [
            dominant === 'agreeableness' ? 'Deep empathy and emotional generosity' : 'Strong sense of personal values',
            dominant === 'conscientiousness' ? 'Exceptional follow-through and reliability' : 'Ability to adapt and grow',
            'Genuine care for those in their circle',
        ],
        growth_areas: [
            scores.neuroticism > 60 ? 'Managing stress and emotional reactivity' : 'Expressing emotions more openly',
            scores.conscientiousness < 50 ? 'Building consistent daily structures' : 'Embracing flexibility and spontaneity',
        ],
        emotional_stability: 100 - scores.neuroticism,
        radar_data: Object.entries(scores).map(([trait, score]) => ({
            subject: TRAIT_LABELS[trait] || trait,
            A: score as number,
            fullMark: 100,
        })),
    };
}
