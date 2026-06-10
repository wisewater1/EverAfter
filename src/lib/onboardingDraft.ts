export interface HealthProfileDraft {
  dateOfBirth?: string;
  gender?: string;
  weightKg?: number;
  heightCm?: number;
  healthConditions: string[];
  allergies: string[];
  healthGoals: string[];
  activityLevel?: string;
}

export interface StarterRelativeDraft {
  id: string;
  firstName: string;
  lastName: string;
  relationship: 'parent' | 'sibling' | 'spouse' | 'child';
  birthYear?: string;
}

export interface StarterEngramDraft {
  firstEngram?: {
    name: string;
    archetype: string;
  };
  personalityQuiz?: {
    answers: Record<string, number>;
    scores?: Record<string, number>;
  };
  familySetup?: {
    selfName?: string;
    relatives: StarterRelativeDraft[];
  };
  primaryMemberId?: string;
  updatedAt?: string;
}

function healthProfileDraftKey(userId: string) {
  return `everafter:onboarding:health-profile:${userId}`;
}

function starterEngramDraftKey(userId: string) {
  return `everafter:onboarding:starter-engram:${userId}`;
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadHealthProfileDraft(userId: string): HealthProfileDraft | null {
  if (!userId || !canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(healthProfileDraftKey(userId));
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as HealthProfileDraft;
  } catch (error) {
    console.warn('Failed to load health profile draft:', error);
    return null;
  }
}

export function saveHealthProfileDraft(userId: string, draft: HealthProfileDraft) {
  if (!userId || !canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(healthProfileDraftKey(userId), JSON.stringify(draft));
    return true;
  } catch (error) {
    console.warn('Failed to save health profile draft:', error);
    return false;
  }
}

export function clearHealthProfileDraft(userId: string) {
  if (!userId || !canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(healthProfileDraftKey(userId));
  } catch (error) {
    console.warn('Failed to clear health profile draft:', error);
  }
}

export function loadStarterEngramDraft(userId: string): StarterEngramDraft | null {
  if (!userId || !canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(starterEngramDraftKey(userId));
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as StarterEngramDraft;
  } catch (error) {
    console.warn('Failed to load starter engram draft:', error);
    return null;
  }
}

export function saveStarterEngramDraft(userId: string, draft: StarterEngramDraft) {
  if (!userId || !canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(
      starterEngramDraftKey(userId),
      JSON.stringify({
        ...draft,
        updatedAt: new Date().toISOString(),
      })
    );
    return true;
  } catch (error) {
    console.warn('Failed to save starter engram draft:', error);
    return false;
  }
}

export function clearStarterEngramDraft(userId: string) {
  if (!userId || !canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(starterEngramDraftKey(userId));
  } catch (error) {
    console.warn('Failed to clear starter engram draft:', error);
  }
}
