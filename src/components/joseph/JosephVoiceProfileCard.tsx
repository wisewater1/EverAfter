import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Mic, Radio, RefreshCw, Sparkles, Volume2, Waves } from 'lucide-react';
import {
  createJosephVoiceProfile,
  getJosephVoiceHealth,
  getJosephVoiceProfile,
  getJosephVoiceTrainingStatus,
  startJosephVoiceTraining,
  uploadJosephVoiceSample,
  type JosephVoiceHealth,
  type JosephVoiceProfile,
  type JosephVoiceSample,
} from '../../lib/joseph/voice';
import { useAudioRecorder } from './useAudioRecorder';
import { useAuth } from '../../contexts/AuthContext';
import { isAuthFailureMessage } from '../../lib/auth-session';
import { getCapability, getRuntimeReadiness, type RuntimeCapability } from '../../lib/runtime-readiness';

interface JosephVoiceProfileCardProps {
  familyMemberId: string;
  familyMemberName: string;
  engramId?: string | null;
  compact?: boolean;
}

const CLIP_TYPE_LABELS: Record<string, string> = {
  consent_phrase: 'Consent phrase',
  calibration: 'Calibration',
  ocean_answer: 'OCEAN answer',
  free_speech: 'Free speech',
};

function normalizeVoiceProfileError(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error || '');
  const compact = message.trim();

  if (isAuthFailureMessage(compact)) {
    return null;
  }

  if (!compact || compact === 'Internal Server Error') {
    return 'Voice profile storage is temporarily unavailable. Try again after the backend reconnects.';
  }

  if (compact.includes('Family member not found')) {
    return 'This family member is not reconciled with backend storage yet. The voice profile card is waiting for backend sync.';
  }

  return compact;
}

function formatVoiceStatus(profile: JosephVoiceProfile | null): string {
  if (!profile) return 'No profile yet';
  if (profile.model_ref) return 'Voice available';
  const status = profile.training_status || profile.status || 'collecting';
  return status.replace(/_/g, ' ');
}

