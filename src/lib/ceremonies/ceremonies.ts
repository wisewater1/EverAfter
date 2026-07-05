/**
 * Ceremonies data layer.
 *
 * A ceremony is a calm, deliberate gathering a family plans together: a
 * remembrance for someone who has passed, a gratitude gathering, a blessing,
 * a milestone, or a legacy hand-off marked with care. This module is the
 * single place that talks to the `ceremonies` table in Supabase or, in demo
 * mode, to localStorage, so every screen shares one source of truth.
 *
 * Person references
 * ------------------
 * The UI works with the client-side family graph ids from
 * `src/lib/joseph/genealogy.ts` (for example "u1" or "m_172..."). The
 * `ceremonies` table stores the canonical Supabase uuid for each family
 * member instead, so `honoree_member_id` and `participant_member_ids` can be
 * foreign keys into `family_members`. This module is the boundary between
 * the two representations:
 *
 *   - On write, every client id is resolved to a uuid with
 *     `getCanonicalMemberId()`. When a member has never been persisted to
 *     Supabase, `upsertFamilyMember()` creates the row first so the write
 *     always has a real uuid to store.
 *   - On read, every stored uuid is translated back to a client id by
 *     matching it against `getCanonicalMemberId()` for each member currently
 *     in the local family tree (a fresh reverse map is built per read). A
 *     uuid that does not match any known member (for example, the member
 *     was later removed locally) is kept as the raw uuid string; the UI can
 *     still render it, simply as "Family member" instead of a name.
 *
 * A resolved client id -> uuid pair is cached for the session so repeat
 * writes to the same person do not upsert the family member row twice.
 *
 * Demo mode
 * ---------
 * When `isDemoAuthEnabled()` is true, nothing in this file touches
 * Supabase. Ceremonies live under the localStorage key
 * `everafter_demo_ceremonies`, and a completed ceremony's remembrance entry
 * lives under `everafter_demo_ceremony_events`, mirroring the shape callers
 * would otherwise read from the live `family_tree_events` table.
 */

import { supabase } from '../supabase';
import { isDemoAuthEnabled, readDemoAuthState } from '../demo-auth';
import { getFamilyMembers, getCanonicalMemberId, type FamilyMember } from '../joseph/genealogy';
import { upsertFamilyMember } from '../joseph/familyMembersDb';

export type CeremonyType =
    | 'remembrance'
    | 'gratitude'
    | 'blessing'
    | 'milestone'
    | 'legacy'
    | 'seasonal'
    | 'custom';

export type CeremonyStatus = 'draft' | 'scheduled' | 'completed' | 'archived';

export interface CeremonyStep {
    title: string;
    text: string;
}

export interface Ceremony {
    id: string;
    userId: string;
    title: string;
    description?: string;
    ceremonyType: CeremonyType;
    scheduledAt?: string;
    durationMinutes?: number;
    location?: string;
    honoreeMemberId?: string;
    participantMemberIds: string[];
    script: CeremonyStep[];
    status: CeremonyStatus;
    completedAt?: string;
    reflection?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CeremonyInput {
    title: string;
    description?: string;
    ceremonyType: CeremonyType;
    scheduledAt?: string;
    durationMinutes?: number;
    location?: string;
    honoreeMemberId?: string;
    participantMemberIds?: string[];
    script?: CeremonyStep[];
    status?: CeremonyStatus;
}

export interface CeremonyPatch {
    title?: string;
    description?: string | null;
    ceremonyType?: CeremonyType;
    scheduledAt?: string | null;
    durationMinutes?: number | null;
    location?: string | null;
    honoreeMemberId?: string | null;
    participantMemberIds?: string[];
    script?: CeremonyStep[];
    status?: CeremonyStatus;
}

interface CeremonyRow {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    ceremony_type: CeremonyType;
    scheduled_at: string | null;
    duration_minutes: number | null;
    location: string | null;
    honoree_member_id: string | null;
    participant_member_ids: string[] | null;
    script: unknown;
    status: CeremonyStatus;
    completed_at: string | null;
    reflection: string | null;
    created_at: string;
    updated_at: string;
}

const DEMO_CEREMONIES_KEY = 'everafter_demo_ceremonies';
const DEMO_CEREMONY_EVENTS_KEY = 'everafter_demo_ceremony_events';
const DEMO_FALLBACK_USER_ID = '00000000-0000-4000-8000-000000000001';

export interface DemoCeremonyEvent {
    id: string;
    userId: string;
    memberId?: string;
    legacyEventId: string;
    eventType: 'ceremony';
    eventDate: string;
    title: string;
    description?: string;
    location?: string;
}

// Session cache of resolved client id -> Supabase uuid, so repeat saves for
// the same person do not upsert the family member row more than once and so
// a uuid resolved moments ago (before the shared genealogy cache catches up)
// still translates back to a name on the very next read.
const legacyToUuidCache = new Map<string, string>();

function isBrowser(): boolean {
    return typeof window !== 'undefined';
}

function readLocalJson<T>(key: string, fallback: T): T {
    if (!isBrowser()) return fallback;
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}

function writeLocalJson<T>(key: string, value: T): void {
    if (!isBrowser()) return;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage may be unavailable (private browsing, quota). The caller
        // already has the in-memory result, so the interaction still works
        // for the current session even if it does not persist.
    }
}

