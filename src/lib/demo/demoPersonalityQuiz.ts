/**
 * Demo-mode personality quiz: a real, answer-driven OCEAN model.
 *
 * In demo mode there is no backend, so the questions AND the analysis must be
 * computed locally. This module mirrors the backend's Big-Five scoring closely
 * enough that the profile genuinely reflects what the user answered (the whole
 * point: "no real connection between the questions and the personality" was
 * the demo serving a generic stub instead of scoring the answers).
 */

export interface DemoQuizQuestion {
  id: string;
  text: string;
  category: string;
  number: number;
  trait: 'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism';
  reverse: boolean;
}

// 15 balanced items, 3 per trait, ~1 reverse-keyed each (reduces acquiescence bias).
export const DEMO_QUIZ_QUESTIONS: DemoQuizQuestion[] = [
  { id: 'o1', text: 'I have a vivid imagination and love exploring new ideas.', category: 'Creativity & Imagination', trait: 'openness', reverse: false, number: 1 },
  { id: 'o2', text: 'I prefer familiar routines and dislike sudden change.', category: 'Creativity & Imagination', trait: 'openness', reverse: true, number: 2 },
  { id: 'o3', text: 'Art, music, or poetry can move me deeply.', category: 'Creativity & Imagination', trait: 'openness', reverse: false, number: 3 },
  { id: 'c1', text: 'I keep my belongings organized and plan ahead.', category: 'Discipline & Organization', trait: 'conscientiousness', reverse: false, number: 4 },
  { id: 'c2', text: 'I often leave things until the last minute.', category: 'Discipline & Organization', trait: 'conscientiousness', reverse: true, number: 5 },
  { id: 'c3', text: 'I follow through on the commitments I make.', category: 'Discipline & Organization', trait: 'conscientiousness', reverse: false, number: 6 },
  { id: 'e1', text: 'Being around a lot of people energizes me.', category: 'Social Energy', trait: 'extraversion', reverse: false, number: 7 },
  { id: 'e2', text: 'I prefer a quiet evening alone to a big gathering.', category: 'Social Energy', trait: 'extraversion', reverse: true, number: 8 },
  { id: 'e3', text: 'I find it easy to strike up a conversation with strangers.', category: 'Social Energy', trait: 'extraversion', reverse: false, number: 9 },
  { id: 'a1', text: 'I go out of my way to help others, even at a cost to myself.', category: 'Warmth & Trust', trait: 'agreeableness', reverse: false, number: 10 },
  { id: 'a2', text: 'I can be blunt or critical with people.', category: 'Warmth & Trust', trait: 'agreeableness', reverse: true, number: 11 },
  { id: 'a3', text: 'I trust that most people mean well.', category: 'Warmth & Trust', trait: 'agreeableness', reverse: false, number: 12 },
  { id: 'n1', text: 'I worry about things more than most people do.', category: 'Emotional Sensitivity', trait: 'neuroticism', reverse: false, number: 13 },
  { id: 'n2', text: 'I stay calm and steady under pressure.', category: 'Emotional Sensitivity', trait: 'neuroticism', reverse: true, number: 14 },
  { id: 'n3', text: 'My mood can shift quickly.', category: 'Emotional Sensitivity', trait: 'neuroticism', reverse: false, number: 15 },
];

const BY_ID: Record<string, DemoQuizQuestion> = Object.fromEntries(
  DEMO_QUIZ_QUESTIONS.map((q) => [q.id, q]),
);

type Scores = Record<'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism', number>;

function computeScores(answers: Record<string, number>): Scores {
  const buckets: Record<string, number[]> = {
    openness: [], conscientiousness: [], extraversion: [], agreeableness: [], neuroticism: [],
  };
  for (const [id, raw] of Object.entries(answers)) {
    const q = BY_ID[id];
    if (!q || typeof raw !== 'number') continue;
    buckets[q.trait].push(q.reverse ? 6 - raw : raw);
  }
  const out = {} as Scores;
  (Object.keys(buckets) as (keyof Scores)[]).forEach((trait) => {
    const vals = buckets[trait];
    out[trait] = vals.length
      ? Math.round(((vals.reduce((a, b) => a + b, 0) / vals.length - 1) / 4) * 1000) / 10
      : 50;
  });
  return out;
}

