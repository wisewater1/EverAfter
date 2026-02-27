// Genealogy data layer for St. Joseph Family Tree
// With localStorage persistence, AI Agent personality generation,
// and GeneWeb-inspired genealogy tools (GEDCOM, relationship paths, source citations)

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
let _sources: SourceCitation[] | null = null;

function ensureLoaded() {
    if (!_members) _members = loadFromStorage(STORAGE_KEYS.members, DEFAULT_MEMBERS);
    if (!_relationships) _relationships = loadFromStorage(STORAGE_KEYS.relationships, DEFAULT_RELATIONSHIPS);
    if (!_events) _events = loadFromStorage(STORAGE_KEYS.events, DEFAULT_EVENTS);
    if (!_sources) _sources = loadFromStorage<SourceCitation>(STORAGE_KEYS.sources, []);
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
