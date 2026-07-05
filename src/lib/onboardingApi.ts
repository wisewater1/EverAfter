import { requestBackendJson } from './backend-request';
import { buildAccessTokenHeaders, getAuthSession } from './auth-session';
import { isDemoAuthEnabled } from './demo-auth';
import { supabase } from './supabase';

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
  health_connection_preferences?: string[];
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

// Columns on onboarding_status that mirror entries in completed_steps.
// See supabase/migrations/20260102110000_create_onboarding_system.sql.
const STEP_BOOLEAN_COLUMNS: Record<string, string> = {
  welcome: 'welcome_completed',
  meet_raphael: 'meet_raphael_completed',
  health_profile: 'health_profile_completed',
  health_connections: 'health_connections_completed',
  media_permissions: 'media_permissions_completed',
  first_engram: 'first_engram_completed',
};

// onboarding_status has no metadata column, so provider picks travel inside
// the completed_steps jsonb array as a single object entry keyed by this name.
// Reads through this module strip the entry back out so callers always see a
// plain string[] of step names.
const HEALTH_CONNECTION_PREFERENCES_KEY = 'health_connection_preferences';

const PROVIDER_PICKS_DRAFT_PREFIX = 'everafter:onboarding:provider-picks:';

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function healthConnectionPreferencesDraftKey(userId: string): string {
  return `${PROVIDER_PICKS_DRAFT_PREFIX}${userId}`;
}

/**
 * Local draft of the health providers a user picked during onboarding.
 * The St. Raphael health hub reads the same key to pre-select providers
 * when the user arrives to finish the real OAuth connections.
 */
export function loadHealthConnectionPreferencesDraft(userId: string): string[] {
  if (!userId || !canUseLocalStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(healthConnectionPreferencesDraftKey(userId));
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch (error) {
    console.warn('Failed to load health connection preferences draft:', error);
    return [];
  }
}

export function saveHealthConnectionPreferencesDraft(userId: string, providers: string[]): void {
  if (!userId || !canUseLocalStorage()) {
    return;
  }

  try {
    const key = healthConnectionPreferencesDraftKey(userId);
    const normalized = Array.from(new Set(providers.filter((entry) => typeof entry === 'string' && entry)));

    if (normalized.length === 0) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(normalized));
  } catch (error) {
    console.warn('Failed to save health connection preferences draft:', error);
  }
}

interface CompletedStepsColumn {
  steps: string[];
  healthConnectionPreferences: string[];
}

function splitCompletedStepsColumn(raw: unknown): CompletedStepsColumn {
  const steps: string[] = [];
  let healthConnectionPreferences: string[] = [];

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (typeof entry === 'string') {
        steps.push(entry);
        continue;
      }

      if (entry && typeof entry === 'object') {
        const candidate = (entry as Record<string, unknown>)[HEALTH_CONNECTION_PREFERENCES_KEY];
        if (Array.isArray(candidate)) {
          healthConnectionPreferences = candidate.filter(
            (item): item is string => typeof item === 'string',
          );
        }
      }
    }
  }

  return {
    steps: Array.from(new Set(steps)),
    healthConnectionPreferences,
  };
}

function buildCompletedStepsColumn(steps: string[], healthConnectionPreferences: string[]): unknown[] {
  const column: unknown[] = Array.from(new Set(steps.filter(Boolean)));

  if (healthConnectionPreferences.length > 0) {
    column.push({ [HEALTH_CONNECTION_PREFERENCES_KEY]: healthConnectionPreferences });
  }

  return column;
}

function buildDefaultOnboardingStatus() {
  return {
    current_step: 1,
    total_steps: 7,
    completed_steps: [] as string[],
    welcome_completed: false,
    meet_raphael_completed: false,
    health_profile_completed: false,
    health_connections_completed: false,
    media_permissions_completed: false,
    first_engram_completed: false,
    onboarding_complete: false,
    skipped_steps: [] as string[],
    skip_reason: null as string | null,
    started_at: null as string | null,
    completed_at: null as string | null,
    last_step_at: null as string | null,
  };
}

async function requireSupabaseFallbackContext(): Promise<{ userId: string }> {
  if (isDemoAuthEnabled()) {
    throw new Error('Demo mode relies on the mocked onboarding backend.');
  }

  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const session = await getAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error('No authenticated user session is available.');
  }

  return { userId };
}

function rethrowBackendError(backendError: unknown, fallbackLabel: string): never {
  if (backendError instanceof Error) {
    throw backendError;
  }
  throw new Error(fallbackLabel);
}