// Built-in sample ceremonies so demo mode opens with something to explore.
// Seeded into localStorage on first read only; once the key exists (even as
// an empty list because the user archived them all), the seed never returns.
function buildDemoSeedCeremonies(): Ceremony[] {
    const now = new Date();
    const inTwoWeeks = new Date(now.getTime() + 14 * 86_400_000).toISOString();
    const sixWeeksAgo = new Date(now.getTime() - 42 * 86_400_000).toISOString();
    const members = getFamilyMembers();
    const grandmother = members.find((m) => m.firstName === 'Margaret') || members[0];
    const honoreeName = grandmother ? `${grandmother.firstName} ${grandmother.lastName}` : undefined;
    const participantIds = members.filter((m) => !m.deathDate).slice(0, 3).map((m) => m.id);
    return [
        {
            id: 'demo-ceremony-remembrance',
            userId: DEMO_FALLBACK_USER_ID,
            title: honoreeName ? `Remembering ${grandmother?.firstName}` : 'A Remembrance Gathering',
            description: 'A quiet gathering to hold space for a life well lived and the memories we carry forward.',
            ceremonyType: 'remembrance',
            scheduledAt: inTwoWeeks,
            durationMinutes: 45,
            location: 'The family home',
            honoreeMemberId: grandmother?.id,
            participantMemberIds: participantIds,
            script: buildCeremonyScript('remembrance', grandmother?.firstName),
            status: 'scheduled',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        },
        {
            id: 'demo-ceremony-gratitude',
            userId: DEMO_FALLBACK_USER_ID,
            title: 'A Season of Gratitude',
            description: 'Naming what we are thankful for as a family, and the people who made it possible.',
            ceremonyType: 'gratitude',
            durationMinutes: 30,
            participantMemberIds: participantIds,
            script: buildCeremonyScript('gratitude'),
            status: 'completed',
            completedAt: sixWeeksAgo,
            reflection: 'We each shared one thing we were grateful for. The children surprised us with how much they noticed. A warm, unhurried evening we will remember.',
            createdAt: sixWeeksAgo,
            updatedAt: sixWeeksAgo,
        },
    ];
}

function readDemoCeremonies(): Ceremony[] {
    if (isBrowser() && window.localStorage.getItem(DEMO_CEREMONIES_KEY) === null) {
        const seed = buildDemoSeedCeremonies();
        writeDemoCeremonies(seed);
        // Mirror the completed ceremony into the chronicle events store.
        const completed = seed.filter((c) => c.status === 'completed');
        if (completed.length > 0) {
            writeDemoCeremonyEvents(
                completed.map((c) => ({
                    id: `evt-${c.id}`,
                    userId: c.userId,
                    memberId: c.honoreeMemberId,
                    legacyEventId: `ceremony_${c.id}`,
                    eventType: 'ceremony' as const,
                    eventDate: (c.completedAt || c.createdAt).slice(0, 10),
                    title: c.title,
                    description: c.reflection?.slice(0, 280),
                    location: c.location,
                })),
            );
        }
        return seed;
    }
    return readLocalJson<Ceremony[]>(DEMO_CEREMONIES_KEY, []);
}

