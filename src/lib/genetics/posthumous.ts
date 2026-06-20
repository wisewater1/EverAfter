/**
 * Genetic data — posthumous directive persistence.
 *
 * PR 6 of the genetics roadmap. Read/write helpers around the
 * posthumous_directive jsonb column on public.genetic_profiles. Pure
 * async — no React, no UI state. The editor component (also in PR 6)
 * is the only caller for now.
 *
 * The directive is the EverAfter moat: every other genetic-data
 * platform punts on what happens to the file after the owner is gone.
 * The PR #71 schema ships first-class structured fields; this module
 * is the lifecycle around them.
 */

import { supabase } from '../supabase';
import { DEFAULT_POSTHUMOUS_DIRECTIVE, type PosthumousDirective } from './types';

export class PosthumousError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'PosthumousError';
    }
}

function ensureClient() {
    if (!supabase) {
        throw new PosthumousError('Supabase client is not configured.');
    }
    return supabase;
}

/**
 * Fetch the directive for a single genetic profile.
 *
 * Returns the schema-default directive when the row exists but has no
 * directive set, and null when the row itself is missing (or the
 * caller doesn't own it — RLS would return zero rows in that case).
 */
export async function getPosthumousDirective(
    profileId: string,
    userId: string,
): Promise<PosthumousDirective | null> {
    const client = ensureClient();
    const { data, error } = await client
        .from('genetic_profiles')
        .select('posthumous_directive')
        .eq('id', profileId)
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw new PosthumousError(error.message, error);
    if (!data) return null;
    return normalize(data.posthumous_directive);
}

/**
 * Replace the directive on a single profile.
 *
 * Caller passes the full object; we don't merge against the existing
 * row server-side so the user always knows the resulting shape. The
 * editor UI handles defaults locally before calling this.
 */
export async function setPosthumousDirective(
    profileId: string,
    userId: string,
    directive: PosthumousDirective,
): Promise<void> {
    const client = ensureClient();
    const { error } = await client
        .from('genetic_profiles')
        .update({ posthumous_directive: normalize(directive) })
        .eq('id', profileId)
        .eq('user_id', userId);
    if (error) throw new PosthumousError(error.message, error);
}

/**
 * Apply the same directive to every genetic profile owned by the
 * caller. Useful for the "use these defaults for everything" CTA in
 * the editor — sets a consistent baseline across all family DNA files.
 */
export async function applyDirectiveToAllProfiles(
    userId: string,
    directive: PosthumousDirective,
): Promise<{ updated: number }> {
    const client = ensureClient();
    const { data, error } = await client
        .from('genetic_profiles')
        .update({ posthumous_directive: normalize(directive) })
        .eq('user_id', userId)
        .select('id');
    if (error) throw new PosthumousError(error.message, error);
    return { updated: data?.length ?? 0 };
}

/**
 * Coerce an unknown-shape value (jsonb from the DB) into a strict
 * PosthumousDirective. Fills missing fields from
 * DEFAULT_POSTHUMOUS_DIRECTIVE so the rest of the app never has to
 * defensively undefined-check directive subfields.
 */
export function normalize(value: unknown): PosthumousDirective {
    const v = (value ?? {}) as Partial<PosthumousDirective>;
    return {
        policy:
            v.policy === 'destroy' ||
            v.policy === 'preserve_locked' ||
            v.policy === 'release_to_pdg' ||
            v.policy === 'ask_pdg'
                ? v.policy
                : DEFAULT_POSTHUMOUS_DIRECTIVE.policy,
        destroy_after_days:
            typeof v.destroy_after_days === 'number' && v.destroy_after_days > 0
                ? v.destroy_after_days
                : null,
        notify_pdg_ids: Array.isArray(v.notify_pdg_ids)
            ? (v.notify_pdg_ids.filter((id) => typeof id === 'string') as string[])
            : [],
        actionable_findings_to_pdg: v.actionable_findings_to_pdg === true,
        raw_data_to_pdg: v.raw_data_to_pdg === true,
        notify_blood_relatives:
            v.notify_blood_relatives === 'auto' ||
            v.notify_blood_relatives === 'ask' ||
            v.notify_blood_relatives === 'never'
                ? v.notify_blood_relatives
                : DEFAULT_POSTHUMOUS_DIRECTIVE.notify_blood_relatives,
    };
}