function level(score: number): 'high' | 'medium' | 'low' {
  if (score >= 65) return 'high';
  if (score <= 35) return 'low';
  return 'medium';
}

function deriveTraits(s: Scores): string[] {
  const t: string[] = [];
  if (s.openness >= 65) t.push('Curious', 'Imaginative');
  else if (s.openness <= 35) t.push('Practical', 'Grounded');
  if (s.conscientiousness >= 65) t.push('Organized', 'Dependable');
  else if (s.conscientiousness <= 35) t.push('Spontaneous');
  if (s.extraversion >= 65) t.push('Outgoing', 'Energetic');
  else if (s.extraversion <= 35) t.push('Reflective', 'Reserved');
  if (s.agreeableness >= 65) t.push('Warm', 'Compassionate');
  else if (s.agreeableness <= 35) t.push('Direct', 'Independent');
  if (s.neuroticism <= 35) t.push('Calm', 'Resilient');
  else if (s.neuroticism >= 65) t.push('Sensitive', 'Deeply-feeling');
  return t.length ? t.slice(0, 6) : ['Balanced', 'Adaptable'];
}

function deriveCommunicationStyle(s: Scores): string {
  const warm = s.agreeableness >= 55;
  if (s.extraversion >= 65) return warm ? 'Warm, expressive, and quick to connect' : 'Bold, direct, and energetic';
  if (s.extraversion <= 35) return warm ? 'Gentle, thoughtful, and a careful listener' : 'Reserved, precise, and measured';
  return warm ? 'Approachable and considerate' : 'Even-keeled and matter-of-fact';
}

// Archetype resolution mirrors the backend (backend/app/services/
// personality_quiz.py::_resolve_archetype + ARCHETYPE_PROFILES) EXACTLY, so
// the demo and the real product return the same archetype for the same
// scores. The older demo version had only a handful of decisive rules and
// then fell straight to a "Balanced Soul" default whenever none fired -
// which, on a 5-trait model, is most moderately-varied answer sets, so ~53%
// of random inputs collapsed onto that one label (that's the "always the
// balanced soul no matter what I click" report). The backend already solved
// this: after the decisive rules, only a genuinely dead-center profile gets
// "Balanced", and everything else is matched to its NEAREST archetype
// instead of defaulting. This is that same logic.
interface ArchetypeProfile {
  name: string;
  emoji: string;
  description: string;
  targets: Scores;
}

