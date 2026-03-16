import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  GitBranch,
  Heart,
  Loader2,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import {
  addFamilyMember,
  addRelationship,
  getFamilyMembers,
  updateFamilyMember,
  type Gender,
} from '../../lib/joseph/genealogy';
import {
  buildRadarDataFromScores,
  storePersonalityProfile,
  toOceanScores,
} from '../../lib/joseph/personalityProfiles';
import { apiClient } from '../../lib/api-client';

interface FirstEngramData {
  firstEngram?: {
    name: string;
    archetype: string;
  };
  personalityQuiz?: {
    answers: Record<string, number>;
    scores?: Record<string, number>;
  };
  familySetup?: {
    selfName?: string;
    relatives: Array<{
      id: string;
      firstName: string;
      lastName: string;
      relationship: 'parent' | 'sibling' | 'spouse' | 'child';
      birthYear?: string;
    }>;
  };
}

interface FirstEngramStepProps {
  data: FirstEngramData;
  onUpdate: (data: FirstEngramData) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  saving: boolean;
  hasHealthProfile: boolean;
  userId: string;
  userEmail: string;
  userName: string;
}

interface Archetype {
  id: string;
  name: string;
  description: string;
  focus: string;
  gradient: string;
  emoji: string;
}

interface StarterQuestion {
  id: string;
  trait: keyof OceanScores;
  text: string;
}

interface RelativeDraft {
  id: string;
  firstName: string;
  lastName: string;
  relationship: 'parent' | 'sibling' | 'spouse' | 'child';
  birthYear?: string;
}

interface OceanScores {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

const ARCHETYPES: Archetype[] = [
  {
    id: 'sage',
    name: 'The Sage',
    description: 'Reflective, research-oriented, and calm under complexity.',
    focus: 'Deep synthesis across memory, wisdom, and long-range planning.',
    gradient: 'from-violet-500 to-sky-400',
    emoji: 'A',
  },
  {
    id: 'caregiver',
    name: 'The Caregiver',
    description: 'Protective, emotionally available, and family-oriented.',
    focus: 'Human warmth, continuity, and clear support signals.',
    gradient: 'from-rose-500 to-amber-400',
    emoji: 'B',
  },
  {
    id: 'explorer',
    name: 'The Explorer',
    description: 'Experimental, adaptive, and open to new paths.',
    focus: 'Discovery loops, growth experiments, and flexible framing.',
    gradient: 'from-cyan-400 to-emerald-400',
    emoji: 'C',
  },
  {
    id: 'operator',
    name: 'The Operator',
    description: 'Structured, disciplined, and execution-focused.',
    focus: 'Plans, systems, routines, and accountability.',
    gradient: 'from-amber-400 to-orange-500',
    emoji: 'D',
  },
];

const STARTER_QUESTIONS: StarterQuestion[] = [
  { id: 'o1', trait: 'openness', text: 'I actively seek new ideas, perspectives, and experiences.' },
  { id: 'o2', trait: 'openness', text: 'I enjoy experimenting with different routines when they may improve results.' },
  { id: 'c1', trait: 'conscientiousness', text: 'I usually follow through on plans once I commit to them.' },
  { id: 'c2', trait: 'conscientiousness', text: 'I like structure, preparation, and tracking progress.' },
  { id: 'e1', trait: 'extraversion', text: 'I gain energy from conversation, collaboration, or group activity.' },
  { id: 'e2', trait: 'extraversion', text: 'I tend to speak up quickly when a decision needs momentum.' },
  { id: 'a1', trait: 'agreeableness', text: 'I naturally consider how my choices affect other people around me.' },
  { id: 'a2', trait: 'agreeableness', text: 'I prefer support and cooperation over confrontation.' },
  { id: 'n1', trait: 'neuroticism', text: 'Stress or uncertainty can stay with me for a long time.' },
  { id: 'n2', trait: 'neuroticism', text: 'When routines break down, I can feel mentally overloaded.' },
];

const RELATIONSHIP_OPTIONS: Array<RelativeDraft['relationship']> = [
  'parent',
  'sibling',
  'spouse',
  'child',
];

const OCEAN_LABELS: Record<keyof OceanScores, string> = {
  openness: 'Openness',
  conscientiousness: 'Conscientiousness',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  neuroticism: 'Emotional sensitivity',
};

function deriveDefaultSelfName(userName: string, userEmail: string) {
  if (userName?.trim()) return userName.trim();
  const localPart = userEmail.split('@')[0] || 'Primary User';
  return localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Primary', lastName: 'User' };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ') || 'User',
  };
}

