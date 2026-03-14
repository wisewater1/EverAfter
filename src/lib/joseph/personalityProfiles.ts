export interface StoredPersonalityProfile {
    member_id?: string;
    member_name?: string;
    scores?: Record<string, number>;
    trait_details?: Record<string, any>;
    traits?: string[];
    communication_style?: string;
    family_role?: { role?: string; description?: string };
    archetype?: { name?: string; emoji?: string; description?: string };
    strengths?: string[];
    growth_areas?: string[];
    emotional_stability?: number;
    radar_data?: Array<{ subject: string; A: number; fullMark: number }>;
}

const PROFILE_STORAGE_PREFIX = 'everafter_personality_profile_';

export function personalityProfileStorageKey(memberId: string) {
    return `${PROFILE_STORAGE_PREFIX}${memberId}`;
}

export function readStoredPersonalityProfile<T extends StoredPersonalityProfile = StoredPersonalityProfile>(memberId: string): T | null {
    try {
        const raw = localStorage.getItem(personalityProfileStorageKey(memberId));
        return raw ? JSON.parse(raw) as T : null;
    } catch {
        return null;
    }
}

export function storePersonalityProfile(memberId: string, profile: StoredPersonalityProfile) {
    localStorage.setItem(personalityProfileStorageKey(memberId), JSON.stringify(profile));
}

export function toLongTraitScores(scores: Record<string, number> = {}) {
    return {
        openness: scores.openness ?? scores.O ?? 50,
        conscientiousness: scores.conscientiousness ?? scores.C ?? 50,
        extraversion: scores.extraversion ?? scores.E ?? 50,
        agreeableness: scores.agreeableness ?? scores.A ?? 50,
        neuroticism: scores.neuroticism ?? scores.N ?? 50,
    };
}

export function toOceanScores(scores: Record<string, number> = {}) {
    const normalized = toLongTraitScores(scores);
    return {
        O: normalized.openness,
        C: normalized.conscientiousness,
        E: normalized.extraversion,
        A: normalized.agreeableness,
        N: normalized.neuroticism,
    };
}

export function buildRadarDataFromScores(scores: Record<string, number> = {}) {
    const normalized = toLongTraitScores(scores);
    return [
        { subject: 'Openness', A: normalized.openness, fullMark: 100 },
        { subject: 'Conscientiousness', A: normalized.conscientiousness, fullMark: 100 },
        { subject: 'Extraversion', A: normalized.extraversion, fullMark: 100 },
        { subject: 'Agreeableness', A: normalized.agreeableness, fullMark: 100 },
        { subject: 'Emotional Stability', A: Math.max(0, Math.min(100, 100 - normalized.neuroticism)), fullMark: 100 },
    ];
}

export function formatTraitLabel(trait: string) {
    const labels: Record<string, string> = {
        openness: 'Openness',
        conscientiousness: 'Conscientiousness',
        extraversion: 'Extraversion',
        agreeableness: 'Agreeableness',
        neuroticism: 'Emotional Sensitivity',
        O: 'Openness',
        C: 'Conscientiousness',
        E: 'Extraversion',
        A: 'Agreeableness',
        N: 'Emotional Sensitivity',
    };

    return labels[trait] ?? trait;
}
