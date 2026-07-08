// Genealogy data layer for St. Joseph Family Tree
// With localStorage persistence, AI Agent personality generation,
// and GeneWeb-inspired genealogy tools (GEDCOM, relationship paths, source citations)

import { requestBackendJson } from '../backend-request';
import { isDemoAuthEnabled } from '../demo-auth';
import { isDevelopment } from '../env';
import { supabase } from '../supabase';
import {
    backfillGenealogy,
    fetchGenealogyFromSupabase,
    getGenealogyUserId,
    pushEvent,
    pushMember,
    pushRelationship,
    subscribeToGenealogyRealtime,
} from './genealogySync';
export type Gender = 'male' | 'female' | 'other';
export type RelationType = 'parent' | 'child' | 'spouse' | 'sibling';
export type EventType = 'birth' | 'marriage' | 'death' | 'milestone' | 'adoption';

export interface AIPersonality {
    traits: string[];
    communicationStyle: string;
    keyMemories: string[];
    voiceDescription: string;
    isActive: boolean;
    archetype?: string;
    archetypeEmoji?: string;
    familyRole?: string;
    scores?: Record<string, number>;
}

export interface InfoStackEntry {
    id: string;
    category: 'trait' | 'date' | 'occupation' | 'health' | 'milestone' | 'relationship' | 'location' | 'interest' | 'quote' | 'appearance' | 'other';
    label: string;
    value: string;
    source: 'ai_extracted' | 'manual' | 'imported';
    confidence: number;
    created_at: string;
    updated_at: string;
    locked: boolean;
}

export interface MediaPermissions {
    allowAIProcessing: boolean;
    allowImageAnalysis: boolean;
    allowVideoAnalysis: boolean;
    allowTextAnalysis: boolean;
    grantedAt?: string;
}

export interface FamilyMember {
    id: string;
    firstName: string;
    lastName: string;
    gender: Gender;
    birthDate?: string;
    deathDate?: string;
    birthPlace?: string;
    photo?: string;
    bio?: string;
    generation: number;
    aiPersonality?: AIPersonality;
    // GeneWeb-inspired fields
    occupation?: string;
    notes?: string[];
    sources?: SourceCitation[];
    // Agency & Integration
    engramId?: string; // Links to backend persistence
    githubUsername?: string;
    githubTraits?: any[];
    // Media Intelligence
    infoStack?: InfoStackEntry[];
    mediaPermissions?: MediaPermissions;
    // Calendar integration: an iCal/ICS feed URL (Google "secret iCal address",
    // Apple/Outlook published calendar). Keyless: any provider that exports iCal.
    calendarUrl?: string;
}

export interface Relationship {
    id: string;
    fromId: string;
    toId: string;
    type: RelationType;
    marriageDate?: string;
    divorceDate?: string;
}

export interface FamilyEvent {
    id: string;
    memberId: string;
    memberName: string;
    type: EventType;
    date: string;
    title: string;
    description?: string;
    mediaUrl?: string; // Phase 5.4 Support rich media
    linkedEngramIds?: string[];
}

export interface FamilyTreeNode {
    member: FamilyMember;
    spouse?: FamilyMember;
    children: FamilyTreeNode[];
}

// ── GeneWeb-Inspired Interfaces ────────────────────────────

export interface SourceCitation {
    id: string;
    title: string;
    repository?: string;
    page?: string;
    date?: string;
    url?: string;
    notes?: string;
    type: 'birth_certificate' | 'census' | 'church_record' | 'immigration' | 'military' | 'newspaper' | 'photo' | 'other';
}

export interface SearchFilters {
    name?: string;
    dateFrom?: string;
    dateTo?: string;
    place?: string;
    occupation?: string;
    generation?: number;
    hasAI?: boolean;
    isDeceased?: boolean;
}

export interface RelationshipPathStep {
    memberId: string;
    memberName: string;
    relationship: string; // e.g. 'parent', 'child', 'spouse'
}

export interface ConsanguinityResult {
    person1: string;
    person2: string;
    sharedAncestors: { ancestor: FamilyMember; pathLength1: number; pathLength2: number }[];
    coefficient: number;
}

// ── LocalStorage Keys ──────────────────────────────────────

const STORAGE_KEYS = {
    members: 'everafter_family_members',
    relationships: 'everafter_family_relationships',
    events: 'everafter_family_events',
    sources: 'everafter_family_sources',
};

// The keys above are namespaced by demo-vs-live (see storageKey()) but NOT
// by which real account is signed in. On a shared or reused browser, signing
// into a second real account left the first account's cached tree in place -
// it would render (and could even get pushed to Supabase under the new
// account's id) until something happened to overwrite it. This marker records
// which user_id the live cache currently belongs to, so a mismatch can be
// detected and the stale cache discarded before it leaks or gets backfilled
// into the wrong account.
const OWNER_STORAGE_KEY = 'everafter_family_cache_owner';

function getCachedOwnerUserId(): string | null {
    try {
        return localStorage.getItem(OWNER_STORAGE_KEY);
    } catch {
        return null;
    }
}

function setCachedOwnerUserId(userId: string): void {
    try {
        localStorage.setItem(OWNER_STORAGE_KEY, userId);
    } catch {
        // Ignore storage failures.
    }
}

// ── Default Mock Data ──────────────────────────────────────

