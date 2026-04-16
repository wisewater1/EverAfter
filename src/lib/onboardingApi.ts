import { requestBackendJson } from './backend-request';
import { buildAccessTokenHeaders } from './auth-session';

export interface OnboardingReconcilePayload {
  current_step?: number;
  completed_steps?: string[];
  onboarding_complete?: boolean;
  onboarding_skipped?: boolean;
  skip_reason?: string;
  health_profile?: {
    dateOfBirth?: string;
    gender?: string;
    weightKg?: number;
    heightCm?: number;
    healthConditions: string[];
    allergies: string[];
    healthGoals: string[];
    activityLevel?: string;
  };
  media_consent?: {
    photoLibraryAccess: boolean;
    cameraAccess: boolean;
    videoAccess: boolean;
    allowFaceDetection: boolean;
    allowExpressionAnalysis: boolean;
  };
  first_engram?: {
    name: string;
    archetype: string;
  };
  personality_quiz?: {
    answers: Record<string, number>;
    scores?: Record<string, number>;
  };
  family_setup?: {
    selfName?: string;
    relatives: Array<{
      id?: string;
      firstName: string;
      lastName: string;
      relationship: 'parent' | 'sibling' | 'spouse' | 'child';
      birthYear?: string;
    }>;
  };
  primary_member_id?: string;
}

async function buildAuthHeaders(extraHeaders: HeadersInit = {}): Promise<HeadersInit> {
  return buildAccessTokenHeaders(extraHeaders);
}

export async function getOnboardingStatus() {
  const headers = await buildAuthHeaders({
    'Bypass-Tunnel-Reminder': 'true',
  });

  return requestBackendJson<unknown>('/api/v1/onboarding/status', { headers }, 'Failed to load onboarding status');
}

export async function reconcileOnboarding(payload: OnboardingReconcilePayload) {
  const headers = await buildAuthHeaders({
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  });

  return requestBackendJson<unknown>(
    '/api/v1/onboarding/reconcile',
    {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    },
    'Failed to reconcile onboarding',
  );
}

export async function importLocalOnboarding(payload: OnboardingReconcilePayload) {
  const headers = await buildAuthHeaders({
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  });

  return requestBackendJson<unknown>(
    '/api/v1/onboarding/import-local',
    {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    },
    'Failed to import local onboarding state',
  );
}
