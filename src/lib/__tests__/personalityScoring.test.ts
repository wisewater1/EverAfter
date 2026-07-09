import { describe, it, expect } from 'vitest';
import {
  PERSONALITY_QUESTIONS,
  computeOceanScores,
  computePersonalityProfile,
  resolveArchetype,
  type ScorableQuestion,
} from '../joseph/personalityScoring';

const TRAITS = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const;

// Score formula must match the backend's _compute_scores EXACTLY:
//   score = reverse ? (6 - raw) : raw ; ((mean - 1) / 4) * 100 ; missing -> 50.
function backendScore(questions: ScorableQuestion[], answers: Record<string, number>) {
  const buckets: Record<string, number[]> = { openness: [], conscientiousness: [], extraversion: [], agreeableness: [], neuroticism: [] };
  const byId = new Map(questions.map((q) => [q.id, q]));
  for (const [id, raw] of Object.entries(answers)) {
    const q = byId.get(id);
    if (!q) continue;
    buckets[String(q.trait)].push(q.reverse ? 6 - raw : raw);
  }
  const out: Record<string, number> = {};
  for (const t of TRAITS) {
    const v = buckets[t];
    out[t] = v.length ? Math.round(((v.reduce((a, b) => a + b, 0) / v.length - 1) / 4) * 1000) / 10 : 50;
  }
  return out;
}

describe('computeOceanScores', () => {
  it('matches the backend score formula for the built-in bank', () => {
    let seed = 99;
    const next = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return 1 + (seed % 5); };
    for (let i = 0; i < 50; i++) {
      const answers: Record<string, number> = {};
      for (const q of PERSONALITY_QUESTIONS) answers[q.id] = next();
      expect(computeOceanScores(PERSONALITY_QUESTIONS, answers)).toEqual(backendScore(PERSONALITY_QUESTIONS, answers));
    }
  });

  it('scores an arbitrary bank (e.g. the backend 50-item set) by trait+reverse metadata', () => {
    // Simulate backend-shaped questions with different ids but the same
    // trait/reverse metadata the scorer relies on.
    const backendLike: ScorableQuestion[] = [];
    for (const t of TRAITS) {
      for (let i = 0; i < 10; i++) {
        backendLike.push({ id: `${t}_${i}`, trait: t, reverse: i % 3 === 0, text: '', category: '', number: backendLike.length + 1 });
      }
    }
    const answers: Record<string, number> = {};
    for (const q of backendLike) answers[q.id] = 4;
    const scores = computeOceanScores(backendLike, answers);
    // Every trait scored (none fell back to the 50 default), proving the
    // scorer used the passed bank's ids, not a hardcoded one.
    for (const t of TRAITS) expect(scores[t]).not.toBe(50);
    expect(scores).toEqual(backendScore(backendLike, answers));
  });

  it('missing answers default the trait to 50', () => {
    const scores = computeOceanScores(PERSONALITY_QUESTIONS, {});
    for (const t of TRAITS) expect(scores[t]).toBe(50);
  });
});

describe('computePersonalityProfile (offline == the shape the results screen needs)', () => {
  it('returns real, answer-driven percentages and a resolved archetype', () => {
    const answers: Record<string, number> = {};
    for (const q of PERSONALITY_QUESTIONS) {
      // Drive openness + extraversion high -> The Explorer
      const high = q.trait === 'openness' || q.trait === 'extraversion';
      const want = high ? 5 : 3;
      answers[q.id] = q.reverse ? 6 - want : want;
    }
    const p = computePersonalityProfile(PERSONALITY_QUESTIONS, answers, 'm1', 'Rosa');
    expect(p.member_name).toBe('Rosa');
    expect(p.scores.openness).toBe(100);
    expect(p.scores.extraversion).toBe(100);
    expect(p.archetype.name).toBe('The Explorer');
    expect(p.radar_data).toHaveLength(5);
    expect(p.total_questions).toBe(PERSONALITY_QUESTIONS.length);
  });

  it('does not converge — varied answers spread across many archetypes', () => {
    const seen = new Set<string>();
    let seed = 777;
    const next = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return 1 + (seed % 5); };
    let balanced = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      const answers: Record<string, number> = {};
      for (const q of PERSONALITY_QUESTIONS) answers[q.id] = next();
      const scores = computeOceanScores(PERSONALITY_QUESTIONS, answers);
      const name = resolveArchetype(scores, answers).name;
      seen.add(name);
      if (name === 'The Balanced One') balanced++;
    }
    expect(seen.size).toBeGreaterThanOrEqual(8);
    expect(balanced).toBeLessThan(N * 0.45);
  });
});