const ARCHETYPE_PROFILES: ArchetypeProfile[] = [
  { name: 'The Explorer', emoji: '🧭', description: 'Adventurous and magnetic — you seek the unknown and take everyone along for the ride.', targets: { openness: 84, extraversion: 76, agreeableness: 58, conscientiousness: 48, neuroticism: 40 } },
  { name: 'The Guardian', emoji: '🛡️', description: 'Dependable and caring — you protect others while keeping everything in order.', targets: { conscientiousness: 84, agreeableness: 78, extraversion: 48, neuroticism: 38, openness: 42 } },
  { name: 'The Visionary', emoji: '🔮', description: 'Creative and emotionally steady — you envision bold futures with unshakable confidence.', targets: { openness: 84, neuroticism: 20, conscientiousness: 54, extraversion: 54, agreeableness: 52 } },
  { name: 'The Healer', emoji: '💚', description: "Deeply empathetic and emotionally attuned — you sense and soothe pain others can't see.", targets: { agreeableness: 84, neuroticism: 76, openness: 56, extraversion: 46, conscientiousness: 50 } },
  { name: 'The Commander', emoji: '👑', description: 'Assertive and organized — you inspire action and lead with both charisma and competence.', targets: { extraversion: 80, conscientiousness: 78, agreeableness: 42, neuroticism: 34, openness: 56 } },
  { name: 'The Sage', emoji: '📚', description: 'Introspective and intellectually rich — you seek deep truth in solitude.', targets: { openness: 80, extraversion: 22, conscientiousness: 54, neuroticism: 42, agreeableness: 50 } },
  { name: 'The Scholar', emoji: '🎓', description: 'Methodical and reserved — you master your craft through persistent, quiet dedication.', targets: { conscientiousness: 84, extraversion: 24, openness: 52, agreeableness: 48, neuroticism: 44 } },
  { name: 'The Connector', emoji: '🤝', description: 'Warm and outgoing — you build bridges between people and create community.', targets: { extraversion: 78, agreeableness: 78, conscientiousness: 52, neuroticism: 42, openness: 56 } },
  { name: 'The Artist', emoji: '🎨', description: 'Free-spirited and imaginative — you follow inspiration wherever it leads.', targets: { openness: 82, conscientiousness: 22, extraversion: 48, neuroticism: 56, agreeableness: 52 } },
  { name: 'The Architect', emoji: '📐', description: 'Precise and imperturbable — you build reliable systems with calm mastery.', targets: { conscientiousness: 84, neuroticism: 18, openness: 58, extraversion: 36, agreeableness: 46 } },
  { name: 'The Maverick', emoji: '🚀', description: 'Bold and independent — you challenge conventions and forge your own path.', targets: { agreeableness: 18, extraversion: 78, openness: 58, conscientiousness: 46, neuroticism: 38 } },
  { name: 'The Poet', emoji: '🌙', description: 'Emotionally deep and creatively expressive — you transform pain into beauty.', targets: { neuroticism: 82, openness: 74, extraversion: 34, agreeableness: 56, conscientiousness: 34 } },
  { name: 'The Steward', emoji: '🏡', description: 'Quietly devoted and dependable — you serve others through steady, humble action.', targets: { agreeableness: 72, conscientiousness: 70, extraversion: 34, neuroticism: 42, openness: 44 } },
  { name: 'The Catalyst', emoji: '⚡', description: 'Socially confident and emotionally stable — you energize and uplift everyone around you.', targets: { extraversion: 78, neuroticism: 22, agreeableness: 58, openness: 58, conscientiousness: 54 } },
  { name: 'The Sentinel', emoji: '⚓', description: 'Traditional and disciplined — you anchor the family with stability and proven values.', targets: { openness: 20, conscientiousness: 78, agreeableness: 56, neuroticism: 38, extraversion: 46 } },
  { name: 'The Diplomat', emoji: '🕊️', description: 'Composed, agreeable, and socially adept — you navigate tension with grace.', targets: { agreeableness: 76, neuroticism: 24, extraversion: 64, conscientiousness: 54, openness: 56 } },
  { name: 'The Balanced One', emoji: '⚖️', description: 'Well-rounded and adaptable — you navigate life with versatility and inner harmony.', targets: { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 } },
];

