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

function resolveArchetype(s: Scores): { name: string; emoji: string; description: string } {
  const { openness: o, conscientiousness: c, extraversion: e, agreeableness: a, neuroticism: n } = s;
  if (o > 70 && e > 65) return { name: 'The Explorer', emoji: '🧭', description: 'Adventurous and magnetic, you seek the unknown and bring everyone along.' };
  if (c > 70 && a > 65) return { name: 'The Guardian', emoji: '🛡️', description: 'Dependable and caring, you protect others while keeping things in order.' };
  if (o > 65 && n < 35) return { name: 'The Visionary', emoji: '🔮', description: 'Creative and steady, you imagine bold futures with quiet confidence.' };
  if (a > 70 && n > 60) return { name: 'The Healer', emoji: '💚', description: 'Deeply empathetic, you sense and soothe what others miss.' };
  if (e > 70 && c > 60) return { name: 'The Commander', emoji: '👑', description: 'Assertive and organized, you inspire action and lead with competence.' };
  if (o > 60 && e < 35) return { name: 'The Sage', emoji: '📚', description: 'Introspective and rich in thought, you seek deep truth in solitude.' };
  if (e > 65 && a > 60) return { name: 'The Connector', emoji: '🤝', description: 'Warm and outgoing, you build bridges and create community.' };
  if (c > 65 && n < 35) return { name: 'The Architect', emoji: '📐', description: 'Precise and unflappable, you build reliable systems with calm mastery.' };
  if (a > 65) return { name: 'The Nurturer', emoji: '🌿', description: 'Kind and supportive, you make people feel safe and seen.' };
  return { name: 'The Balanced Soul', emoji: '⚖️', description: 'Even and adaptable, you meet each moment with measured grace.' };
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
    archetype: resolveArchetype(scores),
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