function getArchetypeSeedScores(archetypeId: string | null): OceanScores {
  switch (archetypeId) {
    case 'sage':
      return { openness: 78, conscientiousness: 63, extraversion: 42, agreeableness: 62, neuroticism: 38 };
    case 'caregiver':
      return { openness: 58, conscientiousness: 64, extraversion: 56, agreeableness: 82, neuroticism: 44 };
    case 'explorer':
      return { openness: 84, conscientiousness: 48, extraversion: 60, agreeableness: 55, neuroticism: 40 };
    case 'operator':
      return { openness: 52, conscientiousness: 82, extraversion: 50, agreeableness: 54, neuroticism: 34 };
    default:
      return { openness: 55, conscientiousness: 55, extraversion: 50, agreeableness: 55, neuroticism: 45 };
  }
}

function buildScoresFromAnswers(
  answers: Record<string, number>,
  archetypeId: string | null
): OceanScores {
  const base = getArchetypeSeedScores(archetypeId);
  const grouped: Record<keyof OceanScores, number[]> = {
    openness: [],
    conscientiousness: [],
    extraversion: [],
    agreeableness: [],
    neuroticism: [],
  };

  STARTER_QUESTIONS.forEach((question) => {
    const answer = answers[question.id];
    if (!answer) return;
    grouped[question.trait].push(answer);
  });

  const answeredCount = Object.keys(answers).length;
  const answerWeight = Math.min(1, answeredCount / STARTER_QUESTIONS.length);

  const blendScore = (trait: keyof OceanScores) => {
    const traitAnswers = grouped[trait];
    if (traitAnswers.length === 0) return base[trait];
    const average = traitAnswers.reduce((sum, current) => sum + current, 0) / traitAnswers.length;
    const scaled = 20 + average * 16;
    return Math.round(base[trait] * (1 - answerWeight) + scaled * answerWeight);
  };

  return {
    openness: blendScore('openness'),
    conscientiousness: blendScore('conscientiousness'),
    extraversion: blendScore('extraversion'),
    agreeableness: blendScore('agreeableness'),
    neuroticism: blendScore('neuroticism'),
  };
}

function describeCommunication(scores: OceanScores) {
  if (scores.conscientiousness >= 70) return 'Prefers structured plans, clear next steps, and measurable progress.';
  if (scores.agreeableness >= 70) return 'Responds best to supportive, collaborative framing with low friction.';
  if (scores.openness >= 70) return 'Engages well with possibility framing, experimentation, and exploratory language.';
  return 'Prefers direct, plain-language summaries with balanced structure and flexibility.';
}

function buildTraits(scores: OceanScores) {
  return Object.entries(scores)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([key]) => OCEAN_LABELS[key as keyof OceanScores]);
}

