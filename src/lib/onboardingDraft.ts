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

function healthProfileDraftKey(userId: string) {
  return `everafter:onboarding:health-profile:${userId}`;
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
