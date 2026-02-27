import { useState, useCallback, useMemo } from 'react';
import {
    ChevronRight, ChevronLeft, Sparkles, BarChart3, Brain,
    CheckCircle, Users, RefreshCw, Shield, Heart, TrendingUp, BookOpen,
    Activity, Target, Beaker, FileText, Radio
} from 'lucide-react';
import { getFamilyMembers, updateFamilyMember } from '../../lib/joseph/genealogy';
import type { FamilyMember } from '../../lib/joseph/genealogy';
import CausalTwinDashboard from '../causal-twin/CausalTwinDashboard';
import WhatIfSimulator from '../causal-twin/WhatIfSimulator';
import ExperimentLab from '../causal-twin/ExperimentLab';
import EvidenceLedgerView from '../causal-twin/EvidenceLedgerView';
import ModelHealthPanel from '../causal-twin/ModelHealthPanel';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

/* ── Types ───────────────────────────────────────────────── */

interface QuizQuestion {
    id: string;
    text: string;
    category: string;
    number: number;
}

interface FacetDetail {
    score: number;
    label: string;
    level: string;
}

interface TraitDetail {
    score: number;
    level: string;
    description: string;
    facets: Record<string, FacetDetail>;
}

interface Archetype {
    name: string;
    emoji: string;
    description: string;
}

interface FamilyRole {
    role: string;
    description: string;
}

interface PersonalityProfile {
    member_id: string;
    member_name: string;
    scores: Record<string, number>;
    trait_details: Record<string, TraitDetail>;
    traits: string[];
    communication_style: string;
    archetype: Archetype;
    family_role: FamilyRole;
    strengths: string[];
    growth_areas: string[];
    emotional_stability: number;
    radar_data: { subject: string; A: number; fullMark: number }[];
    total_questions: number;
    answered: number;
}

/* ── Constants ───────────────────────────────────────────── */

