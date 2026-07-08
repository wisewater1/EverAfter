/**
 * Supabase persistence for the family tree.
 *
 * public.family_members is the canonical person entity: one row per person,
 * stable uuid id, owned by user_id, with legacy_id bridging the client-side
 * graph ids ('u1', 'm_...') used across the UI. Relationship edges live in
 * public.family_member_links and life events in public.family_tree_events,
 * both FK'd to the canonical uuid.
 *
 * The in-memory graph in genealogy.ts stays the fast synchronous read model;
 * this module is its durable write-through + hydration source for real
 * (non-demo) sessions. Demo sessions never touch the network.
 */

import { supabase } from '../supabase';
import { isDemoAuthEnabled } from '../demo-auth';
import { upsertFamilyMember } from './familyMembersDb';
import type { FamilyMember, Relationship, FamilyEvent, EventType, Gender, RelationType } from './genealogy';

interface DbMemberRow {
    id: string;
    legacy_id: string | null;
    first_name: string | null;
    last_name: string | null;
    gender: string | null;
    birth_date: string | null;
    death_date: string | null;
    birth_place: string | null;
    photo_url: string | null;
    bio: string | null;
    generation: number | null;
    occupation: string | null;
    engram_id: string | null;
    calendar_url: string | null;
    metadata: Record<string, unknown> | null;
}

interface DbLinkRow {
    id: string;
    from_member_id: string;
    to_member_id: string;
    link_type: RelationType;
}

interface DbEventRow {
    id: string;
    member_id: string | null;
    legacy_event_id: string | null;
    event_type: string;
    event_date: string | null;
    title: string;
    description: string | null;
    location: string | null;
}

export interface HydratedGenealogy {
    members: FamilyMember[];
    relationships: Relationship[];
    events: FamilyEvent[];
    /** client graph id -> canonical family_members.id uuid */
    dbIds: Map<string, string>;
}

// The client EventType keeps its historical values; the table stores the
// calm register ('passing') plus a broader set. Map at the boundary.
function toDbEventType(t: EventType): string {
    if (t === 'death') return 'passing';
    if (t === 'birth' || t === 'marriage' || t === 'milestone') return t;
    return 'other';
}

function fromDbEventType(t: string): EventType {
    if (t === 'passing') return 'death';
    if (t === 'birth' || t === 'marriage' || t === 'milestone') return t;
    return 'milestone';
}

let cachedUserId: string | null = null;
let cachedAt = 0;

/** Real (non-demo) authenticated user id, cached briefly. */
export async function getGenealogyUserId(): Promise<string | null> {
    if (!supabase || isDemoAuthEnabled()) return null;
    const now = Date.now();
    if (cachedUserId && now - cachedAt < 60_000) return cachedUserId;
    try {
        const { data } = await supabase.auth.getSession();
        cachedUserId = data.session?.user?.id ?? null;
        cachedAt = now;
        return cachedUserId;
    } catch {
        return null;
    }
}

function rowToMember(row: DbMemberRow): FamilyMember {
    const meta = (row.metadata || {}) as Record<string, unknown>;
    return {
        id: row.legacy_id || row.id,
        firstName: row.first_name || 'Family',
        lastName: row.last_name || 'Member',
        gender: (row.gender as Gender) || 'other',
        birthDate: row.birth_date || undefined,
        deathDate: row.death_date || undefined,
        birthPlace: row.birth_place || undefined,
        photo: row.photo_url || undefined,
        bio: row.bio || undefined,
        generation: row.generation ?? 0,
        occupation: row.occupation || undefined,
        engramId: row.engram_id || undefined,
        calendarUrl: row.calendar_url || undefined,
        aiPersonality: (meta.aiPersonality as FamilyMember['aiPersonality']) || undefined,
        infoStack: (meta.infoStack as FamilyMember['infoStack']) || undefined,
        mediaPermissions: (meta.mediaPermissions as FamilyMember['mediaPermissions']) || undefined,
        sources: (meta.sources as FamilyMember['sources']) || undefined,
        notes: (meta.notes as string[]) || undefined,
        githubUsername: (meta.githubUsername as string) || undefined,
    };
}

/**
 * Load the user's canonical tree. Returns null when there is nothing stored
 * (new account) or no live session, so the caller can fall back.
 */
export async function fetchGenealogyFromSupabase(userId: string): Promise<HydratedGenealogy | null> {
    if (!supabase) return null;
    const [membersRes, linksRes, eventsRes] = await Promise.all([
        supabase
            .from('family_members')
            .select('id, legacy_id, first_name, last_name, gender, birth_date, death_date, birth_place, photo_url, bio, generation, occupation, engram_id, calendar_url, metadata')
            .eq('user_id', userId)
            .not('legacy_id', 'is', null),
        supabase.from('family_member_links').select('id, from_member_id, to_member_id, link_type').eq('user_id', userId),
        supabase
            .from('family_tree_events')
            .select('id, member_id, legacy_event_id, event_type, event_date, title, description, location')
            .eq('user_id', userId),
    ]);
    if (membersRes.error) throw membersRes.error;
    const rows = (membersRes.data || []) as DbMemberRow[];
    if (rows.length === 0) return null;

    const dbIds = new Map<string, string>();
    const uuidToClient = new Map<string, string>();
    const members = rows.map((row) => {
        const member = rowToMember(row);
        dbIds.set(member.id, row.id);
        uuidToClient.set(row.id, member.id);
        return member;
    });

    const relationships: Relationship[] = [];
    for (const link of ((linksRes.data || []) as DbLinkRow[])) {
        const fromId = uuidToClient.get(link.from_member_id);
        const toId = uuidToClient.get(link.to_member_id);
        if (!fromId || !toId) continue;
        relationships.push({ id: link.id, fromId, toId, type: link.link_type });
    }

    const memberName = (clientId: string | undefined): string => {
        if (!clientId) return '';
        const m = members.find((x) => x.id === clientId);
        return m ? `${m.firstName} ${m.lastName}`.trim() : '';
    };

    const events: FamilyEvent[] = [];
    for (const row of ((eventsRes.data || []) as DbEventRow[])) {
        const clientMemberId = row.member_id ? uuidToClient.get(row.member_id) : undefined;
        events.push({
            id: row.legacy_event_id || row.id,
            memberId: clientMemberId || '',
            memberName: memberName(clientMemberId) || row.title,
            type: fromDbEventType(row.event_type),
            date: row.event_date || '',
            title: row.title,
            description: row.description || undefined,
        });
    }

    return { members, relationships, events, dbIds };
}

