import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  Check,
  CheckCircle2,
  Download,
  Eye,
  Fingerprint,
  Heart,
  Lock,
  Mail,
  MapPin,
  Monitor,
  Shield,
  Sparkles,
  Users,
  Wifi,
  Zap
} from 'lucide-react';
import DailyQuestionCard from '../DailyQuestionCard';
import HologramGuide from '../HologramGuide';
import type { Question } from '../../data/questions';
import { useDashboard } from '../../hooks/useDashboard';
import ProjectionControlPanel from './ProjectionControlPanel';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'members', label: 'Family Members', icon: Users },
  { id: 'saints', label: 'Saints AI', icon: Sparkles },
  { id: 'projection', label: 'Projection', icon: Monitor },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'settings', label: 'Settings', icon: Lock }
] as const;

type TabId = (typeof tabs)[number]['id'];

type FamilyDashboardProps = {
  readonly userId?: string;
};

const saints = [
  {
    id: 'raphael',
    name: 'St. Raphael',
    title: 'The Healer',
    description: 'Focuses on emotional wellness and reflection prompts when grief surfaces.',
    active: true,
    todayActivities: 7,
    weeklyActivities: 23
  },
  {
    id: 'michael',
    name: 'St. Michael',
    title: 'The Protector',
    description: 'Monitors privacy safeguards and automates memorial access policies.',
    active: true,
    todayActivities: 12,
    weeklyActivities: 45
  },
  {
    id: 'martin',
    name: 'St. Martin of Tours',
    title: 'The Compassionate',
    description: 'Plans charitable activations and community tributes for anniversaries.',
    active: false,
    todayActivities: 0,
    weeklyActivities: 0
  }
] as const;

const projectionStatus = [
  {
    id: 'location',
    label: 'Location',
    value: 'Memorial Garden, Section A',
    meta: 'Geofenced · 50ft radius',
    icon: MapPin,
    accent: 'text-blue-600'
  },
  {
    id: 'power',
    label: 'Power',
    value: 'Solar + Battery',
    meta: '87% charged',
    icon: Zap,
    accent: 'text-emerald-600'
  },
  {
    id: 'network',
    label: 'Network',
    value: 'Mesh uplink',
    meta: 'Latency stable',
    icon: Wifi,
    accent: 'text-purple-600'
  }
] as const;

const privacyChecklist = [
  'Multi-factor authentication active for all guardians.',
  'All memorial exports encrypted with rotating keys.',
  'Quarterly reviews scheduled for consent boundaries.'
] as const;

const automationSettings = [
  {
    id: 'weekly-digest',
    label: 'Weekly memory digest',
    description: 'Email a recap of new memories and milestones each Sunday evening.'
  },
  {
    id: 'projection-pings',
    label: 'Projection readiness alerts',
    description: 'Notify guardians if hardware health scores dip below 80%.'
  },
  {
    id: 'anniversary-reminders',
    label: 'Anniversary reminders',
    description: 'Plan stories and playlists ahead of key memorial dates.'
  }
] as const;