function resolveArchetype(s: Scores, answers?: Record<string, number>): { name: string; emoji: string; description: string } {
  const { openness: o, conscientiousness: c, extraversion: e, agreeableness: a, neuroticism: n } = s;

  // 16 decisive rules (identical to the backend, same order).
  if (o > 70 && e > 65) return pick('The Explorer');
  if (c > 70 && a > 65) return pick('The Guardian');
  if (o > 65 && n < 35) return pick('The Visionary');
  if (a > 70 && n > 60) return pick('The Healer');
  if (e > 70 && c > 60) return pick('The Commander');
  if (o > 60 && e < 35) return pick('The Sage');
  if (c > 70 && e < 40) return pick('The Scholar');
  if (e > 65 && a > 60) return pick('The Connector');
  if (o > 60 && c < 35) return pick('The Artist');
  if (c > 65 && n < 35) return pick('The Architect');
  if (a < 35 && e > 60) return pick('The Maverick');
  if (n > 65 && o > 55) return pick('The Poet');
  if (a > 60 && c > 55 && e < 45) return pick('The Steward');
  if (e > 60 && n < 40) return pick('The Catalyst');
  if (o < 40 && c > 60) return pick('The Sentinel');
  if (a > 55 && n < 40 && e > 50) return pick('The Diplomat');

  // Only a genuinely dead-center profile earns "Balanced" - NOT merely the
  // absence of an extreme. A straight-lined answer set (every question the
  // same value) isn't a real "I'm balanced" signal, so it's excluded here
  // and from the nearest-match below.
  const values = Object.values(s);
  const spread = Math.max(...values) - Math.min(...values);
  const distanceFromCenter = values.reduce((sum, v) => sum + Math.abs(v - 50), 0) / values.length;
  const repeatedSingleAnswer = !!answers && new Set(Object.values(answers)).size === 1;
  if (spread <= 10 && distanceFromCenter <= 6 && !repeatedSingleAnswer) return pick('The Balanced One');

  // Nearest-neighbor: match to the closest archetype rather than defaulting.
  const profileScore = (profile: ArchetypeProfile): number => {
    let total = 0;
    let totalWeight = 0;
    (Object.entries(profile.targets) as [keyof Scores, number][]).forEach(([trait, target]) => {
      const actual = s[trait] ?? 50;
      const closeness = Math.max(0, 100 - Math.abs(actual - target) * 1.6);
      const weight = Math.abs(target - 50) >= 20 ? 1.3 : 1.0;
      total += closeness * weight;
      totalWeight += weight;
    });
    return totalWeight ? total / totalWeight : 0;
  };

  const candidates = ARCHETYPE_PROFILES.filter((p) => !(repeatedSingleAnswer && p.name === 'The Balanced One'));
  const best = candidates.reduce((a1, b1) => (profileScore(b1) > profileScore(a1) ? b1 : a1));
  return { name: best.name, emoji: best.emoji, description: best.description };

  function pick(name: string) {
    const p = ARCHETYPE_PROFILES.find((x) => x.name === name)!;
    return { name: p.name, emoji: p.emoji, description: p.description };
  }
}

function deriveFamilyRole(s: Scores): { role: string; description: string } {
  if (s.agreeableness >= 60 && s.conscientiousness >= 60) return { role: 'The Caregiver', description: 'The steady hand the family leans on.' };
  if (s.extraversion >= 65) return { role: 'The Connector', description: 'The one who keeps everyone close.' };
  if (s.openness >= 65) return { role: 'The Storyteller', description: 'The keeper of imagination and memory.' };
  if (s.conscientiousness >= 65) return { role: 'The Planner', description: 'The one who holds it all together.' };
  if (s.neuroticism <= 35) return { role: 'The Anchor', description: 'The calm center when seas get rough.' };
  return { role: 'The Heart', description: 'A cherished, balancing presence.' };
}

/** Build the full profile the results screen + radar expect, from real answers. */
export function buildDemoProfile(answers: Record<string, number>, memberId: string, memberName: string) {
  const scores = computeScores(answers);
  const traitDetails: Record<string, { score: number; level: string }> = {};
  (Object.keys(scores) as (keyof Scores)[]).forEach((t) => {
    traitDetails[t] = { score: scores[t], level: level(scores[t]) };
  });
  return {
    member_id: memberId,
    member_name: memberName,
    scores,
    trait_details: traitDetails,
    traits: deriveTraits(scores),
    communication_style: deriveCommunicationStyle(scores),
    archetype: resolveArchetype(scores, answers),
    family_role: deriveFamilyRole(scores),
    emotional_stability: Math.round((100 - scores.neuroticism) * 10) / 10,
    radar_data: [
      { subject: 'Openness', A: scores.openness, fullMark: 100 },
      { subject: 'Conscientiousness', A: scores.conscientiousness, fullMark: 100 },
      { subject: 'Extraversion', A: scores.extraversion, fullMark: 100 },
      { subject: 'Agreeableness', A: scores.agreeableness, fullMark: 100 },
      { subject: 'Emotional Stability', A: Math.round((100 - scores.neuroticism) * 10) / 10, fullMark: 100 },
    ],
    total_questions: DEMO_QUIZ_QUESTIONS.length,
    answered: Object.keys(answers).length,
    demo: true,
  };
}