const DEFAULT_MEMBERS: FamilyMember[] = [
    { id: 'gp1', firstName: 'William', lastName: 'Anderson', gender: 'male', birthDate: '1935-03-12', deathDate: '2010-11-30', birthPlace: 'Chicago, IL', generation: -2, bio: 'Served in the Korean War. Worked as a mechanical engineer for 35 years.' },
    { id: 'gp2', firstName: 'Margaret', lastName: 'Anderson', gender: 'female', birthDate: '1938-07-22', birthPlace: 'Milwaukee, WI', generation: -2, bio: 'Retired schoolteacher. Known for her incredible apple pies.', aiPersonality: { traits: ['Warm', 'Patient', 'Nurturing', 'Wise'], communicationStyle: 'Speaks gently and encouragingly, always finding the teaching moment.', keyMemories: [], voiceDescription: '🤱 The Caregiver, warm and steady', isActive: false, archetype: 'The Caregiver', archetypeEmoji: '🤱', familyRole: 'Matriarch', scores: { O: 60, C: 82, E: 55, A: 90, N: 30 } } },
    { id: 'gp3', firstName: 'Robert', lastName: 'Mitchell', gender: 'male', birthDate: '1933-01-05', deathDate: '2015-06-18', birthPlace: 'Detroit, MI', generation: -2, bio: 'Founded Mitchell Hardware. Community leader and church deacon.' },
    { id: 'gp4', firstName: 'Eleanor', lastName: 'Mitchell', gender: 'female', birthDate: '1937-09-14', deathDate: '2020-02-28', birthPlace: 'Detroit, MI', generation: -2, bio: 'Volunteer nurse. Active in local charity organizations.' },
    { id: 'p1', firstName: 'James', lastName: 'Anderson', gender: 'male', birthDate: '1962-05-20', birthPlace: 'Chicago, IL', generation: -1, bio: 'Software architect. Enjoys woodworking and fishing.', aiPersonality: { traits: ['Analytical', 'Steady', 'Devoted', 'Practical'], communicationStyle: 'Measured and precise; thinks before speaking and values getting it right.', keyMemories: [], voiceDescription: '🛠️ The Builder, steady and dependable', isActive: false, archetype: 'The Builder', archetypeEmoji: '🛠️', familyRole: 'Provider', scores: { O: 58, C: 88, E: 42, A: 70, N: 28 } } },
    { id: 'p2', firstName: 'Susan', lastName: 'Anderson', gender: 'female', birthDate: '1965-11-08', birthPlace: 'Detroit, MI', generation: -1, bio: 'Pediatric nurse. Marathon runner and avid gardener.' },
    { id: 'u1', firstName: 'Alice', lastName: 'Anderson', gender: 'female', birthDate: '1990-04-15', birthPlace: 'Evanston, IL', generation: 0, bio: 'Product designer. Loves hiking and photography.', aiPersonality: { traits: ['Creative', 'Curious', 'Energetic', 'Open'], communicationStyle: 'Bright and inquisitive; loves exploring ideas out loud.', keyMemories: [], voiceDescription: '🧭 The Explorer, curious and energetic', isActive: false, archetype: 'The Explorer', archetypeEmoji: '🧭', familyRole: 'Creative', scores: { O: 90, C: 64, E: 80, A: 72, N: 40 } } },
    { id: 'u2', firstName: 'Daniel', lastName: 'Anderson', gender: 'male', birthDate: '1993-08-22', birthPlace: 'Evanston, IL', generation: 0, bio: 'High school teacher. Coaches the soccer team.' },
    { id: 'u1s', firstName: 'Bob', lastName: 'Chen', gender: 'male', birthDate: '1989-12-03', birthPlace: 'San Francisco, CA', generation: 0, bio: 'Data engineer. Amateur chef and craft beer enthusiast.' },
    { id: 'c1', firstName: 'Charlie', lastName: 'Chen', gender: 'male', birthDate: '2018-06-10', birthPlace: 'Chicago, IL', generation: 1, bio: 'Loves dinosaurs and building blocks.' },
    { id: 'c2', firstName: 'Lily', lastName: 'Chen', gender: 'female', birthDate: '2021-03-25', birthPlace: 'Chicago, IL', generation: 1, bio: 'The family\'s little sunshine.' },
];

const DEFAULT_RELATIONSHIPS: Relationship[] = [
    { id: 'r1', fromId: 'gp1', toId: 'gp2', type: 'spouse', marriageDate: '1957-06-15' },
    { id: 'r2', fromId: 'gp3', toId: 'gp4', type: 'spouse', marriageDate: '1959-09-20' },
    { id: 'r3', fromId: 'gp1', toId: 'p1', type: 'parent' },
    { id: 'r4', fromId: 'gp2', toId: 'p1', type: 'parent' },
    { id: 'r5', fromId: 'gp3', toId: 'p2', type: 'parent' },
    { id: 'r6', fromId: 'gp4', toId: 'p2', type: 'parent' },
    { id: 'r7', fromId: 'p1', toId: 'p2', type: 'spouse', marriageDate: '1988-08-12' },
    { id: 'r8', fromId: 'p1', toId: 'u1', type: 'parent' },
    { id: 'r9', fromId: 'p2', toId: 'u1', type: 'parent' },
    { id: 'r10', fromId: 'p1', toId: 'u2', type: 'parent' },
    { id: 'r11', fromId: 'p2', toId: 'u2', type: 'parent' },
    { id: 'r12', fromId: 'u1', toId: 'u1s', type: 'spouse', marriageDate: '2016-10-08' },
    { id: 'r13', fromId: 'u1', toId: 'u2', type: 'sibling' },
    { id: 'r14', fromId: 'u1', toId: 'c1', type: 'parent' },
    { id: 'r15', fromId: 'u1s', toId: 'c1', type: 'parent' },
    { id: 'r16', fromId: 'u1', toId: 'c2', type: 'parent' },
    { id: 'r17', fromId: 'u1s', toId: 'c2', type: 'parent' },
    { id: 'r18', fromId: 'c1', toId: 'c2', type: 'sibling' },
];

const DEFAULT_EVENTS: FamilyEvent[] = [
    { id: 'ev1', memberId: 'gp1', memberName: 'William Anderson', type: 'birth', date: '1935-03-12', title: 'William Anderson born', description: 'Born in Chicago, IL' },
    { id: 'ev2', memberId: 'gp1', memberName: 'William & Margaret', type: 'marriage', date: '1957-06-15', title: 'William & Margaret married' },
    { id: 'ev3', memberId: 'p1', memberName: 'James Anderson', type: 'birth', date: '1962-05-20', title: 'James Anderson born' },
    { id: 'ev4', memberId: 'p2', memberName: 'Susan Mitchell', type: 'birth', date: '1965-11-08', title: 'Susan Mitchell born' },
    { id: 'ev5', memberId: 'p1', memberName: 'James & Susan', type: 'marriage', date: '1988-08-12', title: 'James & Susan married' },
    { id: 'ev6', memberId: 'u1', memberName: 'Alice Anderson', type: 'birth', date: '1990-04-15', title: 'Alice Anderson born' },
    { id: 'ev7', memberId: 'u2', memberName: 'Daniel Anderson', type: 'birth', date: '1993-08-22', title: 'Daniel Anderson born' },
    { id: 'ev8', memberId: 'gp1', memberName: 'William Anderson', type: 'death', date: '2010-11-30', title: 'William Anderson passed' },
    { id: 'ev9', memberId: 'gp3', memberName: 'Robert Mitchell', type: 'death', date: '2015-06-18', title: 'Robert Mitchell passed' },
    { id: 'ev10', memberId: 'u1', memberName: 'Alice & Bob', type: 'marriage', date: '2016-10-08', title: 'Alice & Bob married' },
    { id: 'ev11', memberId: 'c1', memberName: 'Charlie Chen', type: 'birth', date: '2018-06-10', title: 'Charlie Chen born' },
    { id: 'ev12', memberId: 'gp4', memberName: 'Eleanor Mitchell', type: 'death', date: '2020-02-28', title: 'Eleanor Mitchell passed' },
    { id: 'ev13', memberId: 'c2', memberName: 'Lily Chen', type: 'birth', date: '2021-03-25', title: 'Lily Chen born' },
    { id: 'ev14', memberId: 'u2', memberName: 'Daniel Anderson', type: 'milestone', date: '2023-09-01', title: 'Daniel becomes Head Coach' },
];

// ── Persistence Layer ──────────────────────────────────────

// The sample family ships for demo sessions and local development only.
// Real accounts start from their own data (localStorage cache + the
// canonical Supabase store) and never see the seeded roster.
function seedsEnabled(): boolean {
    return isDemoAuthEnabled() || isDevelopment;
}

// Demo sessions get their own storage namespace so playing with the demo
// never leaks sample-family edits into a real account on the same browser.
function storageKey(key: string): string {
    return isDemoAuthEnabled() ? `${key}:demo` : key;
}

const SEED_MEMBER_IDS = new Set(DEFAULT_MEMBERS.map((m) => m.id));
const SEED_REL_IDS = new Set(DEFAULT_RELATIONSHIPS.map((r) => r.id));
const SEED_EVENT_IDS = new Set(DEFAULT_EVENTS.map((e) => e.id));