function writeDemoCeremonies(ceremonies: Ceremony[]): void {
    writeLocalJson(DEMO_CEREMONIES_KEY, ceremonies);
}

function readDemoCeremonyEvents(): DemoCeremonyEvent[] {
    return readLocalJson<DemoCeremonyEvent[]>(DEMO_CEREMONY_EVENTS_KEY, []);
}

function writeDemoCeremonyEvents(events: DemoCeremonyEvent[]): void {
    writeLocalJson(DEMO_CEREMONY_EVENTS_KEY, events);
}

function getDemoUserId(): string {
    return readDemoAuthState().user?.id || DEMO_FALLBACK_USER_ID;
}

function generateLocalId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function trimOrUndefined(value: string | undefined | null): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

async function requireLiveUserId(action: string): Promise<string> {
    if (!supabase) {
        throw new Error('Ceremonies are unavailable right now because the connection to Supabase is not configured.');
    }
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) {
        throw new Error(`Sign in to ${action}.`);
    }
    return userId;
}

/**
 * Resolve a list of client-side family graph ids to their Supabase uuids,
 * persisting any family member that has not been saved to the database yet.
 * Ids that cannot be resolved (unknown client id, upsert failure) are
 * silently dropped rather than blocking the ceremony save.
 */
async function resolveClientIdsToUuids(clientIds: string[], userId: string): Promise<string[]> {
    if (clientIds.length === 0) return [];

    const uniqueIds = Array.from(new Set(clientIds.filter(Boolean)));
    const membersById = new Map<string, FamilyMember>(getFamilyMembers().map((member) => [member.id, member]));
    const uuids: string[] = [];

    for (const clientId of uniqueIds) {
        let uuid = legacyToUuidCache.get(clientId) ?? getCanonicalMemberId(clientId);

        if (!uuid) {
            const member = membersById.get(clientId);
            if (member) {
                const row = await upsertFamilyMember(member, userId);
                uuid = row?.id ?? undefined;
            }
        }

        if (uuid) {
            legacyToUuidCache.set(clientId, uuid);
            uuids.push(uuid);
        }
    }

    return uuids;
}

async function resolveClientIdToUuid(clientId: string | null | undefined, userId: string): Promise<string | null> {
    if (!clientId) return null;
    const [uuid] = await resolveClientIdsToUuids([clientId], userId);
    return uuid ?? null;
}

/**
 * Reverse lookup built fresh on every read: Supabase uuid -> client graph
 * id, for every family member currently known locally (including ids
 * resolved earlier this session that the shared genealogy cache has not
 * caught up with yet).
 */
function buildUuidToClientIdMap(): Map<string, string> {
    const map = new Map<string, string>();
    for (const member of getFamilyMembers()) {
        const uuid = getCanonicalMemberId(member.id) ?? legacyToUuidCache.get(member.id);
        if (uuid) map.set(uuid, member.id);
    }
    return map;
}

function translateUuidsToClientIds(uuids: string[] | null | undefined, uuidMap: Map<string, string>): string[] {
    if (!uuids || uuids.length === 0) return [];
    return uuids.map((uuid) => uuidMap.get(uuid) ?? uuid);
}

