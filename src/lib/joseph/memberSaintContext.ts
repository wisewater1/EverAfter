/**
 * Build a focused context blob that Saint Joseph can use when answering
 * questions about a single family member. The blob is passed through
 * SaintChat's `userContext` prop and ends up in the model's system
 * prompt, so it must:
 *
 *   - be a single string (SaintChat shape today)
 *   - be tight (long context dilutes responses; keep it under ~1.2 KB)
 *   - never include free-text the user did not author
 *   - omit any field whose value is empty or '0' so the model isn't
 *     told "their birthplace: " on members with no birthplace
 *
 * The opening greeting is generated separately so the saint introduces
 * itself in character before the user asks anything.
 */

import {
    getChildren,
    getParents,
    getSpouse,
    type FamilyMember,
} from './genealogy';
import { computeEngramReadiness } from './engramReadiness';

function clip(value: string, max = 160): string {
    if (value.length <= max) return value;
    return value.slice(0, max - 1).trimEnd() + '…';
}

function listLine(label: string, items: string[]): string | null {
    const cleaned = items.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length === 0) return null;
    return `${label}: ${cleaned.join(', ')}`;
}

/**
 * Pull spouse, parents, and children for the subject straight from the
 * genealogy helpers so Saint Joseph knows the relationships around
 * them. We deliberately don't pull siblings or in-laws: the saint
 * stays focused on the line, the context blob stays small, and the
 * model doesn't get distracted by twelve names it can't possibly
 * answer questions about.
 */
function familyContextLines(member: FamilyMember): string[] {
    const lines: string[] = [];

    const spouse = getSpouse(member.id);
    if (spouse) {
        const status = spouse.deathDate ? 'deceased' : 'living';
        lines.push(`Spouse: ${spouse.firstName} ${spouse.lastName} (${status})`);
    }

    const parents = getParents(member.id);
    const children = getChildren(member.id);

    const parentsLine = listLine(
        'Parents',
        parents.map((p) => `${p.firstName} ${p.lastName}`),
    );
    if (parentsLine) lines.push(parentsLine);

    const childrenLine = listLine(
        'Children',
        children.map((c) => `${c.firstName} ${c.lastName}`),
    );
    if (childrenLine) lines.push(childrenLine);

    return lines;
}

export function buildMemberSaintContext(member: FamilyMember): string {
    const readiness = computeEngramReadiness(member);
    const sections: string[] = [];

    const headerBits: string[] = [`${member.firstName} ${member.lastName}`];
    if (member.aiPersonality?.familyRole) {
        headerBits.push(member.aiPersonality.familyRole);
    }
    sections.push(`Subject: ${headerBits.join(' · ')}`);

    const facts: string[] = [];
    if (member.birthDate) facts.push(`Born ${member.birthDate}`);
    if (member.birthPlace) facts.push(`Born in ${member.birthPlace}`);
    if (member.deathDate) facts.push(`Passed away ${member.deathDate}`);
    if (member.occupation) facts.push(`Occupation: ${member.occupation}`);
    if (facts.length > 0) sections.push(facts.join(' · '));

    if (member.bio) sections.push(`Bio: ${clip(member.bio, 240)}`);

    const familyLines = familyContextLines(member);
    if (familyLines.length > 0) sections.push(familyLines.join('\n'));

    if (member.aiPersonality) {
        const ap = member.aiPersonality;
        const personality: string[] = [];
        if (ap.archetype) personality.push(`Archetype: ${ap.archetype}`);
        if (ap.communicationStyle) {
            personality.push(`Communication: ${ap.communicationStyle}`);
        }
        if (Array.isArray(ap.traits) && ap.traits.length > 0) {
            const top = ap.traits
                .slice(0, 5)
                .map((t: unknown) =>
                    typeof t === 'string'
                        ? t
                        : (t as { name?: string })?.name ?? '',
                )
                .filter(Boolean);
            if (top.length > 0) personality.push(`Top traits: ${top.join(', ')}`);
        }
        if (personality.length > 0) sections.push(personality.join('\n'));
    }

    sections.push(
        `Engram readiness: ${readiness.label} (${readiness.score}%) — ${readiness.nextStep}`,
    );

    sections.push(
        "Guidelines: speak as Saint Joseph, family guardian. Be specific to the subject above. Do not invent facts beyond what is provided. If asked about something you don't know about this person, say so plainly and suggest what the user could record next.",
    );

    return sections.join('\n\n');
}

export function buildMemberSaintGreeting(member: FamilyMember): string {
    const relation =
        member.aiPersonality?.familyRole ||
        (member.deathDate ? 'one of your ancestors' : 'someone in your family');
    return `Peace be with you. You've come to me with questions about ${member.firstName}, ${relation}. Ask anything — what they were like, what they taught you, what you might preserve of them — and I will answer with what I know of them in your family.`;
}
