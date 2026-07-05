/**
 * Derive a 1-5 Likert value from a reviewed transcript.
 *
 * Runs entirely on-device so the voice answer flow needs no server round
 * trip. The user always reviews and can override the suggestion before it
 * counts, so this is a helpful starting point, never the final word.
 */

export interface LikertSuggestion {
    value: number;
    confidence: number;
    rationale: string;
}

const STRONG_AGREE = ['strongly agree', 'absolutely', 'completely agree', 'could not agree more', 'wholeheartedly', 'definitely yes', 'without a doubt'];
const AGREE = ['agree', 'yes', 'that is true', "that's true", 'i think so', 'mostly', 'for the most part', 'i do', 'sounds right', 'true for me'];
const NEUTRAL = ['not sure', 'unsure', 'maybe', 'it depends', 'sometimes', 'neutral', 'in between', 'hard to say', 'both', 'somewhat'];
const DISAGREE = ['disagree', 'no', 'not really', 'that is false', "that's false", 'i do not', "i don't", 'rarely', 'not for me'];
const STRONG_DISAGREE = ['strongly disagree', 'absolutely not', 'never', 'completely disagree', 'not at all', 'definitely not'];

function contains(haystack: string, phrases: string[]): string | null {
    for (const phrase of phrases) {
        if (haystack.includes(phrase)) return phrase;
    }
    return null;
}

export function deriveLikert(transcript: string): LikertSuggestion {
    const text = ` ${transcript.toLowerCase().replace(/\s+/g, ' ').trim()} `;
    if (!text.trim()) {
        return { value: 3, confidence: 0.2, rationale: 'No spoken content was detected, so a neutral answer is suggested. Please review before approving.' };
    }

    // Order matters: check the strongest signals first.
    let hit = contains(text, STRONG_DISAGREE);
    if (hit) return { value: 1, confidence: 0.86, rationale: `Heard a strong disagreement ("${hit.trim()}").` };

    hit = contains(text, STRONG_AGREE);
    if (hit) return { value: 5, confidence: 0.86, rationale: `Heard a strong agreement ("${hit.trim()}").` };

    hit = contains(text, DISAGREE);
    if (hit) return { value: 2, confidence: 0.72, rationale: `Heard a disagreement ("${hit.trim()}").` };

    hit = contains(text, NEUTRAL);
    if (hit) return { value: 3, confidence: 0.6, rationale: `Heard a neutral or conditional response ("${hit.trim()}").` };

    hit = contains(text, AGREE);
    if (hit) return { value: 4, confidence: 0.72, rationale: `Heard an agreement ("${hit.trim()}").` };

    // Negation fallback: "not", "don't", "doesn't" lean toward disagreement.
    if (/\b(not|don't|doesn't|isn't|won't|can't)\b/.test(text)) {
        return { value: 2, confidence: 0.5, rationale: 'The response includes negations, which lean toward mild disagreement. Please confirm.' };
    }

    return { value: 4, confidence: 0.45, rationale: 'No strong signal was found, so a mild agreement is suggested. Please adjust if that is not right.' };
}