function buildStoredProfile(
  memberId: string,
  memberName: string,
  engramName: string,
  archetype: Archetype,
  scores: OceanScores
) {
  const toLevel = (score: number) => (score >= 67 ? 'high' : score <= 40 ? 'low' : 'balanced');

  const scoreRecord = {
    openness: scores.openness,
    conscientiousness: scores.conscientiousness,
    extraversion: scores.extraversion,
    agreeableness: scores.agreeableness,
    neuroticism: scores.neuroticism,
  };

  return {
    member_id: memberId,
    member_name: memberName,
    scores: scoreRecord,
    traits: buildTraits(scores),
    communication_style: describeCommunication(scores),
    archetype: {
      name: archetype.name,
      emoji: archetype.emoji,
      description: `${engramName} starts from ${archetype.name.toLowerCase()} framing and will refine over time.`,
    },
    family_role: {
      role: 'Primary steward',
      description: 'Seed profile created during onboarding to anchor Joseph and Delphi.',
    },
    strengths: [
      `Top trait signal: ${buildTraits(scores)[0] || 'Balanced profile'}`,
      scores.conscientiousness >= 65 ? 'Likely to sustain routines when the system is clear.' : 'Needs lighter-weight systems to maintain consistency.',
      scores.agreeableness >= 65 ? 'Likely to respond well to family-based accountability.' : 'Likely to prioritize autonomy in decision making.',
    ],
    growth_areas: [
      scores.neuroticism >= 60 ? 'Stress regulation and more stable fallback routines.' : 'Regular reflection on changing patterns before issues accumulate.',
      scores.extraversion < 45 ? 'More deliberate social support touchpoints.' : 'Protected quiet space for recovery and reflection.',
    ],
    emotional_stability: Math.max(0, 100 - scores.neuroticism),
    radar_data: buildRadarDataFromScores(scoreRecord),
    trait_details: Object.fromEntries(
      Object.entries(scoreRecord).map(([trait, value]) => [
        trait,
        {
          score: value,
          level: toLevel(value),
          description: `${OCEAN_LABELS[trait as keyof OceanScores]} starter signal generated during onboarding.`,
          facets: {},
        },
      ])
    ),
  };
}

function getSectorStates(hasHealthProfile: boolean, hasQuiz: boolean, relativeCount: number) {
  return [
    {
      name: 'Raphael',
      icon: Heart,
      state: hasHealthProfile ? 'live' : 'mock',
      detail: hasHealthProfile ? 'Health profile captured and ready for vitals.' : 'Will open in guided baseline mode until health data lands.',
      accent: 'text-emerald-300',
    },
    {
      name: 'Joseph',
      icon: GitBranch,
      state: relativeCount > 0 ? 'live' : 'mock',
      detail: relativeCount > 0 ? `${relativeCount} family link${relativeCount === 1 ? '' : 's'} will open the family tree with real structure.` : 'Will open with starter genealogy so the dashboard is never empty.',
      accent: 'text-amber-300',
    },
    {
      name: 'Gabriel',
      icon: Wallet,
      state: 'mock',
      detail: 'Finance stays in starter mode until a bank account or transaction source is connected.',
      accent: 'text-cyan-300',
    },
    {
      name: 'Anthony',
      icon: Shield,
      state: 'mock',
      detail: 'Audit surfaces initialize with baseline evidence until the first scan or verifier run.',
      accent: 'text-violet-300',
    },
    {
      name: 'Trinity',
      icon: Sparkles,
      state: hasQuiz || hasHealthProfile || relativeCount > 0 ? 'hybrid' : 'mock',
      detail: 'Combines real sectors when available and labels inferred placeholders where the graph is still thin.',
      accent: 'text-sky-300',
    },
  ];
}