function rowToCeremony(row: CeremonyRow, uuidMap: Map<string, string>): Ceremony {
    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        description: row.description ?? undefined,
        ceremonyType: row.ceremony_type,
        scheduledAt: row.scheduled_at ?? undefined,
        durationMinutes: row.duration_minutes ?? undefined,
        location: row.location ?? undefined,
        honoreeMemberId: row.honoree_member_id ? (uuidMap.get(row.honoree_member_id) ?? row.honoree_member_id) : undefined,
        participantMemberIds: translateUuidsToClientIds(row.participant_member_ids, uuidMap),
        script: Array.isArray(row.script) ? (row.script as CeremonyStep[]) : [],
        status: row.status,
        completedAt: row.completed_at ?? undefined,
        reflection: row.reflection ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function byRecencyDesc(left: Ceremony, right: Ceremony): number {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

/** List every ceremony the signed-in user owns, newest first. */
export async function listCeremonies(): Promise<Ceremony[]> {
    if (isDemoAuthEnabled()) {
        return readDemoCeremonies().sort(byRecencyDesc);
    }

    const userId = await requireLiveUserId('view your ceremonies');

    const { data, error } = await supabase
        .from('ceremonies')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`We could not load your ceremonies right now: ${error.message}`);
    }

    const uuidMap = buildUuidToClientIdMap();
    return ((data ?? []) as CeremonyRow[]).map((row) => rowToCeremony(row, uuidMap));
}

/** Create a new ceremony, defaulting to a draft unless a status is given. */
export async function createCeremony(input: CeremonyInput): Promise<Ceremony> {
    const title = input.title.trim();
    if (!title) {
        throw new Error('Give the ceremony a title before saving.');
    }

    const nowIso = new Date().toISOString();
    const status = input.status ?? 'draft';

    if (isDemoAuthEnabled()) {
        const userId = getDemoUserId();
        const ceremony: Ceremony = {
            id: generateLocalId('demo-ceremony'),
            userId,
            title,
            description: trimOrUndefined(input.description),
            ceremonyType: input.ceremonyType,
            scheduledAt: input.scheduledAt,
            durationMinutes: input.durationMinutes,
            location: trimOrUndefined(input.location),
            honoreeMemberId: input.honoreeMemberId,
            participantMemberIds: input.participantMemberIds ?? [],
            script: input.script ?? [],
            status,
            createdAt: nowIso,
            updatedAt: nowIso,
        };

        const ceremonies = readDemoCeremonies();
        ceremonies.push(ceremony);
        writeDemoCeremonies(ceremonies);
        return ceremony;
    }

    const userId = await requireLiveUserId('plan a ceremony');
    const honoreeUuid = await resolveClientIdToUuid(input.honoreeMemberId ?? null, userId);
    const participantUuids = await resolveClientIdsToUuids(input.participantMemberIds ?? [], userId);

    const { data, error } = await supabase
        .from('ceremonies')
        .insert({
            user_id: userId,
            title,
            description: trimOrUndefined(input.description) ?? null,
            ceremony_type: input.ceremonyType,
            scheduled_at: input.scheduledAt ?? null,
            duration_minutes: input.durationMinutes ?? null,
            location: trimOrUndefined(input.location) ?? null,
            honoree_member_id: honoreeUuid,
            participant_member_ids: participantUuids,
            script: input.script ?? [],
            status,
        })
        .select('*')
        .single();

    if (error || !data) {
        throw new Error(`We could not save this ceremony: ${error?.message ?? 'an unknown error occurred'}.`);
    }

    return rowToCeremony(data as CeremonyRow, buildUuidToClientIdMap());
}

