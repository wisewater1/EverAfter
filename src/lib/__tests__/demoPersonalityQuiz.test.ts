import { describe, it, expect } from 'vitest';
import { DEMO_QUIZ_QUESTIONS, buildDemoProfile } from '../demo/demoPersonalityQuiz';

const TRAITS = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const;

// Build answers that drive ONE trait to its max (or min), others neutral.
// Respects reverse-keying so the test stays correct if items change.
function answersForTrait(trait: string, max: boolean): Record<string, number> {
  const a: Record<string, number> = {};
  for (const q of DEMO_QUIZ_QUESTIONS) {
    if (q.trait === trait) {
      const desired = max ? 5 : 1; // intended post-keying value
      a[q.id] = q.reverse ? 6 - desired : desired;
    } else {
      a[q.id] = 3; // neutral
    }
  }
  return a;
}

describe('DEMO_QUIZ_QUESTIONS', () => {
  it('has 15 items, unique ids, covering all five OCEAN traits', () => {
    expect(DEMO_QUIZ_QUESTIONS).toHaveLength(15);
    expect(new Set(DEMO_QUIZ_QUESTIONS.map((q) => q.id)).size).toBe(15);
    for (const t of TRAITS) {
      expect(DEMO_QUIZ_QUESTIONS.some((q) => q.trait === t)).toBe(true);
    }
    // every item is well-formed (the quiz UI + scorer depend on these)
    for (const q of DEMO_QUIZ_QUESTIONS) {
      expect(typeof q.id).toBe('string');
      expect(typeof q.text).toBe('string');
      expect(typeof q.reverse).toBe('boolean');
    }
  });
});

describe('buildDemoProfile', () => {
  it('returns the exact shape the results screen + radar consume', () => {
    const p = buildDemoProfile(answersForTrait('openness', true), 'm1', 'Rosa');
    expect(p.member_name).toBe('Rosa');
    expect(Object.keys(p.scores).sort()).toEqual([...TRAITS].sort());
    expect(Array.isArray(p.traits)).toBe(true);
    expect(p.archetype).toHaveProperty('name');
    expect(p.archetype).toHaveProperty('emoji');
    expect(p.family_role).toHaveProperty('role');
    expect(Array.isArray(p.radar_data)).toBe(true);
    expect(p.radar_data).toHaveLength(5);
  });

  // The bug this guards: the analysis must genuinely reflect the answers
  // (it used to return a generic/default profile disconnected from them).
  it('analysis tracks the answers through reverse-keying (high=100, low=0)', () => {
    for (const t of TRAITS) {
      expect(buildDemoProfile(answersForTrait(t, true), 'm', 'X').scores[t]).toBe(100);
      expect(buildDemoProfile(answersForTrait(t, false), 'm', 'X').scores[t]).toBe(0);
    }
  });

  it('distinct answer profiles yield different archetypes', () => {
    const setMulti = (high: string[]): Record<string, number> => {
      const a: Record<string, number> = {};
      for (const q of DEMO_QUIZ_QUESTIONS) {
        const want = high.includes(q.trait) ? 5 : 1;
        a[q.id] = q.reverse ? 6 - want : want;
      }
      return a;
    };
    const explorer = buildDemoProfile(setMulti(['openness', 'extraversion']), 'm', 'X');
    const allLow = buildDemoProfile(setMulti([]), 'm', 'X');
    expect(explorer.archetype.name).not.toBe(allLow.archetype.name);
  });

  it('empty/partial answers default to neutral (50) and never crash', () => {
    const p = buildDemoProfile({}, 'm', 'X');
    for (const t of TRAITS) expect(p.scores[t]).toBe(50);
    expect(Array.isArray(p.traits)).toBe(true);
    expect(p.archetype.name.length).toBeGreaterThan(0);
  });

  // The reported bug: "I can press any random buttons and it always defaults
  // to the Balanced Soul result." The old resolver fell straight to a single
  // "Balanced" label whenever no decisive rule fired (most moderate answer
  // sets), so ~53% of varied inputs converged on it. This guards that the
  // resolver now matches to the NEAREST archetype instead of defaulting -
  // varied answers must produce a spread of archetypes, not one dominant one.
  it('does not converge to one archetype across many distinct answer sets', () => {
    const seen = new Map<string, number>();
    // deterministic pseudo-random answer sets (no Math.random, so it's stable)
    let seed = 1234567;
    const next = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return 1 + (seed % 5);
    };
    for (let i = 0; i < 300; i++) {
      const answers: Record<string, number> = {};
      for (const q of DEMO_QUIZ_QUESTIONS) answers[q.id] = next();
      const name = buildDemoProfile(answers, 'm', 'X').archetype.name;
      seen.set(name, (seen.get(name) || 0) + 1);
    }
    // Many distinct archetypes appear, and none dominates the way the old
    // Balanced-default did (previously a single label took >50%).
    expect(seen.size).toBeGreaterThanOrEqual(8);
    const mostCommon = Math.max(...seen.values());
    expect(mostCommon).toBeLessThan(300 * 0.45);
  });

  // Answer-driven, and consistent with the backend's named archetypes.
  it('maps clearly-extreme profiles to the matching archetype', () => {
    const drive = (highs: string[], lows: string[]): Record<string, number> => {
      const a: Record<string, number> = {};
      for (const q of DEMO_QUIZ_QUESTIONS) {
        let want = 3;
        if (highs.includes(q.trait)) want = 5;
        else if (lows.includes(q.trait)) want = 1;
        a[q.id] = q.reverse ? 6 - want : want;
      }
      return a;
    };
    // openness + extraversion maxed -> The Explorer (first decisive rule)
    expect(buildDemoProfile(drive(['openness', 'extraversion'], []), 'm', 'X').archetype.name).toBe('The Explorer');
    // conscientiousness maxed, neuroticism floored -> The Architect
    expect(buildDemoProfile(drive(['conscientiousness'], ['neuroticism']), 'm', 'X').archetype.name).toBe('The Architect');
  });
});
