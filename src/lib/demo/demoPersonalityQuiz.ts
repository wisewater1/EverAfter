/**
 * Demo-mode personality quiz.
 *
 * The scoring, archetype resolution, and question bank now live in the shared,
 * non-demo-gated module src/lib/joseph/personalityScoring.ts — the SAME code
 * the real product's offline fallback uses — so a demo profile and a
 * (backend-down) real profile are computed identically. This file just adapts
 * that canonical logic to the demo interceptor's expected names/shape.
 */
import {
  PERSONALITY_QUESTIONS,
  computePersonalityProfile,
  type ScorableQuestion,
} from '../joseph/personalityScoring';

export type DemoQuizQuestion = ScorableQuestion & {
  id: string;
  text: string;
  category: string;
  number: number;
  trait: 'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism';
  reverse: boolean;
};

// The demo bank IS the canonical offline bank.
export const DEMO_QUIZ_QUESTIONS = PERSONALITY_QUESTIONS as DemoQuizQuestion[];

/** Build the full profile the demo results screen + radar expect, from real
 * answers. Marked `demo: true` for the demo interceptor; the analysis itself
 * is the same genuine, answer-driven scoring the real product uses. */
export function buildDemoProfile(answers: Record<string, number>, memberId: string, memberName: string) {
  const profile = computePersonalityProfile(DEMO_QUIZ_QUESTIONS, answers, memberId, memberName);
  return { ...profile, demo: true };
}
