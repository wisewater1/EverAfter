/**
 * Family Pattern Explorer — data layer.
 *
 * Reflective, heritability-consistent pattern tool for the "St. Joseph" tab,
 * backed by the Trinity `family_pattern_reflection` action. This is
 * deliberately NOT a Mendelian/Punnett-square genetic predictor: Big Five
 * personality traits are polygenic (governed by many genes of small effect)
 * and substantially shaped by environment, so there is no single "dominant
 * allele" for a trait like extraversion. See trinity_synapse.py's
 * family_pattern_reflection() for the full methodology note.
 *
 * Reuses the existing OCEAN normalization/storage layer
 * (personalityProfiles.ts) rather than introducing a parallel data store.
 */
import { getFamilyMembers } from './genealogy';
import { readStoredPersonalityProfile, toLongTraitScores, formatTraitLabel } from './personalityProfiles';

export type LifeExperienceTag =
    | 'significant_loss'
    | 'major_achievement'
    | 'caregiving_role'
    | 'relocation'
    | 'financial_hardship'
    | 'health_challenge'
    | 'creative_breakthrough'
    | 'community_leadership';

export interface LifeExperienceCatalogEntry {
    tag: LifeExperienceTag;
    label: string;
    emoji: string;
    description: string;
}

// Documented environmental correlates of trait *expression*, not inheritance
// modifiers. Deliberately not framed as "stressors" or "epigenetic
// modifiers" — those terms describe real biological mechanisms this tool
// does not model, and using them here would overclaim precision the
// underlying research doesn't support.
export const LIFE_EXPERIENCE_CATALOG: LifeExperienceCatalogEntry[] = [
    { tag: 'significant_loss', label: 'Significant Loss', emoji: '🕊️', description: 'Bereavement, grief, or another major loss' },
    { tag: 'major_achievement', label: 'Major Achievement', emoji: '🏆', description: 'A defining accomplishment or milestone' },
    { tag: 'caregiving_role', label: 'Caregiving Role', emoji: '🤝', description: 'Sustained caregiving for a family member' },
    { tag: 'relocation', label: 'Relocation', emoji: '🧭', description: 'Moving to a new place, culture, or country' },
    { tag: 'financial_hardship', label: 'Financial Hardship', emoji: '📉', description: 'A period of significant financial strain' },
    { tag: 'health_challenge', label: 'Health Challenge', emoji: '🩺', description: 'A personal or family health challenge' },
    { tag: 'creative_breakthrough', label: 'Creative Breakthrough', emoji: '🎨', description: 'A creative or intellectual breakthrough' },
    { tag: 'community_leadership', label: 'Community Leadership', emoji: '🌟', description: 'Taking on a leadership or community role' },
];

export interface LifeExperienceEntry {
    tag: LifeExperienceTag;
    member_id: string;
    member_name: string;
}

export interface TraitTendencies {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
}

export interface EmotionalBaseline {
    /** -1 (unpleasant) to 1 (pleasant) */
    valence: number;
    /** -1 (calm/deactivated) to 1 (activated) */
    arousal: number;
    quadrant: string;
}

export interface FamilyPatternExperienceNote {
    tag: string;
    member_name: string;
    note: string;
}

export interface FamilyPatternProfile {
    member_a_name: string;
    member_b_name: string;
    blended_tendencies: TraitTendencies;
    trait_labels: Record<string, string>;
    circumplex: EmotionalBaseline;
    experience_notes: FamilyPatternExperienceNote[];
    methodology_note: string;
    disclaimer: string;
    generated_at: string;
}

export interface FamilyPatternMemberOption {
    id: string;
    name: string;
    generationLabel: string;
    hasProfile: boolean;
    traits: TraitTendencies;
}

const GENERATION_LABELS: Record<number, string> = {
    [-3]: 'Great-Great-Grandparent',
    [-2]: 'Great-Grandparent',
    [-1]: 'Grandparent',
    0: 'Parent',
    1: 'Your Generation',
    2: 'Child',
    3: 'Grandchild',
};

export function generationLabel(generation: number | undefined): string {
    if (generation === undefined) return 'Family Member';
    return GENERATION_LABELS[generation] ?? `Generation ${generation}`;
}

/** Real family roster + whatever OCEAN profile (if any) is on file for each
 * member. Members without a completed quiz still appear (population-average
 * 50s via toLongTraitScores' defaults) but are flagged `hasProfile: false`
 * so the UI can make clear the blend is using placeholder tendencies. */
export function getFamilyPatternMemberOptions(): FamilyPatternMemberOption[] {
    return getFamilyMembers().map((member) => {
        const stored = readStoredPersonalityProfile(member.id);
        return {
            id: member.id,
            name: `${member.firstName} ${member.lastName}`.trim() || 'Family Member',
            generationLabel: generationLabel(member.generation),
            hasProfile: Boolean(stored?.scores),
            traits: toLongTraitScores(stored?.scores || {}),
        };
    });
}

export { formatTraitLabel };