async function getOnboardingStatusFromSupabase(backendError: unknown) {
  let userId: string;
  try {
    ({ userId } = await requireSupabaseFallbackContext());
  } catch (fallbackError) {
    console.warn('Supabase onboarding status fallback is unavailable:', fallbackError);
    rethrowBackendError(backendError, 'Failed to load onboarding status');
  }

  const [profileResult, statusResult, demographicsResult, mediaConsentResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('has_completed_onboarding, onboarding_skipped')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('onboarding_status')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('health_demographics')
      .select(
        'date_of_birth, gender, weight_kg, height_cm, health_conditions, allergies, health_goals, activity_level',
      )
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('media_consent')
      .select(
        'photo_library_access, camera_access, video_access, allow_face_detection, allow_expression_analysis',
      )
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (profileResult.error) {
    console.warn('Supabase fallback could not read profile flags:', profileResult.error.message);
  }
  if (statusResult.error) {
    console.warn('Supabase fallback could not read onboarding status:', statusResult.error.message);
  }
  if (demographicsResult.error) {
    console.warn('Supabase fallback could not read health demographics:', demographicsResult.error.message);
  }
  if (mediaConsentResult.error) {
    console.warn('Supabase fallback could not read media consent:', mediaConsentResult.error.message);
  }

  const statusRow = statusResult.error ? null : statusResult.data;
  const { steps, healthConnectionPreferences } = splitCompletedStepsColumn(statusRow?.completed_steps);

  return {
    source: 'supabase-fallback',
    profile: profileResult.error ? null : profileResult.data,
    onboarding_status: statusRow
      ? { ...statusRow, completed_steps: steps }
      : buildDefaultOnboardingStatus(),
    health_profile: demographicsResult.error ? null : demographicsResult.data,
    media_consent: mediaConsentResult.error ? null : mediaConsentResult.data,
    health_connection_preferences: healthConnectionPreferences,
    first_engram: null,
    personality_quiz: null,
    family_setup: null,
  };
}

async function reconcileOnboardingViaSupabase(payload: OnboardingReconcilePayload, backendError: unknown) {
  let userId: string;
  try {
    ({ userId } = await requireSupabaseFallbackContext());
  } catch (fallbackError) {
    console.warn('Supabase onboarding reconcile fallback is unavailable:', fallbackError);
    rethrowBackendError(backendError, 'Failed to reconcile onboarding');
  }

  const nowIso = new Date().toISOString();

  if (payload.health_profile) {
    const healthProfile = payload.health_profile;
    const demographicsRow: Record<string, unknown> = {
      user_id: userId,
      health_conditions: healthProfile.healthConditions ?? [],
      allergies: healthProfile.allergies ?? [],
      health_goals: healthProfile.healthGoals ?? [],
    };

    if (healthProfile.dateOfBirth) {
      demographicsRow.date_of_birth = healthProfile.dateOfBirth;
    }
    if (healthProfile.gender) {
      demographicsRow.gender = healthProfile.gender;
    }
    if (typeof healthProfile.weightKg === 'number' && Number.isFinite(healthProfile.weightKg)) {
      demographicsRow.weight_kg = healthProfile.weightKg;
    }
    if (typeof healthProfile.heightCm === 'number' && Number.isFinite(healthProfile.heightCm)) {
      demographicsRow.height_cm = healthProfile.heightCm;
    }
    if (healthProfile.activityLevel) {
      demographicsRow.activity_level = healthProfile.activityLevel;
    }

    const { error: demographicsError } = await supabase
      .from('health_demographics')
      .upsert(demographicsRow, { onConflict: 'user_id' });

    if (demographicsError) {
      throw new Error(`Could not save health profile: ${demographicsError.message}`);
    }
  }

  if (payload.media_consent) {
    const mediaConsent = payload.media_consent;
    const { error: mediaConsentError } = await supabase.from('media_consent').upsert(
      {
        user_id: userId,
        photo_library_access: mediaConsent.photoLibraryAccess,
        camera_access: mediaConsent.cameraAccess,
        video_access: mediaConsent.videoAccess,
        allow_face_detection: mediaConsent.allowFaceDetection,
        allow_expression_analysis: mediaConsent.allowExpressionAnalysis,
        consent_given_at: nowIso,
      },
      { onConflict: 'user_id' },
    );

    if (mediaConsentError) {
      throw new Error(`Could not save media consent: ${mediaConsentError.message}`);
    }
  }

  const { data: existingStatusRow, error: statusReadError } = await supabase
    .from('onboarding_status')
    .select('completed_steps')
    .eq('user_id', userId)
    .maybeSingle();

  if (statusReadError) {
    console.warn(
      'Supabase fallback could not read existing onboarding status before merging:',
      statusReadError.message,
    );
  }

  const existing = splitCompletedStepsColumn(existingStatusRow?.completed_steps);
  const mergedSteps = Array.from(new Set([...existing.steps, ...(payload.completed_steps ?? [])]));
  const mergedPreferences = payload.health_connection_preferences ?? existing.healthConnectionPreferences;

  const statusRow: Record<string, unknown> = {
    user_id: userId,
    completed_steps: buildCompletedStepsColumn(mergedSteps, mergedPreferences),
    last_step_at: nowIso,
  };

  if (typeof payload.current_step === 'number' && Number.isFinite(payload.current_step)) {
    statusRow.current_step = Math.min(Math.max(Math.round(payload.current_step), 1), 10);
  }

  for (const step of mergedSteps) {
    const booleanColumn = STEP_BOOLEAN_COLUMNS[step];
    if (booleanColumn) {
      statusRow[booleanColumn] = true;
    }
  }

  if (typeof payload.skip_reason === 'string' && payload.skip_reason.trim()) {
    statusRow.skip_reason = payload.skip_reason.trim();
  }

  const { error: statusUpsertError } = await supabase
    .from('onboarding_status')
    .upsert(statusRow, { onConflict: 'user_id' });

  if (statusUpsertError) {
    throw new Error(`Could not save onboarding progress: ${statusUpsertError.message}`);
  }

  if (payload.onboarding_complete === true) {
    // Run completion as a separate UPDATE so the database trigger
    // (trigger_sync_onboarding_completion, AFTER UPDATE) always fires and
    // flips profiles.has_completed_onboarding, even when the upsert above
    // inserted a brand new row.
    const { error: completionError } = await supabase
      .from('onboarding_status')
      .update({ onboarding_complete: true, completed_at: nowIso })
      .eq('user_id', userId);

    if (completionError) {
      throw new Error(`Could not mark onboarding complete: ${completionError.message}`);
    }
  }

  const profileUpdates: Record<string, unknown> = {};
  if (payload.onboarding_complete === true) {
    // Belt and braces alongside the database trigger.
    profileUpdates.has_completed_onboarding = true;
  }
  if (payload.onboarding_skipped === true) {
    profileUpdates.onboarding_skipped = true;
    profileUpdates.onboarding_skipped_at = nowIso;
  } else if (payload.onboarding_skipped === false) {
    profileUpdates.onboarding_skipped = false;
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId);

    if (profileError) {
      if (payload.onboarding_skipped === true) {
        // The skip flag only lives on profiles, so this failure is terminal.
        throw new Error(`Could not record onboarding skip: ${profileError.message}`);
      }
      console.warn(
        'Supabase fallback could not update profile flags (the database trigger remains authoritative):',
        profileError.message,
      );
    }
  }

  return {
    ok: true,
    source: 'supabase-fallback',
    onboarding_complete: payload.onboarding_complete === true,
  };
}