/**
 * Remove seeded sample rows that older builds persisted into real users'
 * localStorage, along with any edges/events left dangling by the removal.
 */
function stripSeedData(
    members: FamilyMember[],
    relationships: Relationship[],
    events: FamilyEvent[],
): { members: FamilyMember[]; relationships: Relationship[]; events: FamilyEvent[] } {
    const keptMembers = members.filter((m) => !SEED_MEMBER_IDS.has(m.id));
    const keptIds = new Set(keptMembers.map((m) => m.id));
    return {
        members: keptMembers,
        relationships: relationships.filter(
            (r) => !SEED_REL_IDS.has(r.id) && keptIds.has(r.fromId) && keptIds.has(r.toId),
        ),
        events: events.filter((e) => !SEED_EVENT_IDS.has(e.id) && (!e.memberId || keptIds.has(e.memberId))),
    };
}

function loadOptionalFromStorage<T>(key: string): T[] | null {
    try {
        const stored = localStorage.getItem(storageKey(key));
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function loadStoredOrDevDefaults<T>(key: string, defaults: T[]): T[] {
    const stored = loadOptionalFromStorage<T>(key);
    if (stored) return stored;
    return isDevelopment ? [...defaults] : [];
}

function saveToStorage<T>(key: string, data: T[]): void {
    localStorage.setItem(storageKey(key), JSON.stringify(data));
}

// ── In-memory caches (loaded once from backend) ────────────

function buildLocalGenealogy() {
    const storedMembers = loadOptionalFromStorage<FamilyMember>(STORAGE_KEYS.members);
    const storedRelationships = loadOptionalFromStorage<Relationship>(STORAGE_KEYS.relationships);
    const storedEvents = loadOptionalFromStorage<FamilyEvent>(STORAGE_KEYS.events);
    if (seedsEnabled()) {
        return mergeStoredGenealogy(
            storedMembers,
            storedRelationships,
            storedEvents,
            DEFAULT_MEMBERS,
            DEFAULT_RELATIONSHIPS,
            DEFAULT_EVENTS,
        );
    }
    const stripped = stripSeedData(storedMembers || [], storedRelationships || [], storedEvents || []);
    return mergeStoredGenealogy(stripped.members, stripped.relationships, stripped.events, [], [], []);
}

const INITIAL_GENEALOGY = buildLocalGenealogy();

let _members: FamilyMember[] = INITIAL_GENEALOGY.members;
let _relationships: Relationship[] = INITIAL_GENEALOGY.relationships;
let _events: FamilyEvent[] = INITIAL_GENEALOGY.events;
let _sources: SourceCitation[] = loadStoredOrDevDefaults<SourceCitation>(STORAGE_KEYS.sources, []);
let _genealogyHydrationPromise: Promise<void> | null = null;
let _genealogyHydrated = false;
let _hydratedForMode: 'demo' | 'live' | null = null;
// client graph id -> canonical Supabase family_members.id (uuid)
let _dbIds = new Map<string, string>();

function normalizeName(value: string | undefined | null): string {
    return String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

function memberFullName(member: Pick<FamilyMember, 'firstName' | 'lastName'>): string {
    return `${member.firstName} ${member.lastName}`.trim();
}

function memberBirthDate(member: Partial<FamilyMember>): string {
    return String(member.birthDate || '').slice(0, 10);
}

function localMemberMatch(left: Partial<FamilyMember>, right: Partial<FamilyMember>): boolean {
    const leftName = normalizeName(memberFullName({
        firstName: String(left.firstName || ''),
        lastName: String(left.lastName || ''),
    }));
    const rightName = normalizeName(memberFullName({
        firstName: String(right.firstName || ''),
        lastName: String(right.lastName || ''),
    }));

    if (leftName && rightName && leftName === rightName) {
        const leftBirth = memberBirthDate(left);
        const rightBirth = memberBirthDate(right);
        if (!leftBirth || !rightBirth) return true;
        return leftBirth === rightBirth;
    }

    return false;
}

function backendBirthDate(node: any): string {
    return String(node?.birthDate || '').slice(0, 10);
}

function splitBackendName(name: string | undefined | null): { firstName: string; lastName: string } {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    return {
        firstName: parts[0] || 'Family',
        lastName: parts.slice(1).join(' ') || 'Member',
    };
}

function relationshipKey(rel: Pick<Relationship, 'fromId' | 'toId' | 'type'>): string {
    if (rel.type === 'spouse' || rel.type === 'sibling') {
        return [rel.fromId, rel.toId].sort().join('::') + `::${rel.type}`;
    }
    return `${rel.fromId}::${rel.toId}::${rel.type}`;
}

function mergeStoredGenealogy(
    storedMembers: FamilyMember[] | null,
    storedRelationships: Relationship[] | null,
    storedEvents: FamilyEvent[] | null,
    defaultsMembers: FamilyMember[],
    defaultsRelationships: Relationship[],
    defaultsEvents: FamilyEvent[],
) {
    const mergedMembers = [...defaultsMembers];
    const oldToResolvedIds = new Map<string, string>();

    for (const storedMember of storedMembers || []) {
        const matched = mergedMembers.find((member) =>
            member.id === storedMember.id || localMemberMatch(member, storedMember),
        );

        if (matched) {
            oldToResolvedIds.set(storedMember.id, matched.id);
            const index = mergedMembers.findIndex((member) => member.id === matched.id);
            mergedMembers[index] = {
                ...matched,
                ...storedMember,
                id: matched.id,
            };
            continue;
        }

        mergedMembers.push(storedMember);
    }

    const remapId = (id: string) => oldToResolvedIds.get(id) || id;
    const mergedRelationships = new Map<string, Relationship>();

    for (const rel of defaultsRelationships) {
        mergedRelationships.set(relationshipKey(rel), rel);
    }

    for (const rel of storedRelationships || []) {
        const remapped: Relationship = {
            ...rel,
            fromId: remapId(rel.fromId),
            toId: remapId(rel.toId),
        };
        mergedRelationships.set(relationshipKey(remapped), remapped);
    }

    const mergedEvents = [...defaultsEvents];
    const seenEventKeys = new Set(
        defaultsEvents.map((event) => `${event.memberId}::${event.type}::${String(event.date).slice(0, 10)}::${event.title}`),
    );

    for (const event of storedEvents || []) {
        const remappedEvent: FamilyEvent = {
            ...event,
            memberId: remapId(event.memberId),
        };
        const key = `${remappedEvent.memberId}::${remappedEvent.type}::${String(remappedEvent.date).slice(0, 10)}::${remappedEvent.title}`;
        if (seenEventKeys.has(key)) {
            continue;
        }
        seenEventKeys.add(key);
        mergedEvents.push(remappedEvent);
    }

    return {
        members: mergedMembers,
        relationships: Array.from(mergedRelationships.values()),
        events: mergedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    };
}

function mergeCanonicalGenealogy(
    backendNodes: any[],
    backendRelationships: any[],
    baseMembers: FamilyMember[],
    baseRelationships: Relationship[],
    baseEvents: FamilyEvent[],
) {
    const mergedMembers = [...baseMembers];
    const oldToCanonicalIds = new Map<string, string>();

    const findMemberMatch = (node: any) => {
        const nodeName = normalizeName(node?.name);
        const nodeBirth = backendBirthDate(node);

        return mergedMembers.find((member) => {
            const sameName = normalizeName(memberFullName(member)) === nodeName;
            if (!sameName) return false;

            const birth = memberBirthDate(member);
            if (!nodeBirth || !birth) return true;
            return birth === nodeBirth;
        });
    };

    for (const node of backendNodes) {
        const matched = findMemberMatch(node);
        const canonicalId = String(node.id);
        const { firstName, lastName } = splitBackendName(node.name);

        if (matched) {
            oldToCanonicalIds.set(matched.id, canonicalId);
            const index = mergedMembers.findIndex((member) => member.id === matched.id);
            mergedMembers[index] = {
                ...matched,
                id: canonicalId,
                firstName,
                lastName,
                gender: (node.gender || matched.gender || 'other') as Gender,
                birthDate: node.birthDate || matched.birthDate,
                deathDate: node.deathDate || matched.deathDate,
                generation: matched.generation,
            };
            continue;
        }

        mergedMembers.push({
            id: canonicalId,
            firstName,
            lastName,
            gender: (node.gender || 'other') as Gender,
            birthDate: node.birthDate,
            deathDate: node.deathDate,
            generation: 0,
        });
    }

    const remapId = (id: string) => oldToCanonicalIds.get(id) || id;

    const mergedRelationships = new Map<string, Relationship>();

    for (const rel of baseRelationships) {
        const remapped: Relationship = {
            ...rel,
            fromId: remapId(rel.fromId),
            toId: remapId(rel.toId),
        };
        mergedRelationships.set(relationshipKey(remapped), remapped);
    }

    for (const rel of backendRelationships) {
        const canonicalRel: Relationship = {
            id: String(rel.id),
            fromId: String(rel.fromNodeId),
            toId: String(rel.toNodeId),
            type: rel.relationType,
        };
        mergedRelationships.set(relationshipKey(canonicalRel), canonicalRel);
    }

    const mergedEvents = baseEvents.map((event) => ({
        ...event,
        memberId: remapId(event.memberId),
    }));

    return {
        members: mergedMembers,
        relationships: Array.from(mergedRelationships.values()),
        events: mergedEvents,
    };
}

// Debounced so a burst of writes (e.g. backfillGenealogy pushing several
// rows in a row) collapses into one re-fetch instead of one per row.
let _realtimeRefreshTimer: ReturnType<typeof setTimeout> | null = null;

async function refreshFromRealtimeChange(userId: string): Promise<void> {
    try {
        const canonical = await fetchGenealogyFromSupabase(userId);
        if (!canonical) return;

        // The just-arrived canonical rows are the authoritative update (they
        // may reflect another tab, another device, or this tab's own write
        // echoing back); current in-memory state is the base they overlay
        // onto, so anything genuinely local-only and not yet synced survives.
        const merged = mergeStoredGenealogy(
            canonical.members,
            canonical.relationships,
            canonical.events,
            _members,
            _relationships,
            _events,
        );
        _members = merged.members;
        _relationships = merged.relationships;
        _events = merged.events;
        _dbIds = canonical.dbIds;
        saveToStorage(STORAGE_KEYS.members, _members);
        saveToStorage(STORAGE_KEYS.relationships, _relationships);
        saveToStorage(STORAGE_KEYS.events, _events);

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('everafter:genealogy-hydrated'));
        }
    } catch (error) {
        console.warn('Genealogy realtime refresh failed', error);
    }
}

function scheduleRealtimeRefresh(userId: string): void {
    if (_realtimeRefreshTimer) clearTimeout(_realtimeRefreshTimer);
    _realtimeRefreshTimer = setTimeout(() => {
        _realtimeRefreshTimer = null;
        void refreshFromRealtimeChange(userId);
    }, 800);
}

// Hydrate the in-memory graph. Order of truth for real accounts:
// 1) canonical Supabase store (family_members + links + events),
// 2) the optional Python backend graph,
// 3) the localStorage cache.
// Whatever ends up loaded locally that the canonical store is missing gets
// backfilled to Supabase in the background, so the tree a user builds is
// durable across devices.
async function loadGenealogyFromBackend() {
    _hydratedForMode = isDemoAuthEnabled() ? 'demo' : 'live';
    const mergedLocal = buildLocalGenealogy();
    let baseMembers = mergedLocal.members;
    let baseRelationships = mergedLocal.relationships;
    let baseEvents = mergedLocal.events;
    const baseSources = loadStoredOrDevDefaults<SourceCitation>(STORAGE_KEYS.sources, []);

    if (isDemoAuthEnabled()) {
        _members = baseMembers;
        _relationships = baseRelationships;
        _events = baseEvents;
        _sources = baseSources;
        return;
    }

    const userId = await getGenealogyUserId();
    if (userId) {
        const cachedOwner = getCachedOwnerUserId();
        if (cachedOwner && cachedOwner !== userId) {
            // The cached tree on this browser belongs to a different real
            // account (e.g. someone signed out and a different person signed
            // in on the same device). Discard it outright rather than merge
            // it in as "local extras" - otherwise it renders immediately and
            // could get backfilled into the wrong account before the
            // canonical Supabase fetch below has a chance to correct it.
            console.warn('Genealogy cache belonged to a different account; discarding it.');
            baseMembers = [];
            baseRelationships = [];
            baseEvents = [];
            saveToStorage(STORAGE_KEYS.members, baseMembers);
            saveToStorage(STORAGE_KEYS.relationships, baseRelationships);
            saveToStorage(STORAGE_KEYS.events, baseEvents);
        }
        setCachedOwnerUserId(userId);
        subscribeToGenealogyRealtime(userId, () => scheduleRealtimeRefresh(userId));
        try {
            const canonical = await fetchGenealogyFromSupabase(userId);
            if (canonical) {
                // Canonical rows are the base; local-only extras overlay and
                // then get pushed back so both sides converge.
                const merged = mergeStoredGenealogy(
                    baseMembers,
                    baseRelationships,
                    baseEvents,
                    canonical.members,
                    canonical.relationships,
                    canonical.events,
                );
                _members = merged.members;
                _relationships = merged.relationships;
                _events = merged.events;
                _sources = baseSources;
                _dbIds = canonical.dbIds;
                saveToStorage(STORAGE_KEYS.members, _members);
                saveToStorage(STORAGE_KEYS.relationships, _relationships);
                saveToStorage(STORAGE_KEYS.events, _events);
                void backfillGenealogy(_members, _relationships, _events, userId, _dbIds).catch((error) =>
                    console.warn('Genealogy backfill failed', error),
                );
                return;
            }
        } catch (error) {
            console.warn('Failed to load genealogy from Supabase', error);
        }
    }

    try {
        const sessionResult = supabase ? await supabase.auth.getSession() : { data: { session: null } };
        const token = sessionResult.data.session?.access_token;
        const data = await requestBackendJson<{ nodes?: any[]; relationships?: any[] }>(
            '/api/v1/genealogy/tree',
            {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
            'Failed to load genealogy from backend',
        );

        if (data.nodes && data.nodes.length > 0) {
            const merged = mergeCanonicalGenealogy(
                data.nodes,
                Array.isArray(data.relationships) ? data.relationships : [],
                baseMembers,
                baseRelationships,
                baseEvents,
            );
            _members = merged.members;
            _relationships = merged.relationships;
            _events = merged.events;
            _sources = baseSources;
            return;
        }
    } catch (error) {
        console.warn('Failed to load genealogy from backend', error);
    }

    _members = baseMembers;
    _relationships = baseRelationships;
    _events = baseEvents;
    _sources = baseSources;

    // New account (or canonical store empty): push whatever the user already
    // built locally, e.g. the family added during onboarding.
    if (userId && _members.length > 0) {
        void backfillGenealogy(_members, _relationships, _events, userId, _dbIds).catch((error) =>
            console.warn('Genealogy backfill failed', error),
        );
    }
}

/**
 * Canonical Supabase uuid for a client graph id, when the member has been
 * persisted. Lets other features (vault, ceremonies, engrams) FK against
 * the same person row instead of re-resolving by name.
 */
export function getCanonicalMemberId(clientId: string): string | undefined {
    return _dbIds.get(clientId);
}

// Best-effort remote write-through for real sessions; local state is already
// saved, so failures only cost durability, never the interaction.
function persistRemote(task: (userId: string) => Promise<void>): void {
    void (async () => {
        try {
            const userId = await getGenealogyUserId();
            if (!userId) return;
            await task(userId);
        } catch (error) {
            console.warn('Genealogy sync failed', error);
        }
    })();
}

export function hydrateGenealogyInBackground(force = false): Promise<void> {
    if (_genealogyHydrated && !force) {
        return Promise.resolve();
    }

    if (_genealogyHydrationPromise && !force) {
        return _genealogyHydrationPromise;
    }

    _genealogyHydrationPromise = loadGenealogyFromBackend()
        .catch((error) => {
            console.warn('Genealogy hydration fell back to local cache', error);
        })
        .finally(() => {
            _genealogyHydrated = true;
            _genealogyHydrationPromise = null;
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('everafter:genealogy-hydrated'));
            }
        });

    return _genealogyHydrationPromise;
}

