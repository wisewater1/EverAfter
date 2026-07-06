import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { requestBackendJson } from '../lib/backend-request';

/**
 * Public, no-account personality quiz reached via a shared /quiz/:token link.
 * A friend or relative answers on their own device; answers post back to the
 * owner's invite server-side. Deliberately self-contained: no auth, no
 * family-dashboard coupling.
 */

interface PublicQuestion {
  id: string;
  text: string;
  category?: string;
  number?: number;
}

interface PublicInvite {
  subject_name: string;
  status: string;
  questions?: PublicQuestion[];
}

const LIKERT = [
  { value: 1, label: 'Strongly Disagree', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { value: 2, label: 'Disagree', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  { value: 3, label: 'Neutral', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
  { value: 4, label: 'Agree', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { value: 5, label: 'Strongly Agree', color: 'bg-green-500/20 text-green-300 border-green-500/40' },
];

export default function PublicPersonalityQuiz() {
  const { token } = useParams<{ token: string }>();
  const [invite, setInvite] = useState<PublicInvite | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ archetype?: { name?: string; emoji?: string } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('This quiz link is missing its code.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await requestBackendJson<PublicInvite>(
          `/api/v1/personality-quiz/public/${encodeURIComponent(token)}`,
          { method: 'GET' },
          'Could not load this quiz.',
        );
        if (cancelled) return;
        const qs = Array.isArray(data.questions) ? data.questions : [];
        if (qs.length === 0) throw new Error('This quiz has no questions.');
        setInvite(data);
        setQuestions(qs);
        if (data.status === 'completed') {
          setDone({});
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'This quiz link is invalid or has expired.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const answeredCount = Object.keys(answers).length;
  const total = questions.length;
  const currentQuestion = questions[current];

  const select = useCallback((value: number) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
    if (current < total - 1) {
      setTimeout(() => setCurrent((c) => Math.min(c + 1, total - 1)), 220);
    }
  }, [current, currentQuestion, total]);

  const submit = useCallback(async () => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await requestBackendJson<{ ok?: boolean; archetype?: { name?: string; emoji?: string } }>(
        `/api/v1/personality-quiz/public/${encodeURIComponent(token)}/submit`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }) },
        'Could not submit your answers.',
      );
      setDone({ archetype: result?.archetype });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your answers. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [answers, token]);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900/60 sm:backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8">
        {children}
      </div>
    </div>
  );

  if (loading) {
    return <Shell><div className="flex flex-col items-center gap-3 py-10 text-slate-400"><Loader2 className="w-7 h-7 animate-spin text-indigo-400" /><p>Loading the questions…</p></div></Shell>;
  }

  if (error && !invite) {
    return <Shell><div className="flex flex-col items-center gap-3 py-10 text-center"><AlertCircle className="w-10 h-10 text-rose-400" /><h1 className="text-xl font-semibold text-white">Quiz unavailable</h1><p className="text-slate-400 text-sm">{error}</p></div></Shell>;
  }

  if (done) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          <h1 className="text-2xl font-semibold text-white">Thank you{invite ? '' : ''}!</h1>
          <p className="text-slate-300 text-sm">
            Your answers about <span className="text-white font-medium">{invite?.subject_name || 'them'}</span> have
            been saved and shared back securely. {done.archetype?.name ? (
              <>They came through as <span className="text-indigo-300 font-medium">{done.archetype.emoji} {done.archetype.name}</span>.</>
            ) : null}
          </p>
          <p className="text-slate-500 text-xs">You can close this page now.</p>
        </div>
      </Shell>
    );
  }

  const progress = total > 0 ? Math.round(((current + 1) / total) * 100) : 0;
  const canSubmit = answeredCount >= Math.ceil(total * 0.8);

  return (
    <Shell>
      <div className="flex items-center gap-2 mb-1 text-indigo-300">
        <Sparkles className="w-5 h-5" />
        <span className="text-xs font-semibold uppercase tracking-wider">EverAfter Personality Questions</span>
      </div>
      <h1 className="text-lg sm:text-xl font-light text-white mb-1">
        Help us understand <span className="font-medium">{invite?.subject_name || 'your loved one'}</span>
      </h1>
      <p className="text-slate-500 text-xs mb-4">Answer honestly, there are no wrong answers. {answeredCount}/{total} answered.</p>

      <div className="h-1.5 w-full bg-white/5 rounded-full mb-5 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {currentQuestion && (
        <>
          <p className="text-base sm:text-lg text-white mb-4 leading-snug">"{currentQuestion.text}"</p>
          <div className="space-y-2">
            {LIKERT.map((opt) => {
              const selected = answers[currentQuestion.id] === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => select(opt.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selected ? opt.color + ' shadow-lg' : 'bg-white/[0.02] border-white/5 hover:border-white/15 text-slate-300'}`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-current' : 'border-white/20'}`}>
                    {selected && <span className="w-2 h-2 rounded-full bg-current" />}
                  </span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-5">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white disabled:opacity-30 transition"
            >
              ← Back
            </button>
            {current < total - 1 ? (
              <button
                onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 text-slate-200 hover:bg-white/10 transition"
              >
                Skip →
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!canSubmit || submitting}
                className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${canSubmit && !submitting ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg' : 'bg-white/5 text-slate-500 cursor-not-allowed'}`}
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {submitting ? 'Submitting…' : 'Finish & Send'}
              </button>
            )}
          </div>
          {!canSubmit && current === total - 1 && (
            <p className="text-amber-400/80 text-[11px] mt-2 text-center">Please answer at least {Math.ceil(total * 0.8)} questions before sending.</p>
          )}
          {error && <p className="text-rose-400 text-xs mt-3 text-center">{error}</p>}
        </>
      )}
    </Shell>
  );
}
