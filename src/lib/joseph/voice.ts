import { requestBackendJson } from '../backend-request';
import { apiClient } from '../api-client';

export interface JosephVoiceSample {
  id: string;
  voice_profile_id: string;
  family_member_id: string;
  clip_type: string;
  prompt_text?: string;
  storage_path: string;
  transcript?: string;
  transcript_confidence: number;
  duration_seconds: number;
  quality: Record<string, unknown>;
  approved: boolean;
  review_status: string;
  derived_quiz_question_id?: string | null;
  consent_snapshot?: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface JosephVoiceProfile {
  id: string;
  family_member_id: string;
  engram_id?: string | null;
  status: string;
  consent_status: string;
  training_status: string;
  sample_count: number;
  approved_seconds: number;
  model_ref?: string | null;
  voice_style_notes?: string | null;
  guided_sample_progress: Record<string, number>;
  consent_snapshot?: Record<string, unknown>;
  last_trained_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  training_ready: boolean;
}

export interface JosephVoiceHealth {
  available: boolean;
  configured: boolean;
  status: string;
  message?: string;
  guided_capture_sets: Record<string, string[]>;
  thresholds: {
    min_approved_samples: number;
    min_approved_seconds: number;
  };
}

export interface JosephVoiceProfileBundle {
  profile: JosephVoiceProfile | null;
  samples: JosephVoiceSample[];
  guided_capture_sets: Record<string, string[]>;
  sidecar: Omit<JosephVoiceHealth, 'guided_capture_sets' | 'thresholds'>;
}

export interface JosephVoiceQuizSuggestion {
  profile: JosephVoiceProfile;
  sample: JosephVoiceSample;
  question_id: string;
  question_text: string;
  suggested_answer: number | null;
  answer_confidence: number;
  rationale: string;
  requires_review: boolean;
}

function appendBoolean(fd: FormData, key: string, value: boolean) {
  fd.append(key, value ? 'true' : 'false');
}

function createTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
  if (typeof AbortSignal === 'undefined' || typeof AbortSignal.timeout !== 'function') {
    return undefined;
  }
  return AbortSignal.timeout(timeoutMs);
}

async function buildVoiceRequestInit(init: RequestInit = {}, timeoutMs: number = 20000): Promise<RequestInit> {
  const authHeaders = await apiClient.getAuthHeaders(init.headers || {});
  return {
    ...init,
    headers: authHeaders,
    signal: init.signal ?? createTimeoutSignal(timeoutMs),
  };
}

export async function getJosephVoiceHealth(): Promise<JosephVoiceHealth> {
  return requestBackendJson<JosephVoiceHealth>(
    '/api/v1/joseph/voice/health',
    await buildVoiceRequestInit(),
    'Failed to load Joseph voice health.',
  );
}

export async function getJosephVoiceProfile(familyMemberId: string): Promise<JosephVoiceProfileBundle> {
  return requestBackendJson<JosephVoiceProfileBundle>(
    `/api/v1/joseph/voice/profiles/${familyMemberId}`,
    await buildVoiceRequestInit(),
    'Failed to load Joseph voice profile.',
  );
}

export async function createJosephVoiceProfile(input: {
  familyMemberId: string;
  consentGranted: boolean;
  consentPhrase: string;
  engramId?: string | null;
  voiceStyleNotes?: string | null;
}): Promise<JosephVoiceProfileBundle> {
  const fd = new FormData();
  fd.append('family_member_id', input.familyMemberId);
  appendBoolean(fd, 'consent_granted', input.consentGranted);
  fd.append('consent_phrase', input.consentPhrase);
  if (input.engramId) fd.append('engram_id', input.engramId);
  if (input.voiceStyleNotes) fd.append('voice_style_notes', input.voiceStyleNotes);
  return requestBackendJson<JosephVoiceProfileBundle>(
    '/api/v1/joseph/voice/profiles',
    await buildVoiceRequestInit({ method: 'POST', body: fd }),
    'Failed to create Joseph voice profile.',
  );
}