export default function FirstEngramStep({
  data,
  onUpdate,
  onNext,
  onBack,
  onSkip,
  saving,
  hasHealthProfile,
  userId,
  userEmail,
  userName,
}: FirstEngramStepProps) {
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(
    data.firstEngram?.archetype || 'sage'
  );
  const [engramName, setEngramName] = useState(
    data.firstEngram?.name || `${deriveDefaultSelfName(userName, userEmail)} Core`
  );
  const [selfName, setSelfName] = useState(
    data.familySetup?.selfName || deriveDefaultSelfName(userName, userEmail)
  );
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>(
    data.personalityQuiz?.answers || {}
  );
  const [relatives, setRelatives] = useState<RelativeDraft[]>(
    data.familySetup?.relatives || []
  );
  const [draftRelative, setDraftRelative] = useState<RelativeDraft>({
    id: '',
    firstName: '',
    lastName: '',
    relationship: 'parent',
    birthYear: '',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const archetype = ARCHETYPES.find((option) => option.id === selectedArchetype) || ARCHETYPES[0];
  const quizCompletion = Math.round((Object.keys(quizAnswers).length / STARTER_QUESTIONS.length) * 100);
  const scores = useMemo(
    () => buildScoresFromAnswers(quizAnswers, selectedArchetype),
    [quizAnswers, selectedArchetype]
  );

  useEffect(() => {
    onUpdate({
      firstEngram: {
        name: engramName,
        archetype: selectedArchetype || archetype.id,
      },
      personalityQuiz: {
        answers: quizAnswers,
        scores,
      },
      familySetup: {
        selfName,
        relatives,
      },
    });
  }, [archetype.id, engramName, onUpdate, quizAnswers, relatives, scores, selectedArchetype, selfName]);

  const sectorStates = useMemo(
    () => getSectorStates(hasHealthProfile, quizCompletion >= 50, relatives.length),
    [hasHealthProfile, quizCompletion, relatives.length]
  );

  const setAnswer = (questionId: string, value: number) => {
    setQuizAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  };

  const addRelative = () => {
    if (!draftRelative.firstName.trim() || !draftRelative.lastName.trim()) return;

    setRelatives((current) => [
      ...current,
      {
        ...draftRelative,
        id: `relative-${Date.now()}`,
        firstName: draftRelative.firstName.trim(),
        lastName: draftRelative.lastName.trim(),
        birthYear: draftRelative.birthYear?.trim() || undefined,
      },
    ]);
    setDraftRelative({
      id: '',
      firstName: '',
      lastName: '',
      relationship: 'parent',
      birthYear: '',
    });
  };

  const removeRelative = (id: string) => {
    setRelatives((current) => current.filter((relative) => relative.id !== id));
  };

  const createOrReusePrimaryMember = () => {
    const { firstName, lastName } = splitName(selfName);
    const existing = getFamilyMembers().find(
      (member) =>
        member.firstName.toLowerCase() === firstName.toLowerCase() &&
        member.lastName.toLowerCase() === lastName.toLowerCase() &&
        member.generation === 0
    );

    if (existing) return existing;

    return addFamilyMember({
      firstName,
      lastName,
      gender: 'other' as Gender,
      generation: 0,
      bio: `Primary EverAfter profile for ${selfName}.`,
    });
  };

  const ensureRelativeMember = (relative: RelativeDraft, primaryMemberId: string) => {
    const existing = getFamilyMembers().find(
      (member) =>
        member.firstName.toLowerCase() === relative.firstName.toLowerCase() &&
        member.lastName.toLowerCase() === relative.lastName.toLowerCase()
    );

    const generation =
      relative.relationship === 'parent'
        ? -1
        : relative.relationship === 'child'
        ? 1
        : 0;

    const member =
      existing ||
      addFamilyMember({
        firstName: relative.firstName,
        lastName: relative.lastName,
        gender: 'other' as Gender,
        generation,
        birthDate: relative.birthYear ? `${relative.birthYear}-01-01` : undefined,
        bio: `${relative.relationship} seeded during onboarding.`,
      });

    if (relative.relationship === 'parent') {
      addRelationship({ fromId: member.id, toId: primaryMemberId, type: 'parent' });
    } else if (relative.relationship === 'child') {
      addRelationship({ fromId: primaryMemberId, toId: member.id, type: 'parent' });
    } else if (relative.relationship === 'spouse') {
      addRelationship({ fromId: primaryMemberId, toId: member.id, type: 'spouse' });
    } else if (relative.relationship === 'sibling') {
      addRelationship({ fromId: primaryMemberId, toId: member.id, type: 'sibling' });
    }
  };

  const handleCreate = async () => {
    if (!engramName.trim()) {
      setError('Engram name is required.');
      return;
    }

    if (!selfName.trim()) {
      setError('Primary name is required so Joseph can anchor the family tree.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const primaryMember = createOrReusePrimaryMember();
      const storedProfile = buildStoredProfile(
        primaryMember.id,
        selfName,
        engramName,
        archetype,
        scores
      );

      updateFamilyMember(primaryMember.id, {
        aiPersonality: {
          traits: storedProfile.traits,
          communicationStyle: storedProfile.communication_style,
          keyMemories: [],
          voiceDescription: `${archetype.name} seed from onboarding.`,
          isActive: true,
          archetype: archetype.name,
          archetypeEmoji: archetype.emoji,
          familyRole: 'Primary steward',
          scores: storedProfile.scores,
        },
      });
      storePersonalityProfile(primaryMember.id, storedProfile);

      try {
        await apiClient.submitOceanProfile(primaryMember.id, toOceanScores(storedProfile.scores));
      } catch (syncError) {
        console.error('Failed to sync onboarding OCEAN profile:', syncError);
      }

      relatives.forEach((relative) => ensureRelativeMember(relative, primaryMember.id));

      onNext();
    } catch (creationError) {
      console.error('Failed to create onboarding seed:', creationError);
      setError('Could not finish AI and family setup.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Formation layer</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Create AI + Family</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                This step seeds your first Engram, captures an OCEAN starter profile,
                and opens St. Joseph with a family graph instead of a blank screen.
              </p>
            </div>
            <div className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
              {quizCompletion}% OCEAN starter complete
            </div>
          </div>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${archetype.gradient}`}>
                <Brain className="h-6 w-6 text-slate-950" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Engram identity</h3>
                <p className="text-sm text-slate-400">Choose the base personality that will shape the first AI layer.</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">
                Engram name
              </label>
              <input
                type="text"
                value={engramName}
                onChange={(event) => setEngramName(event.target.value)}
                placeholder="e.g. Household Steward, Future Me"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {ARCHETYPES.map((option) => {
                const selected = option.id === selectedArchetype;
                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedArchetype(option.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selected
                        ? 'border-cyan-400/40 bg-cyan-400/10 shadow-[0_0_18px_rgba(56,189,248,0.18)]'
                        : 'border-white/8 bg-slate-950/35 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${option.gradient} text-sm font-semibold text-slate-950`}>
                        {option.emoji}
                      </span>
                      {selected && <Check className="h-4 w-4 text-cyan-300" />}
                    </div>
                    <h4 className="mt-4 text-sm font-medium text-white">{option.name}</h4>
                    <p className="mt-1 text-sm text-slate-400">{option.description}</p>
                    <p className="mt-3 text-xs text-slate-500">{option.focus}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-white">OCEAN starter quiz</h3>
                <p className="mt-1 text-sm text-slate-400">
                  A compact behavioral pass so Joseph, Delphi, and Trinity start from real
                  personality signals.
                </p>
              </div>
              <div className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs text-violet-200">
                {Object.keys(quizAnswers).length}/{STARTER_QUESTIONS.length} answered
              </div>
            </div>

            <div className="space-y-4">
              {STARTER_QUESTIONS.map((question, index) => (
                <div key={question.id} className="rounded-2xl border border-white/8 bg-slate-950/35 p-4">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        {index + 1}. {OCEAN_LABELS[question.trait]}
                      </p>
                      <p className="mt-1 text-sm text-white">{question.text}</p>
                    </div>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                      1-5
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((value) => {
                      const selected = quizAnswers[question.id] === value;
                      return (
                        <button
                          key={value}
                          onClick={() => setAnswer(question.id, value)}
                          className={`rounded-xl border px-0 py-2 text-sm transition ${
                            selected
                              ? 'border-cyan-400/35 bg-cyan-400/12 text-cyan-100'
                              : 'border-white/8 bg-white/[0.02] text-slate-400 hover:border-white/15'
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-5">
              {Object.entries(scores).map(([trait, value]) => (
                <div key={trait} className="rounded-2xl border border-white/8 bg-slate-950/35 p-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
                    {OCEAN_LABELS[trait as keyof OceanScores]}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">{value}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15">
                <Users className="h-6 w-6 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Genealogy starter</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Seed the first Joseph nodes now. If you leave this light, Joseph opens in starter mock mode.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">
                  Primary profile name
                </label>
                <input
                  type="text"
                  value={selfName}
                  onChange={(event) => setSelfName(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
                />
              </div>

              <div className="rounded-2xl border border-white/8 bg-slate-950/35 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={draftRelative.firstName}
                    onChange={(event) =>
                      setDraftRelative((current) => ({ ...current, firstName: event.target.value }))
                    }
                    placeholder="First name"
                    className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                  />
                  <input
                    type="text"
                    value={draftRelative.lastName}
                    onChange={(event) =>
                      setDraftRelative((current) => ({ ...current, lastName: event.target.value }))
                    }
                    placeholder="Last name"
                    className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                  />
                  <select
                    value={draftRelative.relationship}
                    onChange={(event) =>
                      setDraftRelative((current) => ({
                        ...current,
                        relationship: event.target.value as RelativeDraft['relationship'],
                      }))
                    }
                    className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                  >
                    {RELATIONSHIP_OPTIONS.map((relationship) => (
                      <option key={relationship} value={relationship}>
                        {relationship}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={draftRelative.birthYear || ''}
                    onChange={(event) =>
                      setDraftRelative((current) => ({ ...current, birthYear: event.target.value }))
                    }
                    placeholder="Birth year"
                    className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                  />
                </div>
                <button
                  onClick={addRelative}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm text-amber-200 transition hover:bg-amber-400/15"
                >
                  <Plus className="h-4 w-4" />
                  Add family link
                </button>
              </div>

              <div className="space-y-2">
                {relatives.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-5 text-sm text-slate-500">
                    No relatives added yet. Joseph will still open with starter lineage until you replace it with real family data.
                  </div>
                ) : (
                  relatives.map((relative) => (
                    <div
                      key={relative.id}
                      className="flex items-center justify-between rounded-2xl border border-white/8 bg-slate-950/35 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {relative.firstName} {relative.lastName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {relative.relationship}
                          {relative.birthYear ? ` · ${relative.birthYear}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => removeRelative(relative.id)}
                        className="rounded-lg border border-white/8 p-2 text-slate-400 transition hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
            <h3 className="text-lg font-medium text-white">Sector startup states</h3>
            <p className="mt-1 text-sm text-slate-400">
              Unconnected domains still start in useful mock mode instead of rendering empty tabs.
            </p>

            <div className="mt-4 space-y-3">
              {sectorStates.map((sector) => {
                const Icon = sector.icon;
                return (
                  <div key={sector.name} className="rounded-2xl border border-white/8 bg-slate-950/35 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white/5 p-2">
                        <Icon className={`h-4 w-4 ${sector.accent}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{sector.name}</p>
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                            {sector.state}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{sector.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-indigo-400/15 bg-indigo-400/10 p-5">
            <h3 className="text-sm font-medium text-white">What this step creates</h3>
            <ul className="mt-3 space-y-2 text-sm text-indigo-100">
              <li className="flex items-start gap-2">
                <BookOpen className="mt-0.5 h-4 w-4 text-indigo-200" />
                First Engram seed with an archetype and communication baseline.
              </li>
              <li className="flex items-start gap-2">
                <Brain className="mt-0.5 h-4 w-4 text-indigo-200" />
                Starter OCEAN profile saved for Delphi, Joseph, and future saint prompts.
              </li>
              <li className="flex items-start gap-2">
                <GitBranch className="mt-0.5 h-4 w-4 text-indigo-200" />
                Joseph family tree anchor plus any relatives you add now.
              </li>
            </ul>
          </section>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <button
          onClick={onBack}
          disabled={saving || creating}
          className="inline-flex items-center gap-2 px-5 py-3 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onSkip}
            disabled={saving || creating}
            className="px-5 py-3 text-sm text-slate-400 transition hover:text-white"
          >
            Skip for now
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || creating}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 px-8 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_26px_rgba(56,189,248,0.35)] transition hover:scale-[1.01] disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create AI + Family
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