/** Update an existing ceremony. Only the fields present in `patch` change. */
export async function updateCeremony(id: string, patch: CeremonyPatch): Promise<Ceremony> {
    if (isDemoAuthEnabled()) {
        const ceremonies = readDemoCeremonies();
        const index = ceremonies.findIndex((ceremony) => ceremony.id === id);
        if (index === -1) {
            throw new Error('This ceremony could not be found.');
        }

        const current = ceremonies[index];
        const next: Ceremony = {
            ...current,
            title: patch.title !== undefined ? patch.title.trim() || current.title : current.title,
            description: patch.description !== undefined ? trimOrUndefined(patch.description) : current.description,
            ceremonyType: patch.ceremonyType ?? current.ceremonyType,
            scheduledAt: patch.scheduledAt !== undefined ? (patch.scheduledAt ?? undefined) : current.scheduledAt,
            durationMinutes: patch.durationMinutes !== undefined ? (patch.durationMinutes ?? undefined) : current.durationMinutes,
            location: patch.location !== undefined ? trimOrUndefined(patch.location) : current.location,
            honoreeMemberId: patch.honoreeMemberId !== undefined ? (patch.honoreeMemberId ?? undefined) : current.honoreeMemberId,
            participantMemberIds: patch.participantMemberIds ?? current.participantMemberIds,
            script: patch.script ?? current.script,
            status: patch.status ?? current.status,
            updatedAt: new Date().toISOString(),
        };

        ceremonies[index] = next;
        writeDemoCeremonies(ceremonies);
        return next;
    }

    const userId = await requireLiveUserId('update this ceremony');
    const updatePayload: Record<string, unknown> = {};

    if (patch.title !== undefined) updatePayload.title = patch.title.trim();
    if (patch.description !== undefined) updatePayload.description = trimOrUndefined(patch.description) ?? null;
    if (patch.ceremonyType !== undefined) updatePayload.ceremony_type = patch.ceremonyType;
    if (patch.scheduledAt !== undefined) updatePayload.scheduled_at = patch.scheduledAt;
    if (patch.durationMinutes !== undefined) updatePayload.duration_minutes = patch.durationMinutes;
    if (patch.location !== undefined) updatePayload.location = trimOrUndefined(patch.location) ?? null;
    if (patch.script !== undefined) updatePayload.script = patch.script;
    if (patch.status !== undefined) updatePayload.status = patch.status;
    if (patch.honoreeMemberId !== undefined) {
        updatePayload.honoree_member_id = await resolveClientIdToUuid(patch.honoreeMemberId, userId);
    }
    if (patch.participantMemberIds !== undefined) {
        updatePayload.participant_member_ids = await resolveClientIdsToUuids(patch.participantMemberIds, userId);
    }

    const { data, error } = await supabase
        .from('ceremonies')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();

    if (error || !data) {
        throw new Error(`We could not update this ceremony: ${error?.message ?? 'an unknown error occurred'}.`);
    }

    return rowToCeremony(data as CeremonyRow, buildUuidToClientIdMap());
}

/**
 * Mark a ceremony complete and record it in the family's remembrance
 * timeline (`family_tree_events`, event_type "ceremony") so Chronicle can
 * show it alongside the rest of the family's history.
 */