function ensureLoaded() {
    // Entering or leaving demo mode swaps the storage namespace and the
    // source of truth, so a hydration done for the other mode is stale.
    const mode = isDemoAuthEnabled() ? 'demo' : 'live';
    if (_genealogyHydrated && _hydratedForMode !== null && _hydratedForMode !== mode) {
        const local = buildLocalGenealogy();
        _members = local.members;
        _relationships = local.relationships;
        _events = local.events;
        _dbIds = new Map();
        _genealogyHydrated = false;
        void hydrateGenealogyInBackground(true);
        return;
    }
    void hydrateGenealogyInBackground();
}

// ── Public API ─────────────────────────────────────────────

export function getFamilyMembers(): FamilyMember[] {
    ensureLoaded();
    return [..._members!];
}

export function getRelationships(): Relationship[] {
    ensureLoaded();
    return [..._relationships!];
}

export function getFamilyEvents(): FamilyEvent[] {
    ensureLoaded();
    return [..._events!].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getMemberById(id: string): FamilyMember | undefined {
    ensureLoaded();
    return _members!.find(m => m.id === id);
}

export function addFamilyMember(member: Omit<FamilyMember, 'id'>, parentIds?: string[]): FamilyMember {
    ensureLoaded();
    const newMember: FamilyMember = { ...member, id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
    _members!.push(newMember);
    saveToStorage(STORAGE_KEYS.members, _members!);

    // Create parent relationships
    const createdRels: Relationship[] = [];
    if (parentIds) {
        parentIds.forEach(pid => {
            const rel: Relationship = {
                id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                fromId: pid,
                toId: newMember.id,
                type: 'parent',
            };
            _relationships!.push(rel);
            createdRels.push(rel);
        });
        saveToStorage(STORAGE_KEYS.relationships, _relationships!);
    }

    // Auto-create birth event
    let createdEvent: FamilyEvent | null = null;
    if (newMember.birthDate) {
        const evt: FamilyEvent = {
            id: `ev_${Date.now()}`,
            memberId: newMember.id,
            memberName: `${newMember.firstName} ${newMember.lastName}`,
            type: 'birth',
            date: newMember.birthDate,
            title: `${newMember.firstName} ${newMember.lastName} born`,
            description: newMember.birthPlace ? `Born in ${newMember.birthPlace}` : undefined,
        };
        _events!.push(evt);
        createdEvent = evt;
        saveToStorage(STORAGE_KEYS.events, _events!);
    }

    persistRemote(async (userId) => {
        await pushMember(newMember, userId, _dbIds);
        for (const rel of createdRels) {
            await pushRelationship(rel, userId, _dbIds, _members!);
        }
        if (createdEvent) await pushEvent(createdEvent, userId, _dbIds, _members!);
    });

    return newMember;
}

export function updateFamilyMember(id: string, updates: Partial<FamilyMember>): FamilyMember | null {
    ensureLoaded();
    const idx = _members!.findIndex(m => m.id === id);
    if (idx === -1) return null;
    _members![idx] = { ..._members![idx], ...updates };
    saveToStorage(STORAGE_KEYS.members, _members!);
    const updated = _members![idx];
    persistRemote(async (userId) => {
        await pushMember(updated, userId, _dbIds);
    });
    return updated;
}

export function addRelationship(rel: Omit<Relationship, 'id'>): Relationship {
    ensureLoaded();
    const newRel: Relationship = { ...rel, id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
    _relationships!.push(newRel);
    saveToStorage(STORAGE_KEYS.relationships, _relationships!);
    persistRemote(async (userId) => {
        await pushRelationship(newRel, userId, _dbIds, _members!);
    });
    return newRel;
}

export function addFamilyEvent(event: Omit<FamilyEvent, 'id'>): FamilyEvent {
    ensureLoaded();
    const newEvent: FamilyEvent = { ...event, id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
    _events!.push(newEvent);
    _events!.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    saveToStorage(STORAGE_KEYS.events, _events!);
    persistRemote(async (userId) => {
        await pushEvent(newEvent, userId, _dbIds, _members!);
    });
    return newEvent;
}

// ── Relationship Queries ───────────────────────────────────

export function getSpouse(memberId: string): FamilyMember | undefined {
    ensureLoaded();
    const rel = _relationships!.find(
        r => r.type === 'spouse' && (r.fromId === memberId || r.toId === memberId)
    );
    if (!rel) return undefined;
    const spouseId = rel.fromId === memberId ? rel.toId : rel.fromId;
    return getMemberById(spouseId);
}

export function getChildren(memberId: string): FamilyMember[] {
    ensureLoaded();
    const childIds = _relationships!
        .filter(r => r.type === 'parent' && r.fromId === memberId)
        .map(r => r.toId);
    return _members!.filter(m => childIds.includes(m.id));
}

export function getParents(memberId: string): FamilyMember[] {
    ensureLoaded();
    const parentIds = _relationships!
        .filter(r => r.type === 'parent' && r.toId === memberId)
        .map(r => r.fromId);
    return _members!.filter(m => parentIds.includes(m.id));
}

// ── Tree Builder ───────────────────────────────────────────

export function buildFamilyTree(): FamilyTreeNode[] {
    ensureLoaded();
    const rootCandidates = _members!.filter(m => {
        const hasParents = _relationships!.some(r => r.type === 'parent' && r.toId === m.id);
        return !hasParents;
    });
    const rootIds = new Set(rootCandidates.map(m => m.id));

    // A married couple who both qualify as roots (neither has recorded
    // parents) must only appear as ONE top-level entry, since buildNode
    // already nests a member's spouse under `.spouse`. This used to be
    // done by only ever rooting the male half of the couple, which silently
    // dropped same-sex couples and any unmarried woman with no recorded
    // parents whenever another man elsewhere in the tree had none either.
    // Root order (not gender) now decides who anchors the pair.
    const claimedAsSpouse = new Set<string>();
    const roots: FamilyMember[] = [];
    for (const m of rootCandidates) {
        if (claimedAsSpouse.has(m.id)) continue;
        roots.push(m);
        const spouse = getSpouse(m.id);
        if (spouse && rootIds.has(spouse.id)) {
            claimedAsSpouse.add(spouse.id);
        }
    }

    function buildNode(member: FamilyMember): FamilyTreeNode {
        const spouse = getSpouse(member.id);
        const childMembers = getChildren(member.id)
            .filter(child => {
                const parents = getParents(child.id);
                return parents[0]?.id === member.id;
            });

        return {
            member,
            spouse: spouse || undefined,
            children: childMembers.map(c => buildNode(c)),
        };
    }

    return roots.map(r => buildNode(r));
}

// ── AI Personality Generator ───────────────────────────────

export function generateAIPersonality(member: FamilyMember): AIPersonality {
    // Build traits from available data
    const traits: string[] = [];
    const memories: string[] = [];

    if (member.bio) {
        // Extract traits from bio keywords
        const bioLower = member.bio.toLowerCase();
        if (bioLower.includes('teacher') || bioLower.includes('coach')) traits.push('Educational', 'Patient', 'Motivational');
        if (bioLower.includes('engineer') || bioLower.includes('architect')) traits.push('Analytical', 'Detail-oriented', 'Problem-solver');
        if (bioLower.includes('nurse') || bioLower.includes('volunteer')) traits.push('Compassionate', 'Caring', 'Selfless');
        if (bioLower.includes('chef') || bioLower.includes('gardener')) traits.push('Creative', 'Nurturing');
        if (bioLower.includes('leader') || bioLower.includes('deacon')) traits.push('Authoritative', 'Wise', 'Community-minded');
        if (bioLower.includes('war') || bioLower.includes('served')) traits.push('Disciplined', 'Brave', 'Resilient');
        memories.push(`From their biography: "${member.bio}"`);
    }

    if (traits.length === 0) traits.push('Warm', 'Friendly', 'Thoughtful');

    // Build memories from relationships
    const spouse = getSpouse(member.id);
    const children = getChildren(member.id);
    const parents = getParents(member.id);

    if (spouse) memories.push(`Married to ${spouse.firstName} ${spouse.lastName}`);
    if (children.length > 0) memories.push(`Parent of ${children.map(c => c.firstName).join(', ')}`);
    if (parents.length > 0) memories.push(`Child of ${parents.map(p => p.firstName).join(' and ')}`);
    if (member.birthPlace) memories.push(`Born in ${member.birthPlace}`);

    const ageDescriptor = member.deathDate ? 'spoke with wisdom of years past' : (
        member.generation <= -1 ? 'speaks with the wisdom of experience' : 'speaks with energy and hope'
    );

    return {
        traits: traits.slice(0, 5),
        communicationStyle: `${member.firstName} ${ageDescriptor}. ${member.gender === 'male' ? 'He' : member.gender === 'female' ? 'She' : 'They'
            } ${traits.length > 2 ? `tend${member.gender === 'other' ? '' : 's'} to be ${traits.slice(0, 2).join(' and ').toLowerCase()}` : 'communicate openly'}.`,
        keyMemories: memories,
        voiceDescription: `Embodies the spirit of ${member.firstName} ${member.lastName}, a ${getGenerationLabel(member.generation).toLowerCase()} generation family member.`,
        isActive: false,
    };
}

export function activateAgent(memberId: string): FamilyMember | null {
    const member = getMemberById(memberId);
    if (!member) return null;

    const personality = member.aiPersonality || generateAIPersonality(member);
    return updateFamilyMember(memberId, {
        aiPersonality: { ...personality, isActive: true }
    });
}

export function getActiveAgents(): FamilyMember[] {
    ensureLoaded();
    return _members!.filter(m => m.aiPersonality?.isActive);
}

// ── Family Synastry / Synergy ──────────────────────────────

export interface SynergyResult {
    score: number;
    compatibility: string[];
    friction: string[];
}

export function calculateSynergy(m1: FamilyMember, m2: FamilyMember): SynergyResult | null {
    if (!m1.aiPersonality?.scores || !m2.aiPersonality?.scores) return null;

    const s1 = m1.aiPersonality.scores;
    const s2 = m2.aiPersonality.scores;

    let totalDelta = 0;
    const compatibility: string[] = [];
    const friction: string[] = [];

    const traits = [
        { key: 'openness', name: 'Openness', match: 'Shared Curiosity', clash: 'Differing Creativity Needs' },
        { key: 'conscientiousness', name: 'Conscientiousness', match: 'Mutual Reliability', clash: 'Work/Play Balance Divergence' },
        { key: 'extraversion', name: 'Extraversion', match: 'Aligned Social Energy', clash: 'Social Battery Asymmetry' },
        { key: 'agreeableness', name: 'Agreeableness', match: 'Harmonious Empathy', clash: 'Directness vs. Diplomacy' },
        { key: 'neuroticism', name: 'Emotional Sensitivity', match: 'Shared Emotional Depth', clash: 'Differing Stress Handling' }
    ];

    for (const t of traits) {
        const val1 = s1[t.key] || 50;
        const val2 = s2[t.key] || 50;
        const delta = Math.abs(val1 - val2);
        totalDelta += delta;

        if (delta < 15) {
            compatibility.push(t.match);
        } else if (delta > 40) {
            friction.push(t.clash);
        }
    }

    // Max delta per trait is ~100. Over 5 traits max is 500.
    // 0 delta means 100% synergy. 500 delta means 0% synergy.
    const rawScore = 100 - (totalDelta / 5);
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));

    return {
        score,
        compatibility: compatibility.slice(0, 3), // Max 3
        friction: friction.slice(0, 2)            // Max 2
    };
}

// ── Utility Helpers ────────────────────────────────────────

export function getGenerationLabel(gen: number): string {
    switch (gen) {
        case -2: return 'Grandparents';
        case -1: return 'Parents';
        case 0: return 'Your Generation';
        case 1: return 'Children';
        case 2: return 'Grandchildren';
        default: return `Generation ${gen}`;
    }
}

export function getEventIcon(type: EventType): string {
    switch (type) {
        case 'birth': return '👶';
        case 'marriage': return '💍';
        case 'death': return '🕊️';
        case 'milestone': return '⭐';
        case 'adoption': return '💛';
    }
}

export function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });
}

