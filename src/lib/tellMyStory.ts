import type { FamilyMember } from './joseph/genealogy';

const TELL_MY_STORY_BASE_URL = 'https://www.tellmystory.ai/home';

function sanitizeSegment(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24);
}

export function buildTellMyStoryReferralCode(member?: Pick<FamilyMember, 'firstName' | 'lastName' | 'id'> | null) {
    if (!member) {
        return 'wise-everafter';
    }

    const first = sanitizeSegment(member.firstName || 'family');
    const last = sanitizeSegment(member.lastName || 'member');
    const suffix = sanitizeSegment(member.id || 'everafter').slice(0, 6) || 'ever';

    return `wise-${first}-${last}-${suffix}`;
}

export function buildTellMyStoryUrl(member?: Pick<FamilyMember, 'firstName' | 'lastName' | 'id'> | null) {
    const url = new URL(TELL_MY_STORY_BASE_URL);
    url.searchParams.set('ref', buildTellMyStoryReferralCode(member));
    return url.toString();
}
