/**
 * Persistence for approved voice answers.
 *
 * Writes the reviewed transcript to public.voice_samples (owner-scoped by
 * RLS), provisioning a public.voice_profiles row on first use so the sample
 * has a home. The derived Likert value itself flows into the personality
 * quiz through the caller's onApprovedAnswer, which is what reaches the
 * family member's engram, the Family Tree, and the Trinity Dashboard; this
 * module keeps the durable audio-transcript record alongside it.
 *
 * Demo sessions persist to localStorage so the flow is fully exercisable
 * without a live account.
 */

import { supabase } from '../supabase';
import { isDemoAuthEnabled } from '../demo-auth';

export interface ApprovedVoiceAnswer {
    familyMemberId: string;
    questionId: string;
    questionText: string;
    transcript: string;
    transcriptConfidence: number;
    likertValue: number;
    durationSeconds: number;
}

const DEMO_KEY = 'everafter_demo_voice_answers';

async function currentUserId(): Promise<string | null> {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
}

/** Ensure an owner+member voice profile exists (with consent recorded). */
async function ensureVoiceProfile(userId: string, familyMemberId: string): Promise<string | null> {
    if (!supabase) return null;
    const { data: existing } = await supabase
        .from('voice_profiles')
        .select('id')
        .eq('owner_user_id', userId)
        .eq('family_member_id', familyMemberId)
        .maybeSingle();
    if (existing?.id) return existing.id as string;

    const { data: created, error } = await supabase
        .from('voice_profiles')
        .insert({
            owner_user_id: userId,
            family_member_id: familyMemberId,
            status: 'active',
            consent_status: 'opted_in',
            training_status: 'collecting',
            consent_snapshot_json: { granted_at: new Date().toISOString(), source: 'voice_answer_flow' },
        })
        .select('id')
        .single();
    if (error) {
        console.warn('ensureVoiceProfile failed:', error.message);
        return null;
    }
    return created.id as string;
}

/**
 * Persist an approved answer. Returns true when the durable record was
 * saved; a false return never blocks the caller from applying the Likert
 * value, it only means the transcript archive was skipped.
 */
export async function persistApprovedVoiceAnswer(answer: ApprovedVoiceAnswer): Promise<boolean> {
    if (isDemoAuthEnabled() || !supabase) {
        try {
            const raw = localStorage.getItem(DEMO_KEY);
            const list = raw ? JSON.parse(raw) : [];
            list.push({ ...answer, approved: true, created_at: new Date().toISOString() });
            localStorage.setItem(DEMO_KEY, JSON.stringify(list.slice(-100)));
            return true;
        } catch {
            return false;
        }
    }

    try {
        const userId = await currentUserId();
        if (!userId) return false;
        const profileId = await ensureVoiceProfile(userId, answer.familyMemberId);
        if (!profileId) return false;

        const { error } = await supabase.from('voice_samples').insert({
            voice_profile_id: profileId,
            owner_user_id: userId,
            family_member_id: answer.familyMemberId,
            clip_type: 'quiz_answer',
            prompt_text: answer.questionText,
            transcript: answer.transcript,
            transcript_confidence: answer.transcriptConfidence,
            duration_seconds: answer.durationSeconds,
            approved: true,
            review_status: 'approved',
            derived_quiz_question_id: answer.questionId,
            quality_json: { likert_value: answer.likertValue, reviewed_by_user: true },
        });
        if (error) {
            console.warn('persistApprovedVoiceAnswer failed:', error.message);
            return false;
        }
        return true;
    } catch (error) {
        console.warn('persistApprovedVoiceAnswer error', error);
        return false;
    }
}
