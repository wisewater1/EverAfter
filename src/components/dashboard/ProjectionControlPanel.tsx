import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Headphones,
  MapPin,
  Mic2,
  Radio,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Wifi,
  Zap
} from 'lucide-react';

interface ProjectionControlPanelProps {
  readonly className?: string;
  readonly onPlanCreate?: (plan: ProjectionSessionPlan) => void;
}

interface ProjectionSessionPlan {
  readonly title: string;
  readonly date: string;
  readonly time: string;
  readonly location: string;
  readonly focus: SessionFocus;
  readonly voice: VoiceProfile['id'];
  readonly playlist: MemoryPlaylist['id'];
  readonly inviteCount: number;
  readonly safetyNotes: string;
}

type SessionFocus = 'tribute' | 'storycircle' | 'celebration';

type VoiceProfile = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
};

type MemoryPlaylist = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
};

const voiceProfiles: VoiceProfile[] = [
  {
    id: 'comforting',
    label: 'Comforting storyteller',
    description: 'Warm cadence, slower pacing, gentle inflection for reflective gatherings.'
  },
  {
    id: 'energetic',
    label: 'Energetic host',
    description: 'Lively tone with subtle humor cues for celebrations and birthdays.'
  },
  {
    id: 'archival',
    label: 'Archival narrator',
    description: 'Documentary-style delivery ideal for historic timelines and milestones.'
  }
];

const memoryPlaylists: MemoryPlaylist[] = [
  {
    id: 'milestones',
    label: 'Milestones & firsts',
    description: 'Graduations, first jobs, and proudest achievements.'
  },
  {
    id: 'family',
    label: 'Family traditions',
    description: 'Holiday rituals, recipes, and the stories everyone requests.'
  },
  {
    id: 'wisdom',
    label: 'Letters of wisdom',
    description: 'Advice, values, and personal philosophies captured over the journey.'
  }
];

const focusCopy: Record<SessionFocus, { title: string; helper: string; icon: React.ReactNode }> = {
  tribute: {
    title: 'Quiet tribute',
    helper: 'Softer lighting, moderate volume, and reflective pacing for intimate visits.',
    icon: <Sparkles className="h-4 w-4" />
  },
  storycircle: {
    title: 'Story circle',
    helper: 'Balanced environment optimised for conversation and live prompts.',
    icon: <Users className="h-4 w-4" />
  },
  celebration: {
    title: 'Celebration',
    helper: 'Brighter stage lights, upbeat playlists, and quick-fire memories to energise the room.',
    icon: <Headphones className="h-4 w-4" />
  }
};