export async function completeCeremony(id: string, reflection?: string): Promise<Ceremony> {
    const trimmedReflection = trimOrUndefined(reflection);
    const completedAt = new Date().toISOString();
    const eventDate = completedAt.slice(0, 10);
    const legacyEventId = `ceremony_${id}`;

    if (isDemoAuthEnabled()) {
        const ceremonies = readDemoCeremonies();
        const index = ceremonies.findIndex((ceremony) => ceremony.id === id);
        if (index === -1) {
            throw new Error('This ceremony could not be found.');
        }

        const current = ceremonies[index];
        const next: Ceremony = {
            ...current,
            status: 'completed',
            completedAt,
            reflection: trimmedReflection,
            updatedAt: completedAt,
        };
        ceremonies[index] = next;
        writeDemoCeremonies(ceremonies);

        const events = readDemoCeremonyEvents();
        const eventIndex = events.findIndex((event) => event.legacyEventId === legacyEventId);
        const event: DemoCeremonyEvent = {
            id: eventIndex >= 0 ? events[eventIndex].id : generateLocalId('demo-ceremony-event'),
            userId: current.userId,
            memberId: current.honoreeMemberId,
            legacyEventId,
            eventType: 'ceremony',
            eventDate,
            title: current.title,
            description: trimmedReflection?.slice(0, 280),
            location: current.location,
        };
        if (eventIndex >= 0) {
            events[eventIndex] = event;
        } else {
            events.push(event);
        }
        writeDemoCeremonyEvents(events);

        return next;
    }

    const userId = await requireLiveUserId('complete this ceremony');

    const { data, error } = await supabase
        .from('ceremonies')
        .update({
            status: 'completed',
            completed_at: completedAt,
            reflection: trimmedReflection ?? null,
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select('*')
        .single();

    if (error || !data) {
        throw new Error(`We could not mark this ceremony complete: ${error?.message ?? 'an unknown error occurred'}.`);
    }

    const row = data as CeremonyRow;
    const { error: eventError } = await supabase
        .from('family_tree_events')
        .upsert(
            {
                user_id: userId,
                member_id: row.honoree_member_id,
                legacy_event_id: legacyEventId,
                event_type: 'ceremony',
                event_date: eventDate,
                title: row.title,
                description: trimmedReflection?.slice(0, 280) ?? null,
                location: row.location,
            },
            { onConflict: 'user_id,legacy_event_id' },
        );

    if (eventError) {
        throw new Error(
            `The ceremony was marked complete, but it could not be added to the family Chronicle: ${eventError.message}.`,
        );
    }

    return rowToCeremony(row, buildUuidToClientIdMap());
}

/** Archive a ceremony so it steps out of the active planning views. */
export async function archiveCeremony(id: string): Promise<void> {
    if (isDemoAuthEnabled()) {
        const ceremonies = readDemoCeremonies();
        const index = ceremonies.findIndex((ceremony) => ceremony.id === id);
        if (index === -1) {
            throw new Error('This ceremony could not be found.');
        }
        ceremonies[index] = { ...ceremonies[index], status: 'archived', updatedAt: new Date().toISOString() };
        writeDemoCeremonies(ceremonies);
        return;
    }

    const userId = await requireLiveUserId('archive this ceremony');
    const { error } = await supabase
        .from('ceremonies')
        .update({ status: 'archived' })
        .eq('id', id)
        .eq('user_id', userId);

    if (error) {
        throw new Error(`We could not archive this ceremony: ${error.message}.`);
    }
}

function honoreeLabel(honoreeName?: string): string {
    const trimmed = honoreeName?.trim();
    return trimmed ? trimmed : 'the person you are honoring';
}

/**
 * Build a complete, dignified ceremony script for the given type. This is
 * the first-class path for filling in a new ceremony's steps; any backend
 * suggestion is strictly an optional, best-effort enhancement layered on
 * top of what this function returns.
 */
export function buildCeremonyScript(type: CeremonyType, honoreeName?: string): CeremonyStep[] {
    const name = honoreeLabel(honoreeName);

    switch (type) {
        case 'remembrance':
            return [
                {
                    title: 'Gathering in Stillness',
                    text: `Invite everyone present to settle into a quiet moment together. Light a candle if it feels right, and let the room grow calm before beginning. This time is set apart to hold ${name} in memory.`,
                },
                {
                    title: 'A Shared Memory',
                    text: `Ask each person to share one memory of ${name}, however small. There is no need to speak in order or at length; some may prefer to simply listen, and that is welcome too.`,
                },
                {
                    title: 'A Reading',
                    text: `Read a passage, poem, or letter that speaks to who ${name} was. This might be something ${name} loved, words written for this moment, or a passage from a tradition that feels true to your family.`,
                },
                {
                    title: 'A Moment of Quiet',
                    text: `Sit together in silence for as long as feels right. Let this be an unhurried pause, a chance to simply be present with the memory of ${name} without needing to fill the space with words.`,
                },
                {
                    title: 'Closing Gratitude',
                    text: `Close by naming, one by one or together, what you are grateful ${name} gave your family. End with a simple word of thanks, and let the gathering close gently rather than abruptly.`,
                },
            ];

        case 'gratitude':
            return [
                {
                    title: 'Naming the Blessings',
                    text: 'Begin by inviting everyone to think quietly about the past season and what has felt like a gift, large or small. Simple things count as much as milestones.',
                },
                {
                    title: 'An Appreciation Round',
                    text: 'Go around the circle and let each person name someone present they are grateful for, and why. Keep it warm and specific; a small detail often means more than a broad compliment.',
                },
                {
                    title: 'A Blessing Spoken Aloud',
                    text: 'Offer a short blessing over the family, either read aloud by one person or spoken together. This can be a family saying passed down, a favorite verse, or simple words of hope for one another.',
                },
                {
                    title: 'Closing Thanks',
                    text: 'End with a shared moment of thanks, spoken aloud or held quietly. Consider writing down one thing from this gathering to revisit at the next one.',
                },
            ];

        case 'blessing':
            return [
                {
                    title: 'Setting the Intention',
                    text: 'Open by naming why the family has gathered and who is being blessed today. Keep the opening simple and unhurried, so everyone arrives at the same quiet pace.',
                },
                {
                    title: 'Words of Blessing',
                    text: `Speak words of blessing over ${name}, either from one voice or gathered from everyone present. These can be borrowed from a family tradition, a faith practice, or written new for this moment.`,
                },
                {
                    title: 'Hopes for the Road Ahead',
                    text: `Invite each person to share one hope for ${name}'s road ahead. A single sentence is enough.`,
                },
                {
                    title: 'Closing Embrace',
                    text: 'Close with a shared gesture, an embrace, joined hands, or a quiet moment together, so the blessing carries forward beyond the words spoken.',
                },
            ];

        case 'milestone':
            return [
                {
                    title: 'Marking the Moment',
                    text: `Open by naming the milestone being marked for ${name} and why it matters to the family. A short, plain statement is enough to set the tone.`,
                },
                {
                    title: 'Looking Back',
                    text: `Invite a few stories from the path that led here: the effort, the setbacks, and the steady work that made this milestone possible for ${name}.`,
                },
                {
                    title: 'Words of Encouragement',
                    text: `Let each person offer a short word of encouragement or pride directly to ${name}. Keep it simple and sincere.`,
                },
                {
                    title: 'Looking Ahead',
                    text: `Turn together toward what comes next for ${name}, naming one hope or wish for the chapter now beginning.`,
                },
                {
                    title: 'A Closing Toast',
                    text: 'Close with a toast, a shared drink, or simply raised hands, marking the milestone together before returning to the ordinary rhythm of the day.',
                },
            ];

        case 'legacy':
            return [
                {
                    title: 'Naming the Legacy',
                    text: `Begin by naming plainly what is being passed down today, whether a responsibility, a keepsake, or a piece of the family's story, and why ${name} chose this moment to pass it on.`,
                },
                {
                    title: 'The Designated Successor',
                    text: 'Name the person entrusted to carry this responsibility forward, and speak plainly about what is being asked of them. Let them respond in their own words if they wish.',
                },
                {
                    title: 'The Story Behind It',
                    text: `Share the story behind what is being passed down: where it came from, what it has meant to ${name}, and why it deserves care going forward.`,
                },
                {
                    title: 'A Commitment Spoken Aloud',
                    text: 'Invite the designated successor to speak a short commitment aloud, in their own words, acknowledging what they are accepting.',
                },
                {
                    title: 'Closing Gratitude',
                    text: `Close with thanks, both to ${name} for entrusting this legacy and to the family for witnessing it together.`,
                },
            ];

        case 'seasonal':
            return [
                {
                    title: 'Welcoming the Season',
                    text: 'Open by naming the season and what it traditionally means for your family. A short welcome is enough to bring everyone into the same moment.',
                },
                {
                    title: 'A Family Tradition Remembered',
                    text: 'Share a tradition tied to this time of year: where it began, who started it, and why the family has kept it going.',
                },
                {
                    title: 'Gratitude for the Year',
                    text: 'Invite each person to name one thing from the past season they are grateful for, keeping it brief and specific.',
                },
                {
                    title: 'A Wish for the Season Ahead',
                    text: 'Close by sharing one hope for the season to come, spoken aloud or held quietly by each person present.',
                },
            ];

        case 'custom':
        default:
            return [
                {
                    title: 'Opening Words',
                    text: 'Begin by naming why the family has gathered today and setting a calm, unhurried tone for what follows.',
                },
                {
                    title: 'The Heart of the Gathering',
                    text: 'Give this middle portion of the ceremony to whatever matters most for the occasion: a reading, a story, a shared activity, or simply conversation.',
                },
                {
                    title: 'A Shared Reflection',
                    text: 'Invite each person present to offer a brief reflection on the occasion, in their own words and at their own pace.',
                },
                {
                    title: 'Closing Words',
                    text: 'Close with a simple word of thanks or hope, letting the gathering end gently rather than abruptly.',
                },
            ];
    }
}
