// Genealogy data layer for St. Joseph Family Tree
// With localStorage persistence and AI Agent personality generation

export type Gender = 'male' | 'female' | 'other';
export type RelationType = 'parent' | 'child' | 'spouse' | 'sibling';
export type EventType = 'birth' | 'marriage' | 'death' | 'milestone' | 'adoption';

export interface AIPersonality {
    traits: string[];
    communicationStyle: string;
    keyMemories: string[];
    voiceDescription: string;
    isActive: boolean;
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
}

export interface FamilyTreeNode {
    member: FamilyMember;
    spouse?: FamilyMember;
    children: FamilyTreeNode[];
}

// ── LocalStorage Keys ──────────────────────────────────────

const STORAGE_KEYS = {
    members: 'everafter_family_members',
    relationships: 'everafter_family_relationships',
    events: 'everafter_family_events',
};

// ── Default Mock Data ──────────────────────────────────────

const DEFAULT_MEMBERS: FamilyMember[] = [
    { id: 'gp1', firstName: 'William', lastName: 'Anderson', gender: 'male', birthDate: '1935-03-12', deathDate: '2010-11-30', birthPlace: 'Chicago, IL', generation: -2, bio: 'Served in the Korean War. Worked as a mechanical engineer for 35 years.' },
    { id: 'gp2', firstName: 'Margaret', lastName: 'Anderson', gender: 'female', birthDate: '1938-07-22', birthPlace: 'Milwaukee, WI', generation: -2, bio: 'Retired schoolteacher. Known for her incredible apple pies.' },
    { id: 'gp3', firstName: 'Robert', lastName: 'Mitchell', gender: 'male', birthDate: '1933-01-05', deathDate: '2015-06-18', birthPlace: 'Detroit, MI', generation: -2, bio: 'Founded Mitchell Hardware. Community leader and church deacon.' },
    { id: 'gp4', firstName: 'Eleanor', lastName: 'Mitchell', gender: 'female', birthDate: '1937-09-14', deathDate: '2020-02-28', birthPlace: 'Detroit, MI', generation: -2, bio: 'Volunteer nurse. Active in local charity organizations.' },
    { id: 'p1', firstName: 'James', lastName: 'Anderson', gender: 'male', birthDate: '1962-05-20', birthPlace: 'Chicago, IL', generation: -1, bio: 'Software architect. Enjoys woodworking and fishing.' },
    { id: 'p2', firstName: 'Susan', lastName: 'Anderson', gender: 'female', birthDate: '1965-11-08', birthPlace: 'Detroit, MI', generation: -1, bio: 'Pediatric nurse. Marathon runner and avid gardener.' },
    { id: 'u1', firstName: 'Alice', lastName: 'Anderson', gender: 'female', birthDate: '1990-04-15', birthPlace: 'Evanston, IL', generation: 0, bio: 'Product designer. Loves hiking and photography.' },
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

function loadFromStorage<T>(key: string, defaults: T[]): T[] {
    try {
        const stored = localStorage.getItem(key);
        if (stored) return JSON.parse(stored);
    } catch { /* ignore parse errors */ }
    return [...defaults];
}

function saveToStorage<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
}

// ── In-memory caches (loaded once from storage) ────────────

let _members: FamilyMember[] | null = null;
let _relationships: Relationship[] | null = null;
let _events: FamilyEvent[] | null = null;

function ensureLoaded() {
    if (!_members) _members = loadFromStorage(STORAGE_KEYS.members, DEFAULT_MEMBERS);
    if (!_relationships) _relationships = loadFromStorage(STORAGE_KEYS.relationships, DEFAULT_RELATIONSHIPS);
    if (!_events) _events = loadFromStorage(STORAGE_KEYS.events, DEFAULT_EVENTS);
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
    if (parentIds) {
        parentIds.forEach(pid => {
            const rel: Relationship = {
                id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                fromId: pid,
                toId: newMember.id,
                type: 'parent',
            };
            _relationships!.push(rel);
        });
        saveToStorage(STORAGE_KEYS.relationships, _relationships!);
    }

    // Auto-create birth event
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
        saveToStorage(STORAGE_KEYS.events, _events!);
    }

    return newMember;
}

export function updateFamilyMember(id: string, updates: Partial<FamilyMember>): FamilyMember | null {
    ensureLoaded();
    const idx = _members!.findIndex(m => m.id === id);
    if (idx === -1) return null;
    _members![idx] = { ..._members![idx], ...updates };
    saveToStorage(STORAGE_KEYS.members, _members!);
    return _members![idx];
}

export function addRelationship(rel: Omit<Relationship, 'id'>): Relationship {
    ensureLoaded();
    const newRel: Relationship = { ...rel, id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
    _relationships!.push(newRel);
    saveToStorage(STORAGE_KEYS.relationships, _relationships!);
    return newRel;
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
    const roots = _members!.filter(m => {
        const hasParents = _relationships!.some(r => r.type === 'parent' && r.toId === m.id);
        return !hasParents && m.gender === 'male';
    });

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

// ── Utility Helpers ────────────────────────────────────────

export function getGenerationLabel(gen: number): string {
    switch (gen) {
        case -2: return 'Grandparents';
        case -1: return 'Parents';
        case 0: return 'You';
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
