/**
 * Family members: DB persistence layer.
 *
 * Bridges the in-memory genealogy graph (buildFamilyTree() / FamilyMember
 * in genealogy.ts) with the Supabase `family_members` table. Designed to
 * be opt-in: nothing else has to change for the existing flows to keep
 * working. Future PRs can call upsertFamilyMember() on edit/save to
 * gradually migrate users from the seeded data to real DB rows.
 *
 * The migration 20260620180000 added genealogy columns + a (user_id,
 * legacy_id) unique index. This module assumes both are present.
 */

import { supabase } from '../supabase';
import type { FamilyMember } from './genealogy';

export interface DbFamilyMember {
    id: string;
    user_id: string;
    legacy_id: string | null;
    first_name: string | null;
    last_name: string | null;
    gender: 'male' | 'female' | 'other' | null;
    birth_date: string | null;
    death_date: string | null;
    birth_place: string | null;
    photo_url: string | null;
    bio: string | null;
    generation: number;
    occupation: string | null;
    family_role: string | null;
    engram_id: string | null;
    calendar_url: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

/**
 * Convert an in-memory FamilyMember into the columns expected by the
 * `family_members` table. The two shapes are close but not identical, 
 * camelCase vs snake_case, `id` becomes `legacy_id`, and the AI
 * personality / media permissions / info stack live in `metadata` jsonb.
 */
function toDbShape(
    member: FamilyMember,
    userId: string,
): Omit<DbFamilyMember, 'id' | 'created_at' | 'updated_at'> {
    return {
        user_id: userId,
        legacy_id: member.id,
        first_name: member.firstName,
        last_name: member.lastName,
        gender:
            member.gender === 'male' || member.gender === 'female' || member.gender === 'other'
                ? member.gender
                : null,
        birth_date: member.birthDate ?? null,
        death_date: member.deathDate ?? null,
        birth_place: member.birthPlace ?? null,
        photo_url: member.photo ?? null,
        bio: member.bio ?? null,
        generation: member.generation ?? 0,
        occupation: member.occupation ?? null,
        family_role: member.aiPersonality?.familyRole ?? null,
        engram_id: member.engramId ?? null,
        calendar_url: member.calendarUrl ?? null,
        metadata: {
            aiPersonality: member.aiPersonality ?? null,
            infoStack: member.infoStack ?? null,
            mediaPermissions: member.mediaPermissions ?? null,
            sources: member.sources ?? null,
            notes: member.notes ?? null,
            githubUsername: member.githubUsername ?? null,
        },
    };
}

/**
 * Upsert a family member, keyed by (user_id, legacy_id). Returns the
 * DB row (id is the canonical UUID future PRs should FK against). Safe
 * to call even when the user already has a row: it updates in place.
 */
export async function upsertFamilyMember(
    member: FamilyMember,
    userId: string,
): Promise<DbFamilyMember | null> {
    if (!supabase) return null;
    if (!userId) throw new Error('upsertFamilyMember: userId is required');

    const shape = toDbShape(member, userId);
    // Required columns from the original family_members table (created
    // 2025-10-06 as an invitation table) must be filled or the row won't
    // insert. We synthesize sensible values from the genealogy shape.
    const fullName = `${member.firstName} ${member.lastName}`.trim();

    const { data, error } = await supabase
        .from('family_members')
        .upsert(
            {
                ...shape,
                // Legacy required columns: only used by the invitation flow,
                // but NOT NULL on the table.
                name: fullName,
                email: `${member.id}@in-tree.local`,
                relationship: member.aiPersonality?.familyRole ?? 'Family',
            },
            { onConflict: 'user_id,legacy_id' },
        )
        .select()
        .single();

    if (error) {
        console.warn('upsertFamilyMember failed:', error.message);
        return null;
    }
    return data as DbFamilyMember;
}

/**
 * Look up the DB UUID for a seeded FamilyMember (by legacy_id) so the
 * caller can FK into vault_items / beneficiaries / engrams without
 * upserting first. Returns null if the member hasn't been persisted yet.
 */
export async function findFamilyMemberDbId(
    legacyId: string,
    userId: string,
): Promise<string | null> {
    if (!supabase || !userId || !legacyId) return null;

    const { data, error } = await supabase
        .from('family_members')
        .select('id')
        .eq('user_id', userId)
        .eq('legacy_id', legacyId)
        .maybeSingle();

    if (error || !data) return null;
    return data.id as string;
}

/**
 * Bulk-upsert the entire in-memory family tree. Intended to be called
 * once per user (e.g., from a one-time backfill action in settings) so
 * every seeded member gets a DB id. Returns the count of rows touched.
 */
export async function bulkUpsertFamilyMembers(
    members: FamilyMember[],
    userId: string,
): Promise<number> {
    if (!supabase || !members.length || !userId) return 0;

    let count = 0;
    // Sequential is fine: ~30 members max in practice: and keeps the
    // error path easy to reason about.
    for (const member of members) {
        const result = await upsertFamilyMember(member, userId);
        if (result) count += 1;
    }
    return count;
}