const LIKERT_OPTIONS = [
    { value: 1, label: 'Strongly Disagree', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    { value: 2, label: 'Disagree', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    { value: 3, label: 'Neutral', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    { value: 4, label: 'Agree', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { value: 5, label: 'Strongly Agree', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
];

const TRAIT_COLORS: Record<string, string> = {
    openness: '#8b5cf6',
    conscientiousness: '#f59e0b',
    extraversion: '#10b981',
    agreeableness: '#3b82f6',
    neuroticism: '#ef4444',
};

const TRAIT_LABELS: Record<string, string> = {
    openness: 'Openness',
    conscientiousness: 'Conscientiousness',
    extraversion: 'Extraversion',
    agreeableness: 'Agreeableness',
    neuroticism: 'Emotional Sensitivity',
};

const CATEGORY_ICONS: Record<string, string> = {
    'Creativity & Imagination': '🎨',
    'Discipline & Organization': '📋',
    'Social Energy': '⚡',
    'Empathy & Cooperation': '💛',
    'Emotional Patterns': '🌊',
};

/* ═══════════════════════════════════════════════════════════ */

interface PersonalityQuizProps {
    onProfileComplete?: (profile: PersonalityProfile) => void;
}

export default function PersonalityQuiz({ onProfileComplete }: PersonalityQuizProps = {}) {
    const members = getFamilyMembers();

    const [phase, setPhase] = useState<'select' | 'quiz' | 'results'>('select');
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [sessionId, setSessionId] = useState('');
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [profile, setProfile] = useState<PersonalityProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [expandedTrait, setExpandedTrait] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'causal-twin' | 'what-if' | 'experiments' | 'evidence' | 'model-health'>('profile');

    const TABS = [
        { id: 'profile', label: 'Traits', icon: Brain },
        { id: 'causal-twin', label: 'Causal Twin', icon: Activity },
        { id: 'what-if', label: 'What If', icon: Target },
        { id: 'experiments', label: 'Experiments', icon: Beaker },
        { id: 'evidence', label: 'Evidence', icon: FileText },
        { id: 'model-health', label: 'Health', icon: Radio },
    ];

    const currentQuestion = questions[currentQ];
    const progress = questions.length > 0 ? ((currentQ + 1) / questions.length * 100) : 0;
    const answeredCount = Object.keys(answers).length;

    const categoryGroups = useMemo(() => {
        const groups: Record<string, QuizQuestion[]> = {};
        questions.forEach(q => {
            if (!groups[q.category]) groups[q.category] = [];
            groups[q.category].push(q);
        });
        return groups;
    }, [questions]);

    // Check local storage for existing progress text
    const getSavedProgressText = (memberId: string) => {
        try {
            const saved = localStorage.getItem(`everafter_quiz_progress_${memberId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed.currentQ === 'number') {
                    return `Resume Quiz (Saved at Q${parsed.currentQ + 1})`;
                }
            }
        } catch { }
        return null;
    };

    /* ── Start quiz ──────────────────────────────────────── */

    const startQuiz = useCallback(async (member: FamilyMember) => {
        setSelectedMember(member);
        const storageKey = `everafter_quiz_progress_${member.id}`;

        // Check for saved progress first
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.sessionId && parsed.questions) {
                    setSessionId(parsed.sessionId);
                    setQuestions(parsed.questions);
                    setAnswers(parsed.answers || {});
                    setCurrentQ(parsed.currentQ || 0);
                    setPhase('quiz');
                    return; // Abort new backend fetch
                }
            }
        } catch (e) {
            console.error("Failed to parse saved quiz progress", e);
        }

        // Otherwise generate a new session
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/personality-quiz/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    member_id: member.id,
                    member_name: `${member.firstName} ${member.lastName}`,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setSessionId(data.session_id);
                setQuestions(data.questions);
                setAnswers({});
                setCurrentQ(0);
                setPhase('quiz');

                // Init blank save file
                localStorage.setItem(storageKey, JSON.stringify({
                    sessionId: data.session_id,
                    questions: data.questions,
                    answers: {},
                    currentQ: 0
                }));
            }
        } catch {
            console.error('Failed to start quiz session');
        }
        setLoading(false);
    }, []);

    const selectAnswer = (value: number) => {
        if (!currentQuestion || !selectedMember) return;

        const newAnswers = { ...answers, [currentQuestion.id]: value };
        setAnswers(newAnswers);

        const isLastQuestion = currentQ >= questions.length - 1;
        const nextQ = isLastQuestion ? currentQ : currentQ + 1;

        // Save progress locally
        const storageKey = `everafter_quiz_progress_${selectedMember.id}`;
        localStorage.setItem(storageKey, JSON.stringify({
            sessionId,
            questions,
            answers: newAnswers,
            currentQ: nextQ
        }));

        if (!isLastQuestion) {
            setTimeout(() => setCurrentQ(nextQ), 300);
        }
    };

    /* ── Submit ───────────────────────────────────────────── */

    const submitQuiz = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/personality-quiz/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, answers }),
            });
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
                setPhase('results');

                // Wipe local storage file since we submitted
                if (selectedMember) {
                    localStorage.removeItem(`everafter_quiz_progress_${selectedMember.id}`);
                }

                // Notify parent (e.g., TrainingCenter) so radar updates immediately
                if (onProfileComplete) {
                    onProfileComplete(data);
                }

                // Save to local genealogy + backend
                if (selectedMember && data.traits) {
                    updateFamilyMember(selectedMember.id, {
                        aiPersonality: {
                            traits: data.traits,
                            communicationStyle: data.communication_style || '',
                            keyMemories: selectedMember.aiPersonality?.keyMemories || [],
                            voiceDescription: `${data.archetype?.emoji || ''} ${data.archetype?.name || 'Balanced'} — ${data.archetype?.description || ''}`,
                            isActive: selectedMember.aiPersonality?.isActive || false,
                        },
                    });
                }
            }
        } catch (err) {
            console.error('Submit failed:', err);
        }
        setLoading(false);
    }, [sessionId, answers, selectedMember, onProfileComplete]);

    const restart = () => {
        setPhase('select');
        setProfile(null);
        setQuestions([]);
        setAnswers({});
        setCurrentQ(0);
        setExpandedTrait(null);
    };

    /* ═══════════════════════════════════════════════════════
       RENDER
       ═══════════════════════════════════════════════════════ */

    return (
        <div className="rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 overflow-hidden">

            {/* ── Phase: Select Member ──────────────────────── */}
            {phase === 'select' && (
                <div className="p-6">
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-amber-500/20 flex items-center justify-center mx-auto mb-3">
                            <Brain className="w-7 h-7 text-purple-400" />
                        </div>
                        <h2 className="text-lg font-bold text-white">Personality Analysis</h2>
                        <p className="text-sm text-slate-500 mt-1">50 questions to build a deep psychological profile</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">NEO-PI-R OCEAN model with sub-facet scoring</p>
                    </div>

                    {/* What's measured */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 mb-4">
                        <p className="text-[10px] text-slate-500 font-semibold mb-2">WHAT'S MEASURED</p>
                        <div className="grid grid-cols-1 gap-1.5">
                            {[
                                { trait: 'Openness', facets: 'Imagination · Aesthetics · Feelings · Actions · Ideas · Values', color: 'text-purple-400 bg-purple-500/10' },
                                { trait: 'Conscientiousness', facets: 'Self-Efficacy · Order · Duty · Achievement · Discipline · Deliberation', color: 'text-amber-400 bg-amber-500/10' },
                                { trait: 'Extraversion', facets: 'Warmth · Sociability · Assertiveness · Activity · Excitement · Cheerfulness', color: 'text-emerald-400 bg-emerald-500/10' },
                                { trait: 'Agreeableness', facets: 'Trust · Straightforwardness · Altruism · Cooperation · Modesty · Tenderness', color: 'text-blue-400 bg-blue-500/10' },
                                { trait: 'Emotional Style', facets: 'Anxiety · Hostility · Depression · Self-Consciousness · Impulse · Vulnerability', color: 'text-rose-400 bg-rose-500/10' },
                            ].map(t => (
                                <div key={t.trait} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${t.color.split(' ')[1]}`}>
                                    <span className={`text-[10px] font-bold ${t.color.split(' ')[0]} w-28 flex-shrink-0`}>{t.trait}</span>
                                    <span className="text-[9px] text-slate-600">{t.facets}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 mb-3">Select a family member:</p>

                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {members.filter(m => !m.deathDate).map(m => {
                            const progressText = getSavedProgressText(m.id);

                            return (
                                <button
                                    key={m.id}
                                    onClick={() => startQuiz(m)}
                                    disabled={loading}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/[0.03] transition text-left group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                                        <Users className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white font-medium">{m.firstName} {m.lastName}</p>
                                        <p className={`text-[10px] ${progressText ? 'text-amber-400 font-bold' : 'text-slate-600'}`}>
                                            {progressText || (m.aiPersonality?.traits?.length
                                                ? `${m.aiPersonality.traits.join(', ')}`
                                                : 'No profile yet')}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-purple-400 transition" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Phase: Quiz ──────────────────────────────── */}
            {phase === 'quiz' && currentQuestion && (
                <div className="flex flex-col">
                    {/* Progress bar */}
                    <div className="relative h-1.5 bg-white/5">
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-amber-500 transition-all duration-500 rounded-r-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Header */}
                    <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{CATEGORY_ICONS[currentQuestion.category] || '📝'}</span>
                            <span className="text-[11px] text-slate-500 font-medium">
                                {currentQuestion.category}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-600">
                                {answeredCount}/{questions.length} answered
                            </span>
                            <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">
                                Q{currentQ + 1}
                            </span>
                        </div>
                    </div>

                    {/* Question */}
                    <div className="px-5 py-8">
                        <p className="text-lg text-white font-medium leading-relaxed text-center">
                            "{currentQuestion.text}"
                        </p>
                    </div>

                    {/* Likert scale */}
                    <div className="px-5 pb-5 space-y-2">
                        {LIKERT_OPTIONS.map(opt => {
                            const isSelected = answers[currentQuestion.id] === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => selectAnswer(opt.value)}
                                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 ${isSelected
                                        ? opt.color + ' shadow-lg scale-[1.01]'
                                        : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${isSelected ? 'border-current' : 'border-white/10'
                                        }`}>
                                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-current" />}
                                    </div>
                                    <span className={`text-sm font-medium ${isSelected ? '' : 'text-slate-400'}`}>
                                        {opt.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Navigation */}
                    <div className="px-5 pb-5 flex items-center justify-between">
                        <button
                            onClick={() => {
                                const nextQ = Math.max(0, currentQ - 1);
                                setCurrentQ(nextQ);
                                // Save local progress when going back too
                                if (selectedMember) {
                                    localStorage.setItem(`everafter_quiz_progress_${selectedMember.id}`, JSON.stringify({
                                        sessionId, questions, answers, currentQ: nextQ
                                    }));
                                }
                            }}
                            disabled={currentQ === 0}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white disabled:opacity-30 transition"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" /> Previous
                        </button>

                        {/* Question dots */}
                        <div className="flex gap-0.5 flex-wrap justify-center max-w-[200px]">
                            {Object.entries(categoryGroups).map(([category, qs]) => (
                                <div key={category} className="flex gap-[2px] mr-1.5">
                                    {qs.map(q => {
                                        const idx = questions.findIndex(qq => qq.id === q.id);
                                        const isAnswered = !!answers[q.id];
                                        const isCurrent = idx === currentQ;
                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() => setCurrentQ(idx)}
                                                className={`w-[6px] h-[6px] rounded-full transition-all ${isCurrent
                                                    ? 'bg-purple-400 scale-[1.8]'
                                                    : isAnswered
                                                        ? 'bg-emerald-500/60'
                                                        : 'bg-white/10'
                                                    }`}
                                                title={`Q${idx + 1}`}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        {currentQ === questions.length - 1 ? (
                            <button
                                onClick={submitQuiz}
                                disabled={answeredCount < questions.length * 0.8 || loading}
                                className={`flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold transition ${answeredCount >= questions.length * 0.8
                                    ? 'bg-gradient-to-r from-purple-500 to-amber-500 text-white hover:opacity-90 shadow-lg shadow-purple-500/20'
                                    : 'bg-white/5 text-slate-600'
                                    }`}
                            >
                                {loading ? 'Analyzing…' : 'See Results'} <Sparkles className="w-3.5 h-3.5" />
                            </button>
                        ) : (
                            <button
                                onClick={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white transition"
                            >
                                Next <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Phase: Results ────────────────────────────── */}
            {phase === 'results' && profile && (
                <div className="p-6 space-y-5">
                    {/* Archetype hero */}
                    <div className="text-center bg-gradient-to-br from-purple-500/[0.06] to-amber-500/[0.04] rounded-2xl p-5 border border-white/5">
                        <div className="text-4xl mb-2">{profile.archetype.emoji}</div>
                        <h2 className="text-xl font-bold text-white">{profile.archetype.name}</h2>
                        <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">{profile.archetype.description}</p>
                        <p className="text-[11px] text-slate-600 mt-2">{profile.member_name}'s personality profile</p>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex bg-white/5 p-1 rounded-xl overflow-x-auto no-scrollbar gap-1">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                                        ? 'bg-indigo-500/20 text-indigo-300'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {activeTab === 'causal-twin' && <CausalTwinDashboard memberId={profile.member_id} />}
                    {activeTab === 'what-if' && <WhatIfSimulator memberId={profile.member_id} />}
                    {activeTab === 'experiments' && <ExperimentLab memberId={profile.member_id} />}
                    {activeTab === 'evidence' && <EvidenceLedgerView memberId={profile.member_id} />}
                    {activeTab === 'model-health' && <ModelHealthPanel memberId={profile.member_id} />}

                    <div className={activeTab !== 'profile' ? 'hidden' : 'space-y-5'}>
                        {/* Family role */}
                        {profile.family_role && (
                            <div className="flex items-center gap-3 bg-blue-500/[0.05] border border-blue-500/10 rounded-xl p-3">
                                <Heart className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-blue-300 font-semibold">{profile.family_role.role}</p>
                                    <p className="text-[10px] text-slate-500">{profile.family_role.description}</p>
                                </div>
                            </div>
                        )}

                        {/* OCEAN scores with expandable facets */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                                <BarChart3 className="w-3.5 h-3.5" /> OCEAN Trait Scores
                            </h3>
                            <p className="text-[10px] text-slate-600 -mt-1">Click any trait to see sub-facet breakdown</p>

                            {Object.entries(profile.trait_details).map(([trait, detail]) => (
                                <div key={trait}>
                                    <button
                                        onClick={() => setExpandedTrait(expandedTrait === trait ? null : trait)}
                                        className="w-full text-left space-y-1"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-white font-medium">{TRAIT_LABELS[trait] || trait}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${detail.level === 'high' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    detail.level === 'low' ? 'bg-rose-500/10 text-rose-400' :
                                                        'bg-slate-500/10 text-slate-400'
                                                    }`}>
                                                    {detail.level.toUpperCase()}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-mono">{detail.score.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                        <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${detail.score}%`, backgroundColor: TRAIT_COLORS[trait] || '#888' }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-600">{detail.description}</p>
                                    </button>

                                    {/* Sub-facet breakdown */}
                                    {expandedTrait === trait && detail.facets && (
                                        <div className="ml-3 mt-2 space-y-1.5 border-l-2 pl-3" style={{ borderColor: TRAIT_COLORS[trait] + '40' }}>
                                            {Object.entries(detail.facets).map(([facetKey, facet]) => (
                                                <div key={facetKey} className="space-y-0.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] text-slate-400">{facet.label}</span>
                                                        <span className="text-[9px] text-slate-600 font-mono">{facet.score.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-700"
                                                            style={{ width: `${facet.score}%`, backgroundColor: TRAIT_COLORS[trait] + '80' }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Derived traits */}
                        <div>
                            <h3 className="text-xs font-semibold text-slate-400 mb-2">Key Character Traits</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {profile.traits.map(trait => (
                                    <span key={trait} className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-medium">
                                        {trait}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Communication style */}
                        <div className="bg-white/[0.02] rounded-xl border border-white/5 p-3">
                            <h3 className="text-[10px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" /> Communication Style
                            </h3>
                            <p className="text-xs text-slate-300 leading-relaxed">{profile.communication_style}</p>
                        </div>

                        {/* Strengths & Growth */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-emerald-500/[0.03] border border-emerald-500/10 rounded-xl p-3">
                                <h3 className="text-[10px] font-semibold text-emerald-400 mb-1.5 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" /> Strengths
                                </h3>
                                <ul className="space-y-1">
                                    {profile.strengths?.map((s, i) => (
                                        <li key={i} className="text-[10px] text-slate-400 flex items-start gap-1">
                                            <span className="text-emerald-500 mt-px">•</span> {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-amber-500/[0.03] border border-amber-500/10 rounded-xl p-3">
                                <h3 className="text-[10px] font-semibold text-amber-400 mb-1.5 flex items-center gap-1">
                                    <Shield className="w-3 h-3" /> Growth Areas
                                </h3>
                                <ul className="space-y-1">
                                    {profile.growth_areas?.map((g, i) => (
                                        <li key={i} className="text-[10px] text-slate-400 flex items-start gap-1">
                                            <span className="text-amber-500 mt-px">•</span> {g}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Emotional stability */}
                        <div className="bg-white/[0.02] rounded-xl border border-white/5 p-3">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-[10px] font-semibold text-slate-500">Emotional Stability Index</h3>
                                <span className={`text-[10px] font-mono ${profile.emotional_stability >= 65 ? 'text-emerald-400' :
                                    profile.emotional_stability >= 35 ? 'text-amber-400' : 'text-rose-400'
                                    }`}>{profile.emotional_stability.toFixed(0)}%</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 transition-all duration-1000"
                                    style={{ width: `${profile.emotional_stability}%` }}
                                />
                            </div>
                        </div>

                    </div> {/* End inner wrapper */}

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={restart}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 text-xs font-medium transition"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> New Quiz
                        </button>
                        <button
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-amber-500/20 border border-purple-500/20 text-purple-300 text-xs font-medium transition hover:opacity-90"
                        >
                            <CheckCircle className="w-3.5 h-3.5" /> Profile Saved
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