async function buildAuthHeaders(extraHeaders: HeadersInit = {}): Promise<HeadersInit> {
  return buildAccessTokenHeaders(extraHeaders);
}

export async function getOnboardingStatus() {
  const headers = await buildAuthHeaders({
    'Bypass-Tunnel-Reminder': 'true',
  });

  try {
    return await requestBackendJson<any>('/api/v1/onboarding/status', { headers }, 'Failed to load onboarding status');
  } catch (backendError) {
    console.warn('Onboarding status backend is unreachable, reading directly from Supabase:', backendError);
    return getOnboardingStatusFromSupabase(backendError);
  }
}

export async function reconcileOnboarding(payload: OnboardingReconcilePayload) {
  const headers = await buildAuthHeaders({
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  });

  try {
    return await requestBackendJson<any>(
      '/api/v1/onboarding/reconcile',
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      },
      'Failed to reconcile onboarding',
    );
  } catch (backendError) {
    console.warn('Onboarding reconcile backend is unreachable, writing directly to Supabase:', backendError);
    return reconcileOnboardingViaSupabase(payload, backendError);
  }
}

export async function importLocalOnboarding(payload: OnboardingReconcilePayload) {
  const headers = await buildAuthHeaders({
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  });

  return requestBackendJson<any>(
    '/api/v1/onboarding/import-local',
    {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    },
    'Failed to import local onboarding state',
  );
}