const hardwareReadiness = [
  {
    id: 'power',
    label: 'Power grid',
    value: 'Solar array',
    status: 'Charged to 92%',
    icon: Zap
  },
  {
    id: 'network',
    label: 'Network uplink',
    value: 'Mesh node A3',
    status: 'Latency 34ms',
    icon: Wifi
  },
  {
    id: 'projector',
    label: 'Projection rig',
    value: 'MetaHuman holobox',
    status: 'Diagnostics clean',
    icon: Radio
  }
] as const;

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export default function ProjectionControlPanel({ className, onPlanCreate }: ProjectionControlPanelProps) {
  const [title, setTitle] = useState('Garden gathering');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('18:00');
  const [location, setLocation] = useState('Memorial Garden, Section A');
  const [focus, setFocus] = useState<SessionFocus>('storycircle');
  const [voice, setVoice] = useState<VoiceProfile['id']>('comforting');
  const [playlist, setPlaylist] = useState<MemoryPlaylist['id']>('family');
  const [inviteCount, setInviteCount] = useState(12);
  const [safetyNotes, setSafetyNotes] = useState('Share quiet space guidelines and note emotional support lead.');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  const selectedFocus = useMemo(() => focusCopy[focus], [focus]);
  const scheduleDisabled = !title.trim() || !date || !time || !location.trim();

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = event => {
    event.preventDefault();
    if (scheduleDisabled) return;

    const plan: ProjectionSessionPlan = {
      title: title.trim(),
      date,
      time,
      location: location.trim(),
      focus,
      voice,
      playlist,
      inviteCount,
      safetyNotes: safetyNotes.trim()
    };

    setStatus('saving');
    window.setTimeout(() => {
      setStatus('success');
      onPlanCreate?.(plan);
      window.setTimeout(() => setStatus('idle'), 2500);
    }, 600);
  };

  return (
    <section
      aria-labelledby="projection-controls-title"
      className={classNames(
        'rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60',
        className
      )}
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            <Compass className="h-3.5 w-3.5" />
            Projection console
          </p>
          <h2 id="projection-controls-title" className="text-xl font-semibold text-slate-900">
            Configure the next hologram session
          </h2>
          <p className="text-sm text-slate-500">
            Confirm logistics, playlists, and safeguards before inviting loved ones to join.
          </p>
        </div>
        {status === 'success' && (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Session staged
          </span>
        )}
      </header>

      <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Session title</span>
            <div className="relative">
              <input
                value={title}
                onChange={event => setTitle(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Evening stories in the garden"
                type="text"
              />
              <Sparkles className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" aria-hidden />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</span>
            <div className="relative">
              <input
                value={location}
                onChange={event => setLocation(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Holobox location"
                type="text"
              />
              <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" aria-hidden />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</span>
            <div className="relative">
              <input
                value={date}
                onChange={event => setDate(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                type="date"
              />
              <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" aria-hidden />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start time</span>
            <div className="relative">
              <input
                value={time}
                onChange={event => setTime(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                type="time"
              />
              <Clock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" aria-hidden />
            </div>
          </label>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Environment focus</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(focusCopy) as SessionFocus[]).map(option => {
              const { title: optionTitle, helper, icon } = focusCopy[option];
              const selected = focus === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFocus(option)}
                  className={classNames(
                    'flex h-full flex-col items-start gap-2 rounded-xl border px-4 py-3 text-left transition-all',
                    selected
                      ? 'border-indigo-500 bg-indigo-50 shadow-sm shadow-indigo-200'
                      : 'border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-white'
                  )}
                >
                  <span className={classNames('flex items-center gap-2 text-sm font-semibold', selected ? 'text-indigo-700' : 'text-slate-700')}>
                    {icon}
                    {optionTitle}
                  </span>
                  <span className="text-xs text-slate-500">{helper}</span>
                </button>
              );
            })}
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-700">
            {selectedFocus.helper}
          </div>
        </fieldset>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Voice profile</span>
            <div className="rounded-xl border border-slate-200">
              {voiceProfiles.map(profile => {
                const selected = voice === profile.id;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setVoice(profile.id)}
                    className={classNames(
                      'flex w-full items-start gap-3 border-b border-slate-200 px-4 py-3 text-left last:border-b-0',
                      selected ? 'bg-indigo-50/80' : 'hover:bg-slate-50'
                    )}
                  >
                    <Mic2 className={classNames('mt-0.5 h-4 w-4 flex-shrink-0', selected ? 'text-indigo-600' : 'text-slate-400')} aria-hidden />
                    <div>
                      <p className={classNames('text-sm font-semibold', selected ? 'text-indigo-700' : 'text-slate-700')}>{profile.label}</p>
                      <p className="text-xs text-slate-500">{profile.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Memory playlist</span>
            <div className="rounded-xl border border-slate-200">
              {memoryPlaylists.map(list => {
                const selected = playlist === list.id;
                return (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => setPlaylist(list.id)}
                    className={classNames(
                      'flex w-full items-start gap-3 border-b border-slate-200 px-4 py-3 text-left last:border-b-0',
                      selected ? 'bg-indigo-50/80' : 'hover:bg-slate-50'
                    )}
                  >
                    <Upload className={classNames('mt-0.5 h-4 w-4 flex-shrink-0', selected ? 'text-indigo-600' : 'text-slate-400')} aria-hidden />
                    <div>
                      <p className={classNames('text-sm font-semibold', selected ? 'text-indigo-700' : 'text-slate-700')}>{list.label}</p>
                      <p className="text-xs text-slate-500">{list.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expected guests</span>
            <div className="relative">
              <input
                value={inviteCount}
                onChange={event => setInviteCount(Number(event.target.value) || 0)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                type="number"
                min={0}
              />
              <Users className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" aria-hidden />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Safety & care notes</span>
            <textarea
              value={safetyNotes}
              onChange={event => setSafetyNotes(event.target.value)}
              className="min-h-[88px] w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Moderator assignments, support contact, or emotional care guidance"
            />
          </label>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hardware readiness</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {hardwareReadiness.map(item => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-indigo-500" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
                <p className="text-xs text-slate-500">{item.status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden />
            <span>Moderator check-in required 30 minutes before guests arrive.</span>
          </div>
          <button
            type="submit"
            disabled={scheduleDisabled || status === 'saving'}
            className={classNames(
              'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all',
              scheduleDisabled || status === 'saving'
                ? 'bg-indigo-300'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:shadow-indigo-300/40'
            )}
          >
            {status === 'saving' ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                Staging session…
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4" aria-hidden />
                Schedule session
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

