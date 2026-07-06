import { apiClient } from '../api-client';
import { buildQuizShareMessage, markQuizInviteSent } from './quizSessions';

export interface SendQuestionsResult {
    ok: boolean;
    method: 'shared' | 'copied' | 'prompt' | 'cancelled' | 'failed';
    link: string;
}

/**
 * One seamless way to send the personality questionnaire to a family member,
 * used from both St Joseph and the dashboard.
 *
 * Mints a real public `/quiz/<token>` invite (the member can answer with NO
 * account, on any device), then hands it off via the native share sheet,
 * the clipboard, or a prompt fallback. Falls back to a local link if the
 * backend can't mint an invite (offline/demo).
 */
export async function sendPersonalityQuestions(
    memberName: string,
    memberId: string,
): Promise<SendQuestionsResult> {
    const invite = await apiClient.createQuizInvite(memberName, memberId);
    const { subject, body, link } = invite
        ? {
            subject: `EverAfter personality questions for ${memberName}`,
            body: `Please answer a few quick questions about ${memberName} here (no account needed): ${window.location.origin}${invite.share_path}`,
            link: `${window.location.origin}${invite.share_path}`,
        }
        : buildQuizShareMessage(memberName, memberId);
    const shareText = `${subject}\n\n${body}`;

    // Native share sheet (best on mobile).
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
            await navigator.share({ title: subject, text: body, url: link });
            markQuizInviteSent(memberId);
            return { ok: true, method: 'shared', link };
        } catch (error) {
            // User dismissed the share sheet: not an error, and don't double-handle.
            if (error instanceof Error && error.name === 'AbortError') {
                return { ok: false, method: 'cancelled', link };
            }
            // otherwise fall through to clipboard
        }
    }

    // Clipboard (copies the full message incl. the link).
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(shareText);
            markQuizInviteSent(memberId);
            return { ok: true, method: 'copied', link };
        } catch {
            /* fall through to prompt */
        }
    }

    // Last-resort prompt.
    try {
        window.prompt('Copy this personality-questions link', link);
        markQuizInviteSent(memberId);
        return { ok: true, method: 'prompt', link };
    } catch {
        return { ok: false, method: 'failed', link };
    }
}
