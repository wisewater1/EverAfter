import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Mic, Radio, Sparkles, Type, Waves } from 'lucide-react';
import { useAudioRecorder } from './useAudioRecorder';
import { useAuth } from '../../contexts/AuthContext';
import { deriveLikert } from '../../lib/voice/likert';
import { isSpeechRecognitionSupported, startTranscription, type TranscriberHandle } from '../../lib/voice/speechRecognition';
import { persistApprovedVoiceAnswer } from '../../lib/voice/voiceAnswers';

interface JosephVoiceAnswerPanelProps {
  familyMemberId: string;
  questionId: string;
  questionText: string;
  onApprovedAnswer: (value: number) => void;
  /** Saint context for copy; defaults to a neutral phrasing shared across Saints. */
  saintName?: string;
}

const LIKERT_OPTIONS = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
];

type Phase = 'idle' | 'recording' | 'review';

export default function JosephVoiceAnswerPanel({
  familyMemberId,
  questionId,
  questionText,
  onApprovedAnswer,
  saintName = 'your Saints',
}: JosephVoiceAnswerPanelProps) {
  const { loading: authLoading, session, isDemoMode } = useAuth();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<number>(3);
  const [rationale, setRationale] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const recorder = useAudioRecorder();
  const transcriberRef = useRef<TranscriberHandle | null>(null);
  const sttSupported = isSpeechRecognitionSupported();

  // A live account (Supabase session) OR a demo session both count as
  // signed in. The gate is only for genuinely unauthenticated visitors.
  const isAuthenticated = !authLoading && (Boolean(session?.access_token) || isDemoMode);
  const canUseVoiceFlow = isAuthenticated && recorder.isSupported;

  // Reset when the question changes.
  useEffect(() => {
    transcriberRef.current?.abort();
    transcriberRef.current = null;
    setPhase('idle');
    setTranscript('');
    setInterimText('');
    setSelectedAnswer(3);
    setRationale('');
    setConfidence(0);
    setError(null);
    setSaved(false);
    recorder.clearRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  useEffect(() => {
    return () => {
      transcriberRef.current?.abort();
    };
  }, []);

  const handleRecord = async () => {
    if (!canUseVoiceFlow) return;
    setError(null);
    setTranscript('');
    setInterimText('');
    setSaved(false);
    // Start live transcription alongside audio capture. If the browser has
    // no Web Speech API, capture still runs and the person types afterward.
    if (sttSupported) {
      transcriberRef.current = startTranscription({
        onInterim: (text) => setInterimText(text),
        onFinal: (result) => {
          setTranscript((prev) => (prev ? `${prev} ${result.transcript}`.trim() : result.transcript));
          setConfidence(result.confidence);
          setInterimText('');
        },
        onError: () => setInterimText(''),
      });
    }
    await recorder.startRecording();
    if (!recorder.error) setPhase('recording');
  };

  const handleStop = async () => {
    transcriberRef.current?.stop();
    transcriberRef.current = null;
    await recorder.stopRecording();
    setInterimText('');
  };

  // "Analyze transcript": finalize the reviewed text into a Likert suggestion
  // and reveal the review panel. Never submits on its own.
  const handleAnalyze = () => {
    const text = transcript.trim();
    const suggestion = deriveLikert(text);
    setSelectedAnswer(suggestion.value);
    setRationale(text ? suggestion.rationale : 'Type what you said above, then a suggested score will appear. You can adjust it before approving.');
    if (text) setConfidence((c) => Math.max(c, suggestion.confidence));
    setPhase('review');
  };

  const handleApprove = async () => {
    if (!transcript.trim()) return;
    setApproving(true);
    setError(null);
    try {
      // Persist the durable transcript record; the Likert value flows into
      // the personality quiz (and onward to the Family Tree and Trinity)
      // through onApprovedAnswer regardless of archive success.
      const persisted = await persistApprovedVoiceAnswer({
        familyMemberId,
        questionId,
        questionText,
        transcript: transcript.trim(),
        transcriptConfidence: confidence || 0.7,
        likertValue: selectedAnswer,
        durationSeconds: recorder.durationSeconds,
      });
      onApprovedAnswer(selectedAnswer);
      setSaved(persisted);
      setPhase('idle');
      setTranscript('');
      recorder.clearRecording();
      setOpen(false);
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : 'Could not save this answer. Please try again.');
    } finally {
      setApproving(false);
    }
  };

  const levelPct = Math.round(recorder.inputLevel * 100);

  return (
    <div className="mt-4 rounded-2xl border border-cyan-500/10 bg-cyan-500/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-cyan-300" />
            <span className="text-sm font-medium text-white">Answer by voice</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Record a spoken answer, review the transcript, then approve the score before it counts.
          </p>
        </div>
        <button
          onClick={() => setOpen((current) => !current)}
          className="min-h-11 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          aria-expanded={open}
        >
          {open ? 'Hide voice flow' : 'Open voice flow'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          {!authLoading && !isAuthenticated && (
            <div className="rounded-xl border border-slate-500/20 bg-slate-500/10 px-3 py-2 text-xs text-slate-300">
              Sign in to use private voice answers for {saintName}. Voice recordings are tied to your account.
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </div>
          )}

          {recorder.error && !error && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {recorder.error}
            </div>
          )}

          {/* Live recording indicator + level meter */}
          {phase === 'recording' && (
            <div className="rounded-xl border border-rose-400/20 bg-rose-500/[0.06] p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-rose-200">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                </span>
                Recording... {recorder.durationSeconds}s
              </div>
              <div className="mt-2 flex items-end gap-0.5" aria-hidden="true">
                {Array.from({ length: 28 }).map((_, i) => {
                  const bar = Math.max(6, Math.min(100, levelPct * (0.5 + Math.abs(Math.sin((i + 1) * 0.7)))));
                  return (
                    <span
                      key={i}
                      className="w-1 rounded-full bg-cyan-300/70 transition-all duration-75"
                      style={{ height: `${Math.max(4, (bar / 100) * 32)}px` }}
                    />
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-slate-400" role="status">
                {recorder.hasSignal ? 'Microphone is picking up your voice.' : 'Speak now. Waiting to detect your voice...'}
              </p>
              {interimText && (
                <p className="mt-2 text-xs italic text-slate-300">{interimText}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void handleRecord()}
              disabled={!canUseVoiceFlow || phase === 'recording' || recorder.isProcessing}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mic className="h-4 w-4" />
              Record answer
            </button>
            <button
              onClick={() => void handleStop()}
              disabled={phase !== 'recording'}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Radio className="h-4 w-4" />
              Stop
            </button>
            <button
              onClick={handleAnalyze}
              disabled={!recorder.audioBlob || phase === 'recording' || !canUseVoiceFlow}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {recorder.isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Analyze transcript
            </button>
          </div>

          {recorder.previewUrl && (
            <div className="rounded-xl border border-white/5 bg-slate-950/30 p-3">
              <audio controls src={recorder.previewUrl} className="w-full" />
            </div>
          )}

          {phase === 'review' && (
            <div className="space-y-3 rounded-2xl border border-white/5 bg-slate-950/35 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-cyan-200">
                  review required
                </span>
                {confidence > 0 && (
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-300">
                    confidence {(confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Transcript {sttSupported ? '(edit if needed)' : '(type what you said)'}
                </span>
                <textarea
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  onBlur={handleAnalyze}
                  rows={4}
                  placeholder={sttSupported ? 'Your spoken answer appears here.' : 'Automatic transcription is not available in this browser. Type what you said here.'}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                />
              </label>

              {rationale && (
                <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-slate-300">
                  <span className="font-medium text-slate-200">Suggested score:</span> {rationale}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <Type className="h-3.5 w-3.5" />
                  Your answer (adjust before approving)
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {LIKERT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedAnswer(option.value)}
                      aria-pressed={selectedAnswer === option.value}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${
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
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve and use this answer
              </button>
            </div>
          )}

          {saved && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              Answer saved and applied to this personality profile.
            </div>
          )}

          {/* Live sanity checks: every row reflects true runtime state. */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-xs text-slate-300 space-y-2">
            <div className="flex items-start gap-2">
              <Waves className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
              <span className="font-medium text-slate-200">Sanity checks</span>
            </div>
            <ul className="space-y-1 pl-1">
              <SanityRow
                ok={recorder.isSupported}
                label="Browser microphone API available"
                hint="Try Chrome, Edge, or Safari 14+ on HTTPS."
              />
              <SanityRow
                ok={isAuthenticated}
                label="Signed in (voice answers are private to your account)"
                hint="Sign in to enable voice answers."
              />
              <SanityRow
                ok={recorder.permission === 'granted'}
                pending={recorder.permission === 'unknown'}
                label="Microphone permission granted"
                pendingLabel="Microphone permission not requested yet"
                hint="Allow microphone access when your browser asks, or enable it in site settings."
              />
              <SanityRow
                ok={recorder.hasSignal}
                pending={phase !== 'recording' && !recorder.hasSignal}
                label="Audio input detected"
                pendingLabel="Audio input detected once you start recording"
                hint="Check that the right microphone is selected and unmuted."
              />
              <SanityRow
                ok={sttSupported}
                label="On-device transcription available"
                hint="Not available in this browser. You can still record and type the transcript."
              />
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function SanityRow({
  ok,
  pending,
  label,
  pendingLabel,
  hint,
}: {
  ok: boolean;
  pending?: boolean;
  label: string;
  pendingLabel?: string;
  hint: string;
}) {
  const state = ok ? 'ok' : pending ? 'pending' : 'fail';
  return (
    <li className="flex items-center gap-2">
      {state === 'ok' ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
      ) : state === 'pending' ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-300" />
      )}
      <span className={state === 'ok' ? 'text-slate-300' : state === 'pending' ? 'text-slate-400' : 'text-rose-200'}>
        {state === 'pending' && pendingLabel ? pendingLabel : label}
        {state === 'fail' && <span className="text-slate-500"> - {hint}</span>}
      </span>
    </li>
  );
}
