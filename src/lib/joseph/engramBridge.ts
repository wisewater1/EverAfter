/**
 * Bridges a family member's computed personality profile (from either the
 * OCEAN quiz in PersonalityQuiz.tsx or a completed friend quiz_invite) into
 * that member's archetypal_ais row - the one engram-chat and
 * ArchetypalAIChat.tsx actually read to condition every reply. Without this,
 * a family member's own answers never changed how their engram talks.
 *
 * Resolves the link via engram_family_links (added alongside this file);
 * auto-provisions a bare engram + link on first use so every family member
 * who completes a personality flow ends up with their own differentiated AI,
 * not just users who happen to go through EngramTrainingWizard directly.
 */
import { supabase } from '../supabase';

export interface PersonalityBridgeInput {
    traits: string[];
    coreValues: string[];
    communicationStyle: string;
}

export async function syncPersonalityToEngram(
    userId: string,
    memberId: string,
    memberName: string,
    input: PersonalityBridgeInput,
): Promise<void> {
    if (!supabase || !userId || !memberId) return;

    try {
        const { data: link } = await supabase
            .from('engram_family_links')
            .select('engram_id')
            .eq('user_id', userId)
            .eq('joseph_member_id', memberId)
            .maybeSingle();

        let engramId: string | undefined = link?.engram_id;

        if (!engramId) {
            const { data: created, error: createError } = await supabase
                .from('archetypal_ais')
                .insert({
                    user_id: userId,
                    name: memberName || 'Family Member',
                    description: `AI representation of ${memberName || 'a family member'}, trained from their personality profile.`,
                })
                .select('id')
                .single();

            if (createError || !created) return;
            engramId = created.id;

            await supabase.from('engram_family_links').upsert({
                engram_id: engramId,
                user_id: userId,
                joseph_member_id: memberId,
                updated_at: new Date().toISOString(),
            });
        }

        await supabase
            .from('archetypal_ais')
            .update({
                personality_traits: input.traits,
                core_values: input.coreValues,
                communication_style: input.communicationStyle,
                updated_at: new Date().toISOString(),
            })
            .eq('id', engramId);
    } catch (err) {
        console.warn('Failed to sync personality profile to engram:', err);
    }
}