/** Upsert one member; returns its canonical uuid (also cached in dbIds). */
export async function pushMember(
    member: FamilyMember,
    userId: string,
    dbIds: Map<string, string>,
): Promise<string | null> {
    const row = await upsertFamilyMember(member, userId);
    if (row) {
        dbIds.set(member.id, row.id);
        return row.id;
    }
    return null;
}

async function resolveDbId(
    clientId: string,
    userId: string,
    dbIds: Map<string, string>,
    members: FamilyMember[],
): Promise<string | null> {
    const cached = dbIds.get(clientId);
    if (cached) return cached;
    const member = members.find((m) => m.id === clientId);
    if (!member) return null;
    return pushMember(member, userId, dbIds);
}

export async function pushRelationship(
    rel: Relationship,
    userId: string,
    dbIds: Map<string, string>,
    members: FamilyMember[],
): Promise<void> {
    if (!supabase) return;
    const fromDb = await resolveDbId(rel.fromId, userId, dbIds, members);
    const toDb = await resolveDbId(rel.toId, userId, dbIds, members);
    if (!fromDb || !toDb) return;
    const { error } = await supabase.from('family_member_links').upsert(
        {
            user_id: userId,
            from_member_id: fromDb,
            to_member_id: toDb,
            link_type: rel.type,
        },
        { onConflict: 'user_id,from_member_id,to_member_id,link_type', ignoreDuplicates: true },
    );
    if (error) console.warn('pushRelationship failed:', error.message);
}

export async function pushEvent(
    event: FamilyEvent,
    userId: string,
    dbIds: Map<string, string>,
    members: FamilyMember[],
): Promise<void> {
    if (!supabase) return;
    const memberDb = event.memberId ? await resolveDbId(event.memberId, userId, dbIds, members) : null;
    const { error } = await supabase.from('family_tree_events').upsert(
        {
            user_id: userId,
            member_id: memberDb,
            legacy_event_id: event.id,
            event_type: toDbEventType(event.type),
            event_date: event.date ? String(event.date).slice(0, 10) : null,
            title: event.title,
            description: event.description ?? null,
        },
        { onConflict: 'user_id,legacy_event_id' },
    );
    if (error) console.warn('pushEvent failed:', error.message);
}

let realtimeChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
let realtimeUserId: string | null = null;

/**
 * Live-sync the family tree: subscribe to changes on the three canonical
 * tables for this user so edits made on another device/tab (or a slower
 * background backfill from this one) reach every open tab without a manual
 * refresh. Fires `onChange` on any insert/update/delete; the caller decides
 * how to re-merge (see genealogy.ts's hydration-triggered refresh).
 *
 * Idempotent per userId: calling again for the same user is a no-op so
 * components can each call this on mount without stacking duplicate
 * channels. Returns an unsubscribe function.
 */
export function subscribeToGenealogyRealtime(userId: string, onChange: () => void): () => void {
    if (!supabase || isDemoAuthEnabled()) return () => {};

    if (realtimeChannel && realtimeUserId === userId) {
        return () => {};
    }

    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }

    realtimeUserId = userId;
    const channel = supabase
        .channel(`genealogy:${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'family_members', filter: `user_id=eq.${userId}` }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'family_member_links', filter: `user_id=eq.${userId}` }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'family_tree_events', filter: `user_id=eq.${userId}` }, onChange)
        .subscribe();

    realtimeChannel = channel;
    return () => {
        supabase?.removeChannel(channel);
        if (realtimeChannel === channel) {
            realtimeChannel = null;
            realtimeUserId = null;
        }
    };
}

/**
 * Push everything local that the canonical store does not have yet. Runs
 * after hydration for real users so a tree built offline (or during
 * onboarding before this sync existed) becomes durable. Small trees, so a
 * simple sequential sweep is fine.
 */
export async function backfillGenealogy(
    members: FamilyMember[],
    relationships: Relationship[],
    events: FamilyEvent[],
    userId: string,
    dbIds: Map<string, string>,
): Promise<void> {
    for (const member of members) {
        if (!dbIds.has(member.id)) {
            await pushMember(member, userId, dbIds);
        }
    }
    for (const rel of relationships) {
        await pushRelationship(rel, userId, dbIds, members);
    }
    for (const event of events) {
        await pushEvent(event, userId, dbIds, members);
    }
}
