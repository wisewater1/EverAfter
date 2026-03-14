export interface StoredQuizQuestion {
    id: string;
    text: string;
    category: string;
    number: number;
}

export interface StoredQuizSession {
    memberId: string;
    memberName: string;
    sessionId: string;
    questions: StoredQuizQuestion[];
    answers: Record<string, number>;
    currentQ: number;
    startedAt: string;
    updatedAt: string;
    lastSentAt?: string;
    sentCount?: number;
}

export interface QuizProgressSnapshot {
    memberId: string;
    memberName: string;
    answeredCount: number;
    totalQuestions: number;
    currentQuestionNumber: number;
    progressPercent: number;
    updatedAt: string;
    startedAt: string;
    lastSentAt?: string;
    sentCount: number;
    isComplete: boolean;
}

const SESSION_PREFIX = 'everafter_quiz_progress_';
export const QUIZ_SESSIONS_UPDATED_EVENT = 'everafter-quiz-sessions-updated';

export function quizSessionStorageKey(memberId: string) {
    return `${SESSION_PREFIX}${memberId}`;
}

function dispatchQuizSessionsUpdated() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(QUIZ_SESSIONS_UPDATED_EVENT));
}

export function readStoredQuizSession(memberId: string): StoredQuizSession | null {
    if (typeof window === 'undefined') return null;

    try {
        const raw = window.localStorage.getItem(quizSessionStorageKey(memberId));
        return raw ? JSON.parse(raw) as StoredQuizSession : null;
    } catch {
        return null;
    }
}

export function saveStoredQuizSession(session: StoredQuizSession) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(quizSessionStorageKey(session.memberId), JSON.stringify(session));
    dispatchQuizSessionsUpdated();
}

export function removeStoredQuizSession(memberId: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(quizSessionStorageKey(memberId));
    dispatchQuizSessionsUpdated();
}

export function listStoredQuizSessions(): StoredQuizSession[] {
    if (typeof window === 'undefined') return [];

    const sessions: StoredQuizSession[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (!key || !key.startsWith(SESSION_PREFIX)) continue;

        try {
            const raw = window.localStorage.getItem(key);
            if (!raw) continue;
            const parsed = JSON.parse(raw) as StoredQuizSession;
            if (parsed?.memberId && Array.isArray(parsed.questions)) {
                sessions.push(parsed);
            }
        } catch {
            continue;
        }
    }

    return sessions.sort((left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
}

export function buildQuizProgressSnapshot(session: StoredQuizSession): QuizProgressSnapshot {
    const totalQuestions = session.questions.length;
    const answeredCount = Object.keys(session.answers || {}).length;
    const currentQuestionNumber = Math.min(totalQuestions, Math.max(1, session.currentQ + 1));
    const progressPercent = totalQuestions > 0
        ? Math.round((answeredCount / totalQuestions) * 100)
        : 0;

    return {
        memberId: session.memberId,
        memberName: session.memberName,
        answeredCount,
        totalQuestions,
        currentQuestionNumber,
        progressPercent,
        updatedAt: session.updatedAt,
        startedAt: session.startedAt,
        lastSentAt: session.lastSentAt,
        sentCount: session.sentCount || 0,
        isComplete: totalQuestions > 0 && answeredCount >= totalQuestions,
    };
}

export function buildQuizShareLink(memberId: string) {
    if (typeof window === 'undefined') {
        return `/family-dashboard?tab=quiz&memberId=${encodeURIComponent(memberId)}`;
    }

    return `${window.location.origin}/family-dashboard?tab=quiz&memberId=${encodeURIComponent(memberId)}`;
}

export function buildQuizShareMessage(memberName: string, memberId: string) {
    const link = buildQuizShareLink(memberId);
    return {
        link,
        subject: `EverAfter personality questions for ${memberName}`,
        body: `Please continue the EverAfter personality questionnaire for ${memberName} here: ${link}`,
    };
}

export function markQuizInviteSent(memberId: string) {
    const existing = readStoredQuizSession(memberId);
    if (!existing) return;

    saveStoredQuizSession({
        ...existing,
        lastSentAt: new Date().toISOString(),
        sentCount: (existing.sentCount || 0) + 1,
        updatedAt: new Date().toISOString(),
    });
}