export async function uploadJosephVoiceSample(input: {
  familyMemberId: string;
  clipType: string;
  audioFile: Blob | File;
  filename: string;
  promptText?: string;
  durationSeconds?: number;
  approved?: boolean;
  consentGranted?: boolean;
  consentPhrase?: string;
  engramId?: string | null;
  transcribe?: boolean;
}): Promise<{ profile: JosephVoiceProfile; sample: JosephVoiceSample }> {
  const fd = new FormData();
  fd.append('family_member_id', input.familyMemberId);
  fd.append('clip_type', input.clipType);
  fd.append('prompt_text', input.promptText || '');
  fd.append('duration_seconds', String(input.durationSeconds || 0));
  appendBoolean(fd, 'approved', Boolean(input.approved));
  appendBoolean(fd, 'consent_granted', Boolean(input.consentGranted));
  fd.append('consent_phrase', input.consentPhrase || '');
  appendBoolean(fd, 'transcribe', Boolean(input.transcribe));
  if (input.engramId) fd.append('engram_id', input.engramId);
  fd.append('audio_file', input.audioFile, input.filename);
  return requestBackendJson(
    '/api/v1/joseph/voice/samples',
    await buildVoiceRequestInit({ method: 'POST', body: fd }),
    'Failed to upload Joseph voice sample.',
  );
}

export async function submitJosephVoiceQuizAnswer(input: {
  familyMemberId: string;
  questionId: string;
  questionText: string;
  audioFile: Blob | File;
  filename: string;
  durationSeconds?: number;
}): Promise<JosephVoiceQuizSuggestion> {
  const fd = new FormData();
  fd.append('family_member_id', input.familyMemberId);
  fd.append('question_id', input.questionId);
  fd.append('question_text', input.questionText);
  fd.append('duration_seconds', String(input.durationSeconds || 0));
  fd.append('audio_file', input.audioFile, input.filename);
  return requestBackendJson(
    '/api/v1/joseph/voice/quiz-answer',
    await buildVoiceRequestInit({ method: 'POST', body: fd }),
    'Failed to submit Joseph voice quiz answer.',
  );
}

export async function approveJosephVoiceQuizAnswer(input: {
  sampleId: string;
  transcript: string;
  selectedAnswer: number;
}): Promise<{ profile: JosephVoiceProfile; sample: JosephVoiceSample; approved_answer: number }> {
  const fd = new FormData();
  fd.append('transcript', input.transcript);
  fd.append('selected_answer', String(input.selectedAnswer));
  return requestBackendJson(
    `/api/v1/joseph/voice/quiz-answer/${input.sampleId}/approve`,
    await buildVoiceRequestInit({ method: 'POST', body: fd }),
    'Failed to approve Joseph voice answer.',
  );
}

export async function startJosephVoiceTraining(input: {
  familyMemberId: string;
  engramId?: string | null;
  voiceStyleNotes?: string | null;
}) {
  const fd = new FormData();
  fd.append('family_member_id', input.familyMemberId);
  if (input.engramId) fd.append('engram_id', input.engramId);
  if (input.voiceStyleNotes) fd.append('voice_style_notes', input.voiceStyleNotes);
  return requestBackendJson(
    '/api/v1/joseph/voice/train',
    await buildVoiceRequestInit({ method: 'POST', body: fd }),
    'Failed to start Joseph voice training.',
  );
}

export async function getJosephVoiceTrainingStatus(familyMemberId: string) {
  return requestBackendJson(
    `/api/v1/joseph/voice/train/${familyMemberId}`,
    await buildVoiceRequestInit(),
    'Failed to load Joseph voice training status.',
  );
}

export async function synthesizeJosephVoice(input: {
  familyMemberId: string;
  engramId: string;
  textContent: string;
}) {
  const fd = new FormData();
  fd.append('family_member_id', input.familyMemberId);
  fd.append('engram_id', input.engramId);
  fd.append('text_content', input.textContent);
  return requestBackendJson(
    '/api/v1/joseph/voice/synthesize',
    await buildVoiceRequestInit({ method: 'POST', body: fd }),
    'Failed to synthesize Joseph voice.',
  );
}