export default function JosephVoiceProfileCard({
  familyMemberId,
  familyMemberName,
  engramId = null,
  compact = false,
}: JosephVoiceProfileCardProps) {
  const { loading: authLoading, session, isDemoMode } = useAuth();
  const [voiceHealth, setVoiceHealth] = useState<JosephVoiceHealth | null>(null);
  const [voiceCapability, setVoiceCapability] = useState<RuntimeCapability | null>(null);
  const [profile, setProfile] = useState<JosephVoiceProfile | null>(null);
  const [samples, setSamples] = useState<JosephVoiceSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingSample, setUploadingSample] = useState(false);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentGranted, setConsentGranted] = useState(false);
  const [consentPhrase, setConsentPhrase] = useState(
    'I consent to EverAfter storing my voice privately for my family and training a personal voice model.',
  );
  const [voiceStyleNotes, setVoiceStyleNotes] = useState('');
  const [clipType, setClipType] = useState('calibration');
  const [promptIndex, setPromptIndex] = useState(0);

  const recorder = useAudioRecorder();

  const prompts = useMemo(() => {
    return voiceHealth?.guided_capture_sets?.[clipType] || [];
  }, [clipType, voiceHealth]);

  const activePrompt = prompts[promptIndex] || '';
  const authToken = session?.access_token ?? null;
  const liveVoiceAvailable = !authLoading && !isDemoMode && Boolean(authToken);
  const voiceBlockedReason = voiceCapability?.blocking
    ? voiceCapability.reason || 'Joseph voice is temporarily unavailable until its required dependencies recover.'
    : null;
  const canUseVoiceCapability = liveVoiceAvailable && !voiceCapability?.blocking;
  const authRequiredMessage = !authLoading && !liveVoiceAvailable
    ? 'Sign in with a live account to load and manage private voice profiles.'
    : null;

  const loadProfile = useCallback(async (showSpinner = true) => {
    if (!authToken || isDemoMode) {
      setVoiceCapability(null);
      setVoiceHealth(null);
      setProfile(null);
      setSamples([]);
      setError(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (showSpinner) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const readiness = await getRuntimeReadiness();
      const capability = getCapability(readiness, 'joseph.voice');
      setVoiceCapability(capability);
      if (capability?.blocking) {
        setVoiceHealth(null);
        setProfile(null);
        setSamples([]);
        setError(null);
        return;
      }

      const [healthResult, bundleResult] = await Promise.allSettled([
        getJosephVoiceHealth({ authToken }),
        getJosephVoiceProfile(familyMemberId, { authToken }),
      ]);

      if (healthResult.status === 'fulfilled') {
        setVoiceHealth(healthResult.value);
      } else {
        setVoiceHealth(null);
      }

      if (bundleResult.status === 'fulfilled') {
        const bundle = bundleResult.value;
        setProfile(bundle.profile);
        setSamples(bundle.samples || []);
        setConsentGranted(bundle.profile?.consent_status === 'opted_in');
        setVoiceStyleNotes(bundle.profile?.voice_style_notes || '');
      } else {
        setProfile(null);
        setSamples([]);
        setError(normalizeVoiceProfileError(bundleResult.reason));
      }
    } catch (loadError) {
      setVoiceCapability(null);
      setError(normalizeVoiceProfileError(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authToken, familyMemberId, isDemoMode]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!liveVoiceAvailable) {
      setVoiceCapability(null);
      setVoiceHealth(null);
      setProfile(null);
      setSamples([]);
      setError(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    void loadProfile();
  }, [authLoading, liveVoiceAvailable, loadProfile]);

  useEffect(() => {
    if (!profile || profile.training_status !== 'training') {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const status = await getJosephVoiceTrainingStatus(familyMemberId, { authToken });
        setProfile(status.profile);
      } catch {
        // Best effort polling; keep existing UI state.
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [authToken, familyMemberId, profile]);

  const handleCreateProfile = useCallback(async () => {
    if (!authToken || isDemoMode) {
      setError(authRequiredMessage);
      return;
    }
    if (voiceBlockedReason) {
      setError(voiceBlockedReason);
      return;
    }

    setSavingProfile(true);
    setError(null);
    try {
      const bundle = await createJosephVoiceProfile({
        familyMemberId,
        consentGranted,
        consentPhrase,
        engramId,
        voiceStyleNotes: voiceStyleNotes.trim() || null,
      }, { authToken });
      setProfile(bundle.profile);
      setSamples(bundle.samples || []);
    } catch (saveError) {
      setError(normalizeVoiceProfileError(saveError));
    } finally {
      setSavingProfile(false);
    }
  }, [authRequiredMessage, authToken, consentGranted, consentPhrase, engramId, familyMemberId, isDemoMode, voiceBlockedReason, voiceStyleNotes]);

  const handleUploadRecording = useCallback(async () => {
    if (!recorder.audioBlob) {
      return;
    }

    if (!authToken || isDemoMode) {
      setError(authRequiredMessage);
      return;
    }
    if (voiceBlockedReason) {
      setError(voiceBlockedReason);
      return;
    }

    setUploadingSample(true);
    setError(null);
    try {
      const filename = `${familyMemberId}-${clipType}-${Date.now()}.webm`;
      const result = await uploadJosephVoiceSample({
        familyMemberId,
        clipType,
        audioFile: recorder.audioBlob,
        filename,
        promptText: activePrompt,
        durationSeconds: recorder.durationSeconds,
        approved: true,
        consentGranted,
        consentPhrase,
        engramId,
        transcribe: Boolean(voiceHealth?.available),
      }, { authToken });
      setProfile(result.profile);
      setSamples((current) => [result.sample, ...current]);
      recorder.clearRecording();
    } catch (uploadError) {
      setError(normalizeVoiceProfileError(uploadError));
    } finally {
      setUploadingSample(false);
    }
  }, [
    activePrompt,
    authRequiredMessage,
    authToken,
    clipType,
    consentGranted,
    consentPhrase,
    engramId,
    familyMemberId,
    isDemoMode,
    recorder,
    voiceBlockedReason,
    voiceHealth,
  ]);

  const handleTrain = useCallback(async () => {
    if (!authToken || isDemoMode) {
      setError(authRequiredMessage);
      return;
    }
    if (voiceBlockedReason) {
      setError(voiceBlockedReason);
      return;
    }

    setTraining(true);
    setError(null);
    try {
      const result = await startJosephVoiceTraining({
        familyMemberId,
        engramId,
        voiceStyleNotes: voiceStyleNotes.trim() || null,
      }, { authToken });
      setProfile(result.profile);
    } catch (trainError) {
      setError(normalizeVoiceProfileError(trainError));
    } finally {
      setTraining(false);
    }
  }, [authRequiredMessage, authToken, engramId, familyMemberId, isDemoMode, voiceBlockedReason, voiceStyleNotes]);

  const readySamples = profile?.sample_count || 0;
  const readySeconds = profile?.approved_seconds || 0;

  return (
    <div className="rounded-2xl border border-cyan-500/10 bg-cyan-500/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-cyan-300" />
            <h4 className="text-sm font-semibold text-white">Voice Profile</h4>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Collect consented voice clips for {familyMemberName}. Voice stays private to this family.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${
            profile?.model_ref
              ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
              : 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200'
          }`}>
            {formatVoiceStatus(profile)}
          </span>
          <button
            onClick={() => void loadProfile(false)}
            disabled={!liveVoiceAvailable}
            className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Refresh voice profile"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading voice profile…
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {voiceBlockedReason && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {voiceBlockedReason}
            </div>
          )}

          {authRequiredMessage && (
            <div className="rounded-xl border border-slate-500/20 bg-slate-500/10 px-3 py-2 text-xs text-slate-300">
              {authRequiredMessage}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </div>
          )}

          <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
            <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Approved Samples</div>
              <div className="mt-2 text-xl font-semibold text-white">{readySamples}</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Approved Seconds</div>
              <div className="mt-2 text-xl font-semibold text-white">{Math.round(readySeconds)}s</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Training</div>
              <div className="mt-2 text-sm font-semibold text-white">{profile?.training_status?.replace(/_/g, ' ') || 'not started'}</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Created AI Voice</div>
              <div className="mt-2 text-sm font-semibold text-white">
                {profile?.model_ref ? 'Available' : profile?.engram_id ? 'Linked' : 'Not linked'}
              </div>
            </div>
          </div>

          {!profile && canUseVoiceCapability && (
            <div className="space-y-3 rounded-2xl border border-white/5 bg-slate-950/30 p-4">
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={consentGranted}
                    onChange={(event) => setConsentGranted(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/15 bg-slate-950 text-cyan-400"
                  />
                  <span>
                    Explicit opt-in required before voice collection or training.
                  </span>
                </label>
                <textarea
                  value={consentPhrase}
                  onChange={(event) => setConsentPhrase(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                />
                <input
                  value={voiceStyleNotes}
                  onChange={(event) => setVoiceStyleNotes(event.target.value)}
                  placeholder="Optional voice style notes for the created AI"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                />
              </div>
              <button
                onClick={() => void handleCreateProfile()}
                disabled={!consentGranted || savingProfile || !canUseVoiceCapability}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Create voice profile
              </button>
            </div>
          )}

          {profile && canUseVoiceCapability && (
            <>
              <div className="space-y-3 rounded-2xl border border-white/5 bg-slate-950/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-slate-200">Guided capture</div>
                    <div className="text-[11px] text-slate-500">
                      Common Voice-style prompts for clean, consented training data.
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                    consent {profile.consent_status.replace(/_/g, ' ')}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Clip type</span>
                    <select
                      value={clipType}
                      onChange={(event) => {
                        setClipType(event.target.value);
                        setPromptIndex(0);
                      }}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                    >
                      {Object.keys(voiceHealth?.guided_capture_sets || {}).map((type) => (
                        <option key={type} value={type}>
                          {CLIP_TYPE_LABELS[type] || type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Prompt</span>
                    <select
                      value={String(promptIndex)}
                      onChange={(event) => setPromptIndex(Number(event.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                    >
                      {prompts.map((prompt, index) => (
                        <option key={`${clipType}-${index}`} value={index}>
                          {prompt}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {activePrompt && (
                  <div className="rounded-xl border border-cyan-500/10 bg-cyan-500/[0.04] px-3 py-2 text-sm text-slate-200">
                    {activePrompt.replace('__NAME__', familyMemberName)}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => void recorder.startRecording()}
                    disabled={!canUseVoiceCapability || recorder.isRecording || recorder.isProcessing || !recorder.isSupported}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Mic className="h-4 w-4" />
                    Record sample
                  </button>
                  <button
                    onClick={() => void recorder.stopRecording()}
                    disabled={!recorder.isRecording}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Radio className="h-4 w-4" />
                    Stop
                  </button>
                <button
                  onClick={() => void handleUploadRecording()}
                    disabled={!canUseVoiceCapability || !recorder.audioBlob || uploadingSample}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploadingSample ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Add to voice pack
                  </button>
                </div>

                {recorder.error && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    {recorder.error}
                  </div>
                )}

                {recorder.previewUrl && (
                  <div className="space-y-2 rounded-xl border border-white/5 bg-slate-950/40 p-3">
                    <audio controls src={recorder.previewUrl} className="w-full" />
                    <div className="text-xs text-slate-400">
                      Preview length: {Math.round(recorder.durationSeconds)} seconds
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-slate-950/30 p-4">
                <div>
                  <div className="text-sm font-medium text-white">Training readiness</div>
                  <div className="text-xs text-slate-500">
                    Need {voiceHealth?.thresholds.min_approved_samples ?? 0}+ approved clips and {voiceHealth?.thresholds.min_approved_seconds ?? 0}+ approved seconds.
                  </div>
                </div>
                <button
                  onClick={() => void handleTrain()}
                  disabled={!canUseVoiceCapability || !profile.training_ready || training || !voiceHealth?.available}
                  className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm font-medium text-violet-100 transition hover:bg-violet-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {training ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                  Train personal voice
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Recent approved clips</div>
                {samples.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/20 px-4 py-6 text-sm text-slate-500">
                    No clips yet. Record calibration, consent, or free-speech samples to start the pack.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {samples.slice(0, compact ? 3 : 5).map((sample) => (
                      <div key={sample.id} className="rounded-xl border border-white/5 bg-slate-950/30 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {CLIP_TYPE_LABELS[sample.clip_type] || sample.clip_type}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {Math.round(sample.duration_seconds)}s • {sample.review_status.replace(/_/g, ' ')}
                            </div>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                            sample.approved ? 'bg-emerald-500/10 text-emerald-200' : 'bg-amber-500/10 text-amber-200'
                          }`}>
                            {sample.approved ? 'Approved' : 'Pending'}
                          </span>
                        </div>
                        {sample.transcript && (
                          <div className="mt-2 text-xs text-slate-300">
                            “{sample.transcript}”
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {profile?.model_ref && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              This family member’s created AI can now use their personal voice when synthesis is requested.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
