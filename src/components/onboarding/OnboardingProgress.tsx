import React from 'react';
import { Check } from 'lucide-react';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  stepLabels: string[];
}

const STEP_DISPLAY_NAMES: Record<string, string> = {
  welcome: 'Welcome',
  meet_raphael: 'Raphael',
  health_profile: 'Health',
  health_connections: 'Connect',
  media_permissions: 'Permissions',
  first_engram: 'AI + Family',
};

export default function OnboardingProgress({
  currentStep,
  totalSteps,
  completedSteps,
  stepLabels,
}: OnboardingProgressProps) {
  const progressPercentage = Math.round((completedSteps.length / totalSteps) * 100);

  return (
    <div className="mb-8">
      <div className="rounded-[28px] border border-cyan-400/10 bg-slate-950/45 px-4 py-5 shadow-[0_12px_40px_rgba(2,6,23,0.4)] backdrop-blur-xl">
        <div className="relative">
        <div className="mb-3 flex justify-between">
          <span className="text-sm text-slate-300">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-sm text-cyan-300">{progressPercentage}% complete</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 shadow-[0_0_18px_rgba(56,189,248,0.55)] transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="relative mt-6 hidden sm:flex justify-between">
        {stepLabels.map((step, index) => {
          const isCompleted = completedSteps.includes(step);
          const isCurrent = index === currentStep;

          return (
            <div key={step} className="flex flex-col items-center flex-1">
              <div
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all ${
                  isCompleted
                    ? 'bg-emerald-500 text-white shadow-[0_0_14px_rgba(16,185,129,0.55)]'
                    : isCurrent
                    ? 'bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 ring-4 ring-cyan-400/15 shadow-[0_0_18px_rgba(56,189,248,0.5)]'
                    : 'bg-slate-800 text-slate-400 border border-white/5'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span
                className={`mt-2 text-xs text-center ${
                  isCurrent ? 'text-white font-medium' : 'text-slate-500'
                }`}
              >
                {STEP_DISPLAY_NAMES[step] || step}
              </span>
              {index < stepLabels.length - 1 && (
                <div
                  className={`absolute top-5 h-0.5 ${
                    isCompleted ? 'bg-emerald-500/70' : 'bg-white/5'
                  }`}
                  style={{
                    left: `calc(${(index + 1) * (100 / stepLabels.length)}% - 4rem)`,
                    width: `calc(${100 / stepLabels.length}% - 2rem)`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-center gap-1.5 sm:hidden">
        {stepLabels.map((step, index) => {
          const isCompleted = completedSteps.includes(step);
          const isCurrent = index === currentStep;

          return (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-all ${
                isCompleted
                  ? 'bg-emerald-500'
                  : isCurrent
                  ? 'bg-cyan-400 w-6'
                  : 'bg-slate-600'
              }`}
            />
          );
        })}
      </div>
      </div>
    </div>
  );
}
