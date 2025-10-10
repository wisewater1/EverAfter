import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Brain,
  CheckCircle2,
  Cloud,
  Cpu,
  Layers,
  MessageSquare,
  MonitorPlay,
  Orbit,
  Radio,
  Shield,
  Sparkles,
  Users
} from 'lucide-react';

type Step = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly bullets: readonly string[];
  readonly icon: LucideIcon;
};

type Pillar = {
  readonly title: string;
  readonly description: string;
  readonly icon: LucideIcon;
};

type Variant = 'light' | 'dark';

const steps: readonly Step[] = [
  {
    id: 'capture',
    title: 'Capture everyday answers',
    summary: 'Collect structured prompts and free-form reflections so every season of life is represented.',
    bullets: [
      'Rotate prompts that explore milestones, habits, humor, and decision making.',
      'Tag entries with participants, setting, and emotional cues for richer playback.',
      'Document topics that should remain private so they never surface unexpectedly.'
    ],
    icon: MessageSquare
  },
  {
    id: 'profile',
    title: 'Draft the personality brief',
    summary: 'Translate raw responses into a reviewable guide that explains tone, values, and boundaries.',
    bullets: [
      'Apply behavioral models like the Big Five alongside family-specific nuances.',
      'Capture favourite turns of phrase and storytelling quirks for authentic dialogue.',
      'Version-control the brief so relatives can approve adjustments before launches.'
    ],
    icon: Brain
  },
  {
    id: 'model',
    title: 'Teach the conversation model',
    summary: 'Fine-tune or condition an assistant so it follows the brief and honours consent rules.',
    bullets: [
      'Blend retrieval with training examples to keep answers grounded in approved memories.',
      'Encode red lines—sensitive topics, escalation triggers, and routes back to humans.',
      'Run rehearsal conversations with the family and note any adjustments needed.'
    ],
    icon: Cpu
  },
  {
    id: 'avatar',
    title: 'Design the visual and vocal twin',
    summary: 'Create a comforting presence using consented photos, scans, and voice samples.',
    bullets: [
      'Build a MetaHuman (or similar) rig with relaxed idle motions and attentive listening cues.',
      'Generate a voice using licensed recordings and pronunciation guides for cherished names.',
      'Test accessibility options—captions, transcripts, and touch-free controls.'
    ],
    icon: Users
  },
  {
    id: 'integrate',
    title: 'Link mind, body, and safety nets',
    summary: 'Connect speech, inference, and animation pipelines so replies feel natural and accountable.',
    bullets: [
      'Stream speech-to-text, model inference, and voice playback with clear latency budgets.',
      'Drive facial rigs with visemes and emotional cues so expressions match the story told.',
      'Log every session with consent metadata to support transparency and audits.'
    ],
    icon: Orbit
  },
  {
    id: 'deploy',
    title: 'Plan the first hologram sessions',
    summary: 'Set up the physical or AR environment and rehearse the experience with the family team.',
    bullets: [
      'Choose display hardware—holobox, AR headset, or light-field frame—and test lighting/audio.',
      'Provide a moderator console for pausing, cueing stories, or redirecting conversations.',
      'Prepare onboarding guides so guests know what the hologram can and cannot do.'
    ],
    icon: MonitorPlay
  },
  {
    id: 'steward',
    title: 'Keep caring for the memorial',
    summary: 'Review performance, ethics, and emotional impact on a steady cadence.',
    bullets: [
      'Schedule family check-ins to retire outdated content or capture new milestones.',
      'Monitor sentiment and escalate to human support if conversations become heavy.',
      'Refresh safeguards whenever the AI stack or deployment hardware changes.'
    ],
    icon: Radio
  }
];

const pillars: readonly Pillar[] = [
  {
    title: 'Data guardianship',
    description: 'Layered encryption, backups, and context-rich metadata keep stories trustworthy.',
    icon: Layers
  },
  {
    title: 'Conversational fidelity',
    description: 'Hybrid LLM + retrieval stack delivers grounded replies in under half a second.',
    icon: Sparkles
  },
  {
    title: 'Immersive presence',
    description: 'Real-time rendering pipelines maintain lifelike lighting, motion, and audio sync.',
    icon: MonitorPlay
  },
  {
    title: 'Safety & consent',
    description: 'Granular permissions, clear audit trails, and escalation paths protect families.',
    icon: Shield
  },
  {
    title: 'Operations toolkit',
    description: 'Cloud orchestration handles deployments, monitoring, and automated health checks.',
    icon: Cloud
  }
];

const readinessChecks: readonly string[] = [
  'Family sign-off recorded for the current personality brief and data sources.',
  'Latency and quality tested across the display hardware that will be used.',
  'Live rehearsal completed with a human moderator observing the safety rails.',
  'Support plan documented with contacts, escalation triggers, and downtime notices.'
];

type HologramGuideProps = {
  readonly className?: string;
  readonly variant?: Variant;
};

