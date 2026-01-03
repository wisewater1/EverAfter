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
  meet_raphael: 'Meet Raphael',
  health_profile: 'Health Profile',
  health_connections: 'Connect Health',
  media_permissions: 'Permissions',
  first_engram: 'Create AI',
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
      {/* Progress Bar */}
      <div className="relative">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-400">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-sm text-indigo-400">{progressPercentage}% complete</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Step Indicators - Desktop */}
      <div className="hidden sm:flex justify-between mt-6">
        {stepLabels.map((step, index) => {
          const isCompleted = completedSteps.includes(step);
          const isCurrent = index === currentStep;

          return (
            <div key={step} className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/20'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span
                className={`mt-2 text-xs text-center ${
                  isCurrent ? 'text-white font-medium' : 'text-gray-500'
                }`}
              >
                {STEP_DISPLAY_NAMES[step] || step}
              </span>
              {index < stepLabels.length - 1 && (
                <div
                  className={`absolute h-0.5 top-4 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-700'
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

      {/* Step Indicator - Mobile */}
      <div className="flex sm:hidden justify-center mt-4 gap-1.5">
        {stepLabels.map((step, index) => {
          const isCompleted = completedSteps.includes(step);
          const isCurrent = index === currentStep;

          return (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-all ${
                isCompleted
                  ? 'bg-green-500'
                  : isCurrent
                  ? 'bg-indigo-500 w-6'
                  : 'bg-gray-600'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