export default function FamilyDashboard({ userId }: FamilyDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [memoryStatus, setMemoryStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [inviteError, setInviteError] = useState<string | null>(null);

  const {
    stats,
    familyMembers,
    recentActivities,
    loading,
    error,
    saveMemory,
    inviteFamilyMember
  } = useDashboard(userId);

  const currentDay = useMemo(() => {
    if (!stats.daysCompleted) return 1;
    return Math.min(stats.daysCompleted + 1, 365);
  }, [stats.daysCompleted]);

  const statsCards = useMemo(
    () => [
      {
        id: 'memories',
        label: 'Memories',
        value: stats.memoriesCount,
        meta: `+${stats.memoriesThisWeek} this week`,
        icon: CalendarCheck,
        accent: 'from-indigo-500 to-purple-500'
      },
      {
        id: 'family',
        label: 'Family members',
        value: stats.familyMembersCount,
        meta: `${stats.pendingInvitationsCount} pending`,
        icon: Users,
        accent: 'from-emerald-500 to-teal-500'
      },
      {
        id: 'privacy',
        label: 'Privacy score',
        value: `${stats.privacyScore}%`,
        meta: 'All safeguards active',
        icon: Shield,
        accent: 'from-blue-500 to-cyan-500'
      },
      {
        id: 'days',
        label: 'Journey',
        value: `${stats.daysCompleted} days`,
        meta: `${stats.daysRemaining} remaining`,
        icon: Heart,
        accent: 'from-pink-500 to-rose-500'
      }
    ],
    [stats]
  );

  const handleMemorySubmit = useCallback(
    async (question: Question, response: string) => {
      try {
        setMemoryStatus('saving');
        setMemoryError(null);
        await saveMemory(question.id, question.question, response);
        setMemoryStatus('success');
        setTimeout(() => setMemoryStatus('idle'), 3000);
      } catch (submitError) {
        console.error(submitError);
        setMemoryStatus('error');
        setMemoryError(
          submitError instanceof Error
            ? submitError.message
            : 'Unable to save that memory right now.'
        );
      }
    },
    [saveMemory]
  );

  const handleInviteSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!inviteEmail.trim()) return;

      try {
        setInviteStatus('sending');
        setInviteError(null);
        await inviteFamilyMember(inviteEmail.trim(), inviteName.trim() || inviteEmail.trim());
        setInviteStatus('success');
        setInviteName('');
        setInviteEmail('');
        setTimeout(() => setInviteStatus('idle'), 3000);
      } catch (inviteErr) {
        console.error(inviteErr);
        setInviteStatus('error');
        setInviteError(
          inviteErr instanceof Error ? inviteErr.message : 'Unable to send invitation at this time.'
        );
      }
    },
    [inviteEmail, inviteName, inviteFamilyMember]
  );

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Family Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Review daily reflections, manage guardians, and prepare the memorial projection.
        </p>
      </div>

      {(error || memoryError) && (
        <div className="mb-6 space-y-3">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {memoryError && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <Bell className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{memoryError}</span>
            </div>
          )}
        </div>
      )}

      {memoryStatus === 'success' && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          <span>Your memory was saved. We’ll refresh your insights shortly.</span>
        </div>
      )}

      <div className="mb-6 flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            type="button"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <DailyQuestionCard currentDay={currentDay} onSubmit={handleMemorySubmit} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {statsCards.map(({ id, label, value, meta, icon: Icon, accent }) => (
              <div
                key={id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60"
              >
                <div
                  className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
                <p className="mt-1 text-xs text-slate-500">{meta}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Recent activity</h3>
            {loading ? (
              <p className="mt-4 text-sm text-slate-500">Loading the latest events…</p>
            ) : recentActivities.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No activity to report yet. Capture a memory to begin.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {recentActivities.map((activity, index) => (
                  <li key={`${activity.action}-${index}`} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{activity.action}</p>
                      <p className="text-xs text-slate-500">
                        {activity.user} • {activity.time}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600">
                      {activity.type}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Family roster</h3>
            <p className="mt-1 text-sm text-slate-500">Manage access and invitations for the memorial space.</p>

            <div className="mt-5 space-y-4">
              {familyMembers.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700">
                      {member.name
                        .split(' ')
                        .map(part => part[0])
                        .join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                      <p className="text-xs text-slate-500">Last active {member.lastActive}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                      member.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {member.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Invite a guardian</h3>
            <p className="mt-1 text-sm text-slate-500">Send a secure invitation to join the memorial workspace.</p>

            <form className="mt-4 space-y-4" onSubmit={handleInviteSubmit}>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</span>
                <input
                  value={inviteName}
                  onChange={event => setInviteName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Emma Johnson"
                  type="text"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</span>
                <input
                  value={inviteEmail}
                  onChange={event => setInviteEmail(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="emma@example.com"
                  type="email"
                  required
                />
              </label>

              {inviteError && (
                <p className="text-xs text-red-600">{inviteError}</p>
              )}

              {inviteStatus === 'success' && (
                <p className="flex items-center gap-2 text-xs text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> Invitation sent
                </p>
              )}

              <button
                type="submit"
                disabled={inviteStatus === 'sending'}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Mail className="h-4 w-4" />
                {inviteStatus === 'sending' ? 'Sending…' : 'Send invitation'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'saints' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Saints AI engrams</h3>
            <p className="mt-1 text-sm text-slate-500">
              Automated companions that watch over security, wellbeing, and commemorations.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {saints.map(saint => (
                <div key={saint.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{saint.name}</p>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{saint.title}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        saint.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {saint.active ? 'Active' : 'Standby'}
                    </span>
                  </div>

                  <p className="mt-4 text-sm text-slate-600">{saint.description}</p>

                  <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                    <span>{saint.todayActivities} today</span>
                    <span>{saint.weeklyActivities} this week</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'projection' && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Memorial projection</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Holographic presence pipeline with live safety monitoring enabled.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                {projectionStatus.map(({ id, label, value, meta, icon: Icon, accent }) => (
                  <div key={id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white ${accent}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{label}</p>
                      <p className="text-sm text-slate-600">{value}</p>
                      <p className="text-xs text-slate-500">{meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <ProjectionControlPanel />
          </div>

          <HologramGuide className="h-full" variant="light" />
        </div>
      )}

      {activeTab === 'privacy' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Privacy posture</h3>
            <p className="mt-1 text-sm text-slate-500">
              Encryption, audit trails, and access policies are up to date.
            </p>

            <div className="mt-5 flex flex-wrap gap-4">
              <div className="flex flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 min-w-[200px]">
                <Fingerprint className="h-6 w-6 text-indigo-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Device trust</p>
                  <p className="text-xs text-slate-500">All guardian devices verified in the last 30 days.</p>
                </div>
              </div>
              <div className="flex flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 min-w-[200px]">
                <Lock className="h-6 w-6 text-indigo-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Encryption</p>
                  <p className="text-xs text-slate-500">Memory vault secured with rotating keys.</p>
                </div>
              </div>
              <div className="flex flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 min-w-[200px]">
                <Download className="h-6 w-6 text-indigo-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Exports</p>
                  <p className="text-xs text-slate-500">Latest export sealed on March 3, 2024.</p>
                </div>
              </div>
            </div>

            <ul className="mt-6 space-y-3">
              {privacyChecklist.map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Automation & notifications</h3>
            <p className="mt-1 text-sm text-slate-500">
              Tune how EverAfter keeps the memorial experience prepared for loved ones.
            </p>

            <div className="mt-6 space-y-4">
              {automationSettings.map(setting => (
                <div
                  key={setting.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{setting.label}</p>
                    <p className="text-sm text-slate-600">{setting.description}</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" className="peer sr-only" defaultChecked />
                    <div className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600"></div>
                    <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