const variantStyles: Record<Variant, Record<string, string>> = {
  dark: {
    container: 'rounded-2xl border border-white/5 bg-gradient-to-br from-slate-900 via-slate-950 to-gray-900 text-white shadow-xl',
    heroBadge: 'inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-100',
    heroBadgeIcon: 'h-3.5 w-3.5 text-indigo-200',
    heroSummary: 'text-sm text-indigo-100/90 sm:text-base',
    stepCard: 'group rounded-xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-black/20 transition-colors hover:bg-white/8 sm:p-8',
    stepBadge: 'text-xs font-semibold uppercase tracking-wide text-indigo-200/80',
    stepTitle: 'text-xl font-semibold text-white',
    stepSummary: 'text-sm text-indigo-100/90',
    stepIconWrap: 'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 shadow-lg shadow-indigo-900/40 transition-colors group-hover:bg-white/15',
    stepIcon: 'h-6 w-6 text-indigo-100',
    bulletDot: 'mt-1 h-1.5 w-1.5 rounded-full bg-indigo-300/80',
    bulletText: 'text-sm text-indigo-100/80',
    pillarCard: 'flex items-start gap-4 rounded-xl border border-white/10 bg-black/20 p-5 transition-colors hover:border-indigo-300/40',
    pillarIconWrap: 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-indigo-100',
    pillarTitle: 'text-base font-semibold text-white',
    pillarDescription: 'text-sm text-indigo-100/80',
    readinessCard: 'space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-7',
    readinessTitle: 'text-lg font-semibold text-white',
    readinessSummary: 'text-sm text-indigo-100/80',
    readinessText: 'text-sm text-indigo-100/80',
    readinessIcon: 'mt-0.5 h-4 w-4 text-emerald-300'
  },
  light: {
    container: 'rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-xl shadow-slate-200/60',
    heroBadge: 'inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-700',
    heroBadgeIcon: 'h-3.5 w-3.5 text-indigo-500',
    heroSummary: 'text-sm text-gray-600 sm:text-base',
    stepCard: 'group rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm transition-colors hover:border-indigo-200 hover:bg-white sm:p-8',
    stepBadge: 'text-xs font-semibold uppercase tracking-wide text-indigo-600/90',
    stepTitle: 'text-xl font-semibold text-gray-900',
    stepSummary: 'text-sm text-gray-600',
    stepIconWrap: 'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 shadow-sm transition-colors group-hover:bg-indigo-200/60',
    stepIcon: 'h-6 w-6 text-indigo-700',
    bulletDot: 'mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500/60',
    bulletText: 'text-sm text-gray-600',
    pillarCard: 'flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo-200',
    pillarIconWrap: 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700',
    pillarTitle: 'text-base font-semibold text-gray-900',
    pillarDescription: 'text-sm text-gray-600',
    readinessCard: 'space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-6 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-7',
    readinessTitle: 'text-lg font-semibold text-gray-900',
    readinessSummary: 'text-sm text-gray-600',
    readinessText: 'text-sm text-gray-600',
    readinessIcon: 'mt-0.5 h-4 w-4 text-emerald-500'
  }
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export default function HologramGuide({ className, variant = 'dark' }: HologramGuideProps) {
  const styles = variantStyles[variant];

  return (
    <section
      aria-labelledby="hologram-guide-title"
      className={classNames(styles.container, 'overflow-hidden', className)}
    >
      <div className="space-y-12 px-6 py-8 sm:px-10 sm:py-12">
        <header className="space-y-4">
          <div className={styles.heroBadge}>
            <Sparkles className={styles.heroBadgeIcon} aria-hidden />
            <span>Projection Blueprint</span>
          </div>
          <div className="space-y-2 max-w-3xl">
            <h2 id="hologram-guide-title" className="text-3xl font-bold leading-tight sm:text-4xl">
              Turning Q&amp;A memories into an interactive hologram
            </h2>
            <p className={styles.heroSummary}>
              Follow the step-by-step plan below to move from everyday prompts to a caring, always-on memorial presence.
            </p>
          </div>
        </header>

        <ol className="grid gap-6" aria-label="Hologram build phases">
          {steps.map(({ id, title, summary, bullets, icon: Icon }, index) => (
            <li key={id} className={styles.stepCard}>
              <div className="flex items-start gap-4">
                <div className={styles.stepIconWrap}>
                  <Icon aria-hidden className={styles.stepIcon} />
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className={styles.stepBadge}>Step {index + 1}</p>
                    <h3 className={styles.stepTitle}>{title}</h3>
                    <p className={styles.stepSummary}>{summary}</p>
                  </div>
                  <ul className="space-y-2">
                    {bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2">
                        <span className={styles.bulletDot} aria-hidden />
                        <span className={styles.bulletText}>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Technology pillars</h3>
            <p className={styles.heroSummary}>
              These foundations make the hologram reliable, respectful, and easy to maintain over time.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pillars.map(({ title, description, icon: Icon }) => (
              <div key={title} className={styles.pillarCard}>
                <div className={styles.pillarIconWrap}>
                  <Icon aria-hidden className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className={styles.pillarTitle}>{title}</h4>
                  <p className={styles.pillarDescription}>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.readinessCard}>
          <div className="space-y-1">
            <h3 className={styles.readinessTitle}>Readiness checks</h3>
            <p className={styles.readinessSummary}>Confirm these safeguards before inviting loved ones to meet the hologram.</p>
          </div>
          <ul className="space-y-3">
            {readinessChecks.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 aria-hidden className={styles.readinessIcon} />
                <span className={styles.readinessText}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