// ══════════════════════════════════════════════════════════════
// ── GeneWeb-Inspired Functions ─────────────────────────────
// ══════════════════════════════════════════════════════════════

// ── Source Citation Management ─────────────────────────────

export function getSources(): SourceCitation[] {
    ensureLoaded();
    return [..._sources!];
}

export function addSource(source: Omit<SourceCitation, 'id'>): SourceCitation {
    ensureLoaded();
    const newSource: SourceCitation = { ...source, id: `src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
    _sources!.push(newSource);
    saveToStorage(STORAGE_KEYS.sources, _sources!);
    return newSource;
}

export function attachSourceToMember(memberId: string, sourceId: string): void {
    ensureLoaded();
    const member = _members!.find(m => m.id === memberId);
    const source = _sources!.find(s => s.id === sourceId);
    if (member && source) {
        if (!member.sources) member.sources = [];
        if (!member.sources.find(s => s.id === sourceId)) {
            member.sources.push(source);
            saveToStorage(STORAGE_KEYS.members, _members!);
        }
    }
}

export function getMemberSources(memberId: string): SourceCitation[] {
    const member = getMemberById(memberId);
    return member?.sources || [];
}

// ── Relationship Path Computation (BFS) ────────────────────

export function findRelationshipPath(fromId: string, toId: string): RelationshipPathStep[] | null {
    ensureLoaded();
    if (fromId === toId) return [];

    // Build adjacency map: memberId -> [{neighborId, relType}]
    const adj = new Map<string, { id: string; rel: string }[]>();
    for (const r of _relationships!) {
        if (!adj.has(r.fromId)) adj.set(r.fromId, []);
        if (!adj.has(r.toId)) adj.set(r.toId, []);

        if (r.type === 'parent') {
            adj.get(r.fromId)!.push({ id: r.toId, rel: 'child' });
            adj.get(r.toId)!.push({ id: r.fromId, rel: 'parent' });
        } else if (r.type === 'spouse') {
            adj.get(r.fromId)!.push({ id: r.toId, rel: 'spouse' });
            adj.get(r.toId)!.push({ id: r.fromId, rel: 'spouse' });
        } else if (r.type === 'sibling') {
            adj.get(r.fromId)!.push({ id: r.toId, rel: 'sibling' });
            adj.get(r.toId)!.push({ id: r.fromId, rel: 'sibling' });
        }
    }

    // BFS
    const visited = new Set<string>([fromId]);
    const queue: { id: string; path: RelationshipPathStep[] }[] = [{ id: fromId, path: [] }];

    while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbors = adj.get(current.id) || [];

        for (const neighbor of neighbors) {
            if (visited.has(neighbor.id)) continue;
            visited.add(neighbor.id);

            const member = getMemberById(neighbor.id);
            const step: RelationshipPathStep = {
                memberId: neighbor.id,
                memberName: member ? `${member.firstName} ${member.lastName}` : neighbor.id,
                relationship: neighbor.rel,
            };
            const path = [...current.path, step];

            if (neighbor.id === toId) return path;
            queue.push({ id: neighbor.id, path });
        }
    }

    return null; // No path found
}

export function describeRelationship(path: RelationshipPathStep[]): string {
    if (path.length === 0) return 'Same person';
    if (path.length === 1) {
        const r = path[0].relationship;
        return r.charAt(0).toUpperCase() + r.slice(1);
    }

    // Count generations up (parent) and down (child)
    let up = 0, down = 0;
    let hasSpouse = false;
    for (const step of path) {
        if (step.relationship === 'parent') up++;
        else if (step.relationship === 'child') down++;
        else if (step.relationship === 'spouse') hasSpouse = true;
    }

    // Direct line
    if (down === 0 && up > 0) {
        if (up === 1) return hasSpouse ? 'Parent-in-law' : 'Parent';
        if (up === 2) return hasSpouse ? 'Grandparent-in-law' : 'Grandparent';
        return `${'Great-'.repeat(up - 2)}Grandparent`;
    }
    if (up === 0 && down > 0) {
        if (down === 1) return hasSpouse ? 'Child-in-law' : 'Child';
        if (down === 2) return hasSpouse ? 'Grandchild-in-law' : 'Grandchild';
        return `${'Great-'.repeat(down - 2)}Grandchild`;
    }

    // Cousin calculation
    if (up > 0 && down > 0) {
        const minGen = Math.min(up, down);
        const removed = Math.abs(up - down);
        if (minGen === 1 && removed === 0) return 'Sibling';

        const cousinNum = minGen - 1;
        const ordinals = ['', '1st', '2nd', '3rd', '4th', '5th'];
        const ordinal = ordinals[cousinNum] || `${cousinNum}th`;
        const removedStr = removed > 0 ? ` ${removed}× removed` : '';

        if (cousinNum === 0) {
            return removed === 1 ? 'Uncle/Aunt or Nephew/Niece' : `Relative (${removed} gen apart)`;
        }
        return `${ordinal} Cousin${removedStr}`;
    }

    return `Related (${path.length} steps)`;
}

// ── Consanguinity Detection ────────────────────────────────

export function detectConsanguinity(): ConsanguinityResult[] {
    ensureLoaded();
    const results: ConsanguinityResult[] = [];

    function getAncestors(memberId: string): Map<string, number> {
        const ancestors = new Map<string, number>();
        const queue: { id: string; depth: number }[] = [{ id: memberId, depth: 0 }];
        while (queue.length > 0) {
            const { id, depth } = queue.shift()!;
            const parents = getParents(id);
            for (const parent of parents) {
                if (!ancestors.has(parent.id) || ancestors.get(parent.id)! > depth + 1) {
                    ancestors.set(parent.id, depth + 1);
                    queue.push({ id: parent.id, depth: depth + 1 });
                }
            }
        }
        return ancestors;
    }

    // Check all spouse pairs for shared ancestors
    const spouseRels = _relationships!.filter(r => r.type === 'spouse');
    for (const rel of spouseRels) {
        const ancestors1 = getAncestors(rel.fromId);
        const ancestors2 = getAncestors(rel.toId);

        const shared: ConsanguinityResult['sharedAncestors'] = [];
        for (const [ancestorId, dist1] of ancestors1) {
            if (ancestors2.has(ancestorId)) {
                const ancestor = getMemberById(ancestorId);
                if (ancestor) {
                    shared.push({ ancestor, pathLength1: dist1, pathLength2: ancestors2.get(ancestorId)! });
                }
            }
        }

        if (shared.length > 0) {
            // Wright's coefficient of inbreeding
            let coefficient = 0;
            for (const s of shared) {
                coefficient += Math.pow(0.5, s.pathLength1 + s.pathLength2 + 1);
            }
            results.push({
                person1: rel.fromId,
                person2: rel.toId,
                sharedAncestors: shared,
                coefficient,
            });
        }
    }

    return results;
}

// ── Advanced Search ────────────────────────────────────────

export function searchMembers(filters: SearchFilters): FamilyMember[] {
    ensureLoaded();
    return _members!.filter(m => {
        if (filters.name) {
            const q = filters.name.toLowerCase();
            const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
            if (!fullName.includes(q)) return false;
        }
        if (filters.place) {
            if (!m.birthPlace?.toLowerCase().includes(filters.place.toLowerCase())) return false;
        }
        if (filters.occupation) {
            if (!m.occupation?.toLowerCase().includes(filters.occupation.toLowerCase())) return false;
        }
        if (filters.generation !== undefined) {
            if (m.generation !== filters.generation) return false;
        }
        if (filters.hasAI !== undefined) {
            if (!!m.aiPersonality?.isActive !== filters.hasAI) return false;
        }
        if (filters.isDeceased !== undefined) {
            if (!!m.deathDate !== filters.isDeceased) return false;
        }
        if (filters.dateFrom) {
            if (!m.birthDate || m.birthDate < filters.dateFrom) return false;
        }
        if (filters.dateTo) {
            if (!m.birthDate || m.birthDate > filters.dateTo) return false;
        }
        return true;
    });
}

// ── GEDCOM Export ──────────────────────────────────────────

export function exportToGEDCOM(): string {
    ensureLoaded();
    const lines: string[] = [];

    // Header
    lines.push('0 HEAD');
    lines.push('1 SOUR EverAfter');
    lines.push('2 VERS 1.0');
    lines.push('2 NAME EverAfter Family AI');
    lines.push('1 GEDC');
    lines.push('2 VERS 5.5.1');
    lines.push('2 FORM LINEAGE-LINKED');
    lines.push('1 CHAR UTF-8');

    // Individual records
    for (const m of _members!) {
        lines.push(`0 @I${m.id}@ INDI`);
        lines.push(`1 NAME ${m.firstName} /${m.lastName}/`);
        lines.push(`1 SEX ${m.gender === 'male' ? 'M' : m.gender === 'female' ? 'F' : 'U'}`);
        if (m.birthDate) {
            lines.push('1 BIRT');
            lines.push(`2 DATE ${formatGEDCOMDate(m.birthDate)}`);
            if (m.birthPlace) lines.push(`2 PLAC ${m.birthPlace}`);
        }
        if (m.deathDate) {
            lines.push('1 DEAT');
            lines.push(`2 DATE ${formatGEDCOMDate(m.deathDate)}`);
        }
        if (m.occupation) lines.push(`1 OCCU ${m.occupation}`);
        if (m.bio) lines.push(`1 NOTE ${m.bio}`);
        if (m.sources) {
            for (const src of m.sources) {
                lines.push(`1 SOUR @S${src.id}@`);
            }
        }
    }

    // Family records (spouse pairs with children)
    const processedPairs = new Set<string>();
    const spouseRels = _relationships!.filter(r => r.type === 'spouse');
    let famIdx = 1;

    for (const sr of spouseRels) {
        const pairKey = [sr.fromId, sr.toId].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const husb = _members!.find(m => m.id === sr.fromId && m.gender === 'male') || getMemberById(sr.fromId);
        const wife = _members!.find(m => m.id === sr.toId && m.gender === 'female') || getMemberById(sr.toId);

        lines.push(`0 @F${famIdx}@ FAM`);
        if (husb) lines.push(`1 HUSB @I${husb.id}@`);
        if (wife) lines.push(`1 WIFE @I${wife.id}@`);
        if (sr.marriageDate) {
            lines.push('1 MARR');
            lines.push(`2 DATE ${formatGEDCOMDate(sr.marriageDate)}`);
        }

        // Find children of this couple
        const parent1Children = new Set(getChildren(sr.fromId).map(c => c.id));
        const parent2Children = new Set(getChildren(sr.toId).map(c => c.id));
        for (const childId of parent1Children) {
            if (parent2Children.has(childId)) {
                lines.push(`1 CHIL @I${childId}@`);
            }
        }
        famIdx++;
    }

    // Source records
    for (const src of _sources!) {
        lines.push(`0 @S${src.id}@ SOUR`);
        lines.push(`1 TITL ${src.title}`);
        if (src.repository) lines.push(`1 REPO ${src.repository}`);
        if (src.date) lines.push(`1 DATE ${src.date}`);
        if (src.notes) lines.push(`1 NOTE ${src.notes}`);
    }

    lines.push('0 TRLR');
    return lines.join('\n');
}

function formatGEDCOMDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ── GEDCOM Import ──────────────────────────────────────────

export interface GEDCOMPreview {
    individuals: { id: string; name: string; birthDate?: string; gender: Gender }[];
    families: number;
    sources: number;
}

export function previewGEDCOM(content: string): GEDCOMPreview {
    const lines = content.split(/\r?\n/);
    const individuals: GEDCOMPreview['individuals'] = [];
    let families = 0;
    let sources = 0;
    let currentIndi: { id: string; name: string; birthDate?: string; gender: Gender } | null = null;
    let inBirt = false;

    for (const line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(/^(\d+)\s+(.+)/);
        if (!match) continue;
        const level = parseInt(match[1]);
        const rest = match[2];

        if (level === 0) {
            if (currentIndi) individuals.push(currentIndi);
            currentIndi = null;
            inBirt = false;

            if (rest.includes('INDI')) {
                const idMatch = rest.match(/@([^@]+)@/);
                currentIndi = { id: idMatch?.[1] || `indi_${individuals.length}`, name: '', gender: 'other' };
            } else if (rest.includes('FAM')) {
                families++;
            } else if (rest.includes('SOUR') && !rest.startsWith('SOUR')) {
                sources++;
            }
        } else if (currentIndi) {
            if (level === 1 && rest.startsWith('NAME')) {
                currentIndi.name = rest.replace('NAME ', '').replace(/\//g, '').trim();
            } else if (level === 1 && rest.startsWith('SEX')) {
                const sex = rest.replace('SEX ', '').trim();
                currentIndi.gender = sex === 'M' ? 'male' : sex === 'F' ? 'female' : 'other';
            } else if (level === 1 && rest === 'BIRT') {
                inBirt = true;
            } else if (level === 2 && inBirt && rest.startsWith('DATE')) {
                currentIndi.birthDate = rest.replace('DATE ', '').trim();
                inBirt = false;
            } else if (level === 1 && !rest.startsWith('BIRT')) {
                inBirt = false;
            }
        }
    }
    if (currentIndi) individuals.push(currentIndi);

    return { individuals, families, sources };
}

export function importFromGEDCOM(content: string): { imported: number; skipped: number } {
    ensureLoaded();
    const preview = previewGEDCOM(content);
    let imported = 0;
    let skipped = 0;

    for (const indi of preview.individuals) {
        // Skip if a member with same name already exists
        const nameParts = indi.name.split(' ');
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || 'Unknown';

        const exists = _members!.some(
            m => m.firstName.toLowerCase() === firstName.toLowerCase() && m.lastName.toLowerCase() === lastName.toLowerCase()
        );

        if (exists) {
            skipped++;
            continue;
        }

        const newMember: FamilyMember = {
            id: `ged_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            firstName,
            lastName,
            gender: indi.gender,
            birthDate: indi.birthDate ? parseGEDCOMDate(indi.birthDate) : undefined,
            generation: 0, // User can adjust later
        };

        _members!.push(newMember);
        imported++;
    }

    if (imported > 0) {
        saveToStorage(STORAGE_KEYS.members, _members!);
    }

    return { imported, skipped };
}

function parseGEDCOMDate(dateStr: string): string | undefined {
    try {
        const months: Record<string, string> = {
            JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
            JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
        };
        const parts = dateStr.trim().split(/\s+/);
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = months[parts[1].toUpperCase()] || '01';
            const year = parts[2];
            return `${year}-${month}-${day}`;
        }
        if (parts.length === 2) {
            const month = months[parts[0].toUpperCase()] || '01';
            return `${parts[1]}-${month}-01`;
        }
        if (parts.length === 1 && /^\d{4}$/.test(parts[0])) {
            return `${parts[0]}-01-01`;
        }
    } catch { /* ignore parse errors */ }
    return undefined;
}
