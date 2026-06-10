import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Mic, Radio, Sparkles, Type, Waves } from 'lucide-react';
import {
  approveJosephVoiceQuizAnswer,
  getJosephVoiceHealth,
  getJosephVoiceProfile,
  submitJosephVoiceQuizAnswer,
  type JosephVoiceHealth,
  type JosephVoiceProfileBundle,
  type JosephVoiceQuizSuggestion,
} from '../../lib/joseph/voice';
import { useAudioRecorder } from './useAudioRecorder';
import { useAuth } from '../../contexts/AuthContext';
import { isAuthFailureMessage } from '../../lib/auth-session';
import { getCapability, getRuntimeReadiness, type RuntimeCapability } from '../../lib/runtime-readiness';

interface JosephVoiceAnswerPanelProps {
  familyMemberId: string;
  questionId: string;
  questionText: string;
  onApprovedAnswer: (value: number) => void;
}

const LIKERT_OPTIONS = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
];

export default function JosephVoiceAnswerPanel({
  familyMemberId,
  questionId,
  questionText,
  onApprovedAnswer,
}: JosephVoiceAnswerPanelProps) {
  const { loading: authLoading, session, isDemoMode } = useAuth();
  const [open, setOpen] = useState(false);
  const [voiceHealth, setVoiceHealth] = useState<JosephVoiceHealth | null>(null);
  const [voiceCapability, setVoiceCapability] = useState<RuntimeCapability | null>(null);
  const [voiceBundle, setVoiceBundle] = useState<JosephVoiceProfileBundle | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<JosephVoiceQuizSuggestion | null>(null);
  const [transcript, setTranscript] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<number>(3);
  const recorder = useAudioRecorder();
  const authToken = session?.access_token ?? null;
  const liveVoiceAvailable = !authLoading && !isDemoMode && Boolean(authToken);
  const voiceBlockedReason = voiceCapability?.blocking
    ? voiceCapability.reason || 'Joseph voice is temporarily unavailable until its required dependencies recover.'
    : null;

  useEffect(() => {
    if (!open || loadingHealth || authLoading) {
      return;
    }

    if (!liveVoiceAvailable) {
      setVoiceCapability(null);
      setVoiceHealth(null);
      setVoiceBundle(null);
      setLoadingHealth(false);
      setError(null);
      return;
    }

    setLoadingHealth(true);
    void getRuntimeReadiness()
      .then(async (readiness) => {
        const capability = getCapability(readiness, 'joseph.voice');
        setVoiceCapability(capability);
        if (capability?.blocking) {
          setVoiceHealth(null);
          setVoiceBundle(null);
          setError(null);
          return;
        }

        const [health, bundle] = await Promise.all([
          getJosephVoiceHealth({ authToken }),
          getJosephVoiceProfile(familyMemberId, { authToken }),
        ]);
        setVoiceHealth(health);
        setVoiceBundle(bundle);
      })
      .catch((healthError) => {
        const message = healthError instanceof Error ? healthError.message : 'Failed to load voice capability.';
        setError(isAuthFailureMessage(message) ? null : message);
      })
      .finally(() => setLoadingHealth(false));
  }, [authLoading, authToken, familyMemberId, liveVoiceAvailable, loadingHealth, open]);

  useEffect(() => {
    setSuggestion(null);
    setTranscript('');
    setSelectedAnswer(3);
    setError(null);
  }, [questionId]);

  const profile = voiceBundle?.profile || null;
  const hasVoiceConsent = profile?.consent_status === 'opted_in';
  const canUseVoiceFlow = Boolean(liveVoiceAvailable && !voiceCapability?.blocking && voiceHealth?.available && hasVoiceConsent);

  const handleAnalyze = async () => {
    if (!recorder.audioBlob || !canUseVoiceFlow) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await submitJosephVoiceQuizAnswer({
        familyMemberId,
        questionId,
        questionText,
        audioFile: recorder.audioBlob,
        filename: `${familyMemberId}-${questionId}-${Date.now()}.webm`,
        durationSeconds: recorder.durationSeconds,
      }, { authToken });
      setSuggestion(result);
      setTranscript(result.sample.transcript || '');
      setSelectedAnswer(result.suggested_answer || 3);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to analyze voice answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!suggestion) {
      return;
    }

    setApproving(true);
    setError(null);
    try {
      const result = await approveJosephVoiceQuizAnswer({
        sampleId: suggestion.sample.id,
        transcript,
        selectedAnswer,
      }, { authToken });
      onApprovedAnswer(result.approved_answer);
      setOpen(false);
      setSuggestion(null);
      setTranscript('');
      recorder.clearRecording();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : 'Failed to approve voice answer.');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-cyan-500/10 bg-cyan-500/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-cyan-300" />
            <span className="text-sm font-medium text-white">Answer by voice</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Record a spoken answer, review the transcript, then approve the Likert score before it counts.
          </p>
        </div>
        <button
          onClick={() => setOpen((current) => !current)}
          className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/15"
        >
          {open ? 'Hide voice flow' : 'Open voice flow'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          {loadingHealth && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading voice capability…
            </div>
          )}

          {voiceBlockedReason && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {voiceBlockedReason}
            </div>
          )}

          {!authLoading && !liveVoiceAvailable && (
            <div className="rounded-xl border border-slate-500/20 bg-slate-500/10 px-3 py-2 text-xs text-slate-300">
              Sign in with a live account to use private Joseph voice answers.
            </div>
          )}

          {!loadingHealth && !voiceBlockedReason && voiceHealth?.available && !profile && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
              No private voice profile exists for this family member yet. Create one in the member detail panel before using voice answers.
            </div>
          )}

          {!loadingHealth && profile && !hasVoiceConsent && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
              Voice answers require explicit consent on this family member’s voice profile before the transcript can be used for OCEAN scoring.
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void recorder.startRecording()}
              disabled={!canUseVoiceFlow || recorder.isRecording || recorder.isProcessing}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mic className="h-4 w-4" />
              Record answer
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
              onClick={() => void handleAnalyze()}
              disabled={!recorder.audioBlob || submitting || !canUseVoiceFlow}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Analyze transcript
            </button>
          </div>

          {recorder.previewUrl && (
            <div className="rounded-xl border border-white/5 bg-slate-950/30 p-3">
              <audio controls src={recorder.previewUrl} className="w-full" />
            </div>
          )}

          {suggestion && (
            <div className="space-y-3 rounded-2xl border border-white/5 bg-slate-950/35 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-cyan-200">
                  review required
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-300">
                  confidence {(suggestion.answer_confidence * 100).toFixed(0)}%
                </span>
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Transcript</span>
                <textarea
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                />
              </label>

              <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-slate-300">
                <span className="font-medium text-slate-200">Why this score:</span> {suggestion.rationale}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <Type className="h-3.5 w-3.5" />
                  Approved OCEAN score
                </div>
                <div className="grid gap-2 md:grid-cols-5">
                  {LIKERT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedAnswer(option.value)}
                      className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                        selectedAnswer === option.value
                          ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
                          : 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => void handleApprove()}
                disabled={approving || !transcript.trim()}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve and use this answer
              </button>
            </div>
          )}

          {!canUseVoiceFlow && !loadingHealth && (
            <div className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-slate-400">
              <AlertCircle className="mt-0.5 h-4 w-4 text-slate-500" />
              This voice flow only activates when Joseph voice is fully healthy and the selected family member has an explicitly consented voice profile. It stays disabled instead of falling back to mock voice analysis.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
