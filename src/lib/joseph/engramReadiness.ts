/**
 * Engram readiness — client-side heuristic that scores how far a family
 * member has progressed toward having an active AI engram, using only
 * the fields already on the FamilyMember record (and the local-storage
 * personality profile cache). No network requests, so every tree node
 * can render its own chip without making the tree slow.
 *
 * Four signals, each contributing 25%:
 *   1. The member has an engramId at all (training has been initialized).
 *   2. A personality profile exists locally (the questionnaire has been
 *      taken at least once and produced scores).
 *   3. The member's aiPersonality carries at least one recorded trait
 *      (the trait extraction pipeline has produced output).
 *   4. aiPersonality.isActive is true (the engram is live).
 *
 * The result is a stage (0 / 25 / 50 / 75 / 100) with a human label, a
 * dominant Tailwind color token, and the next step the user can take to
 * push the engram further.
 */

import { readStoredPersonalityProfile } from './personalityProfiles';
import type { FamilyMember } from './genealogy';

export interface EngramReadiness {
    /** 0–100. Always a multiple of 25 in the current heuristic. */
    score: number;
    /** Number of signals satisfied (0–4). */
    signalsMet: number;
    /** Short label fit for a 6–8 char pill. */
    label: 'Not started' | 'In progress' | 'Halfway' | 'Almost ready' | 'Live';
    /** Suggested next thing the user should do for this member. */
    nextStep: string;
    /** Which of the four signals were satisfied — useful for tooltips. */
    signals: {
        engramInitialized: boolean;
        personalityScored: boolean;
        traitsRecorded: boolean;
        engramLive: boolean;
    };
    /** Dominant tone — drives the chip color. */
    tone: 'neutral' | 'amber' | 'emerald' | 'violet';
}

const LABELS: EngramReadiness['label'][] = [
    'Not started',
    'In progress',
    'Halfway',
    'Almost ready',
    'Live',
];

const NEXT_STEPS: string[] = [
    'Create an engram for this family member to start collecting personality data.',
    'Take the personality quiz with this member — it unlocks scoring and the next phase.',
    'Add trait observations or upload a voice sample to keep training moving.',
    "You're one step away — confirm consent and mark the engram live.",
    'Engram is live. You can chat with it from the detail panel.',
];

function readinessTone(signalsMet: number, isLive: boolean): EngramReadiness['tone'] {
    if (isLive) return 'violet';
    if (signalsMet >= 3) return 'emerald';
    if (signalsMet >= 1) return 'amber';
    return 'neutral';
}

export function computeEngramReadiness(member: FamilyMember): EngramReadiness {
    const engramInitialized = Boolean(member.engramId);
    const personalityScored = Boolean(
        readStoredPersonalityProfile(member.id)?.scores,
    );
    const traitsRecorded = Array.isArray(member.aiPersonality?.traits)
        && (member.aiPersonality?.traits?.length ?? 0) > 0;
    const engramLive = Boolean(member.aiPersonality?.isActive);

    const signalsMet =
        Number(engramInitialized) +
        Number(personalityScored) +
        Number(traitsRecorded) +
        Number(engramLive);

    const score = signalsMet * 25;

    return {
        score,
        signalsMet,
        label: LABELS[signalsMet],
        nextStep: NEXT_STEPS[signalsMet],
        signals: {
            engramInitialized,
            personalityScored,
            traitsRecorded,
            engramLive,
        },
        tone: readinessTone(signalsMet, engramLive),
    };
}
