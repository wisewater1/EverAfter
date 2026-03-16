import React from 'react';
import {
  Activity,
  ArrowRight,
  Brain,
  GitBranch,
  Heart,
  Loader2,
  Lock,
  Shield,
  Sparkles,
  Wallet,
} from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
  saving: boolean;
}

const SAINTS = [
  {
    name: 'St. Raphael',
    label: 'Health intelligence',
    detail: 'Vitals, trajectories, interventions, and daily check-ins.',
    icon: Heart,
    accent: 'from-emerald-400/20 to-cyan-400/10 border-emerald-400/20 text-emerald-200',
    chip: 'Real once health data is connected',
  },
  {
    name: 'St. Joseph',
    label: 'Family and genealogy',
    detail: 'Family tree, OCEAN personality layers, and continuity planning.',
    icon: GitBranch,
    accent: 'from-amber-400/20 to-orange-400/10 border-amber-400/20 text-amber-200',
    chip: 'Starts from genealogy seed or safe starter mock',
  },
  {
    name: 'St. Gabriel',
    label: 'Finance and treasury',
    detail: 'Budgets, transactions, WiseGold, and linked-account readiness.',
    icon: Wallet,
    accent: 'from-teal-400/20 to-cyan-400/10 border-teal-400/20 text-teal-200',
    chip: 'Falls back to guided mock state until bank connect',
  },
  {
    name: 'St. Anthony',
    label: 'Audit and recovery',
    detail: 'Evidence ledgers, verifiers, and recovery handoff trails.',
    icon: Shield,
    accent: 'from-violet-400/20 to-fuchsia-400/10 border-violet-400/20 text-violet-200',
    chip: 'Populates from audit starter state until first scan runs',
  },
  {
    name: 'Trinity',
    label: 'Cross-saint synthesis',
    detail: 'Family risk, goals, inheritance, and coordinated planning.',
    icon: Sparkles,
    accent: 'from-sky-400/20 to-indigo-400/10 border-sky-400/20 text-sky-200',
    chip: 'Synthesizes real sectors and labels mock assumptions clearly',
  },
];

export default function WelcomeStep({ onNext, onSkip, saving }: WelcomeStepProps) {
  return (
    <div className="space-y-8 text-left">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-200">
            <Activity className="h-3.5 w-3.5" />
            Sovereign onboarding
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-cyan-400 via-sky-500 to-violet-500 shadow-[0_0_28px_rgba(56,189,248,0.35)]">
                <Heart className="h-10 w-10 text-slate-950" />
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  EverAfter
                </h1>
                <p className="mt-2 max-w-xl text-base leading-7 text-slate-300">
                  One setup flow for Raphael, Joseph, Gabriel, Anthony, and Trinity.
                  Health, family, identity, permissions, and AI formation start here.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 backdrop-blur-xl">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  <Brain className="h-4 w-4 text-violet-300" />
                  OCEAN personality onboarding
                </div>
                <p className="text-sm text-slate-400">
                  You will seed the first personality layer during setup so Joseph and Delphi
                  have a real behavioral baseline.
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 backdrop-blur-xl">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  <Lock className="h-4 w-4 text-emerald-300" />
                  Real-first, mock when missing
                </div>
                <p className="text-sm text-slate-400">
                  Missing sectors are explicitly initialized in mock-safe mode instead of
                  rendering empty screens.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-950/40 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">What gets formed here</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Sector Readiness</h2>
            </div>
            <div className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
              6-step setup
            </div>
          </div>

          <div className="space-y-3">
            {SAINTS.map((saint) => {
              const Icon = saint.icon;
              return (
                <div
                  key={saint.name}
                  className={`rounded-2xl border bg-gradient-to-r p-4 backdrop-blur-xl ${saint.accent}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl bg-slate-950/40 p-2">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-white">{saint.name}</h3>
                        <span className="rounded-full bg-slate-950/40 px-2 py-0.5 text-[10px] text-slate-300">
                          {saint.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-300">{saint.detail}</p>
                      <p className="mt-2 text-xs text-slate-400">{saint.chip}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-indigo-400/15 bg-indigo-400/10 p-4 text-sm text-indigo-100 backdrop-blur-xl">
        This setup now covers your health profile, device links, permissions, first Engram,
        OCEAN starter quiz, and genealogy bootstrap for St. Joseph.
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          onClick={onNext}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 px-8 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_26px_rgba(56,189,248,0.35)] transition hover:scale-[1.01] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Start setup <ArrowRight className="h-4 w-4" /></>}
        </button>
        <button
          onClick={onSkip}
          disabled={saving}
          className="px-5 py-3 text-sm text-slate-400 transition hover:text-white"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
