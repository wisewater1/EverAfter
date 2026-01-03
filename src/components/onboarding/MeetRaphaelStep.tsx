import React from 'react';
import {
  Heart,
  Activity,
  Moon,
  Brain,
  Shield,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface MeetRaphaelStepProps {
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
}

export default function MeetRaphaelStep({ onNext, onBack, saving }: MeetRaphaelStepProps) {
  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mb-4">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Meet St. Raphael
        </h2>
        <p className="text-gray-400">
          Your AI health companion and wellness guide
        </p>
      </div>

      {/* Introduction */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl p-6 mb-6">
        <p className="text-emerald-100 leading-relaxed">
          "Hello! I'm <strong>St. Raphael</strong> — named after the angel of healing.
          I'll be your personal health companion, helping you understand your body,
          track your progress, and make healthier choices every day."
        </p>
      </div>

      {/* What St. Raphael Does */}
      <h3 className="text-lg font-semibold text-white mb-4">What I can help you with:</h3>

      <div className="space-y-3 mb-8">
        <div className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <Heart className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h4 className="font-medium text-white">Health Tracking</h4>
            <p className="text-sm text-gray-400">
              Monitor your heart rate, sleep, activity, and more
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h4 className="font-medium text-white">Daily Reports</h4>
            <p className="text-sm text-gray-400">
              Get personalized health summaries in plain language
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Moon className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h4 className="font-medium text-white">Pattern Detection</h4>
            <p className="text-sm text-gray-400">
              Notice trends in your sleep, stress, and energy levels
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Brain className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h4 className="font-medium text-white">Health Insights</h4>
            <p className="text-sm text-gray-400">
              Understand connections between your habits and health
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Note */}
      <div className="flex items-start gap-3 p-4 bg-gray-700/30 rounded-xl border border-gray-600/50 mb-8">
        <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-white mb-1">Your Privacy Matters</h4>
          <p className="text-sm text-gray-400">
            I never diagnose or prescribe. Your health data is encrypted and stays private.
            I'm here to help you understand your health, not replace your doctor.
          </p>
        </div>
      </div>

      {/* Daily Check-in Info */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-8">
        <p className="text-indigo-300 text-sm">
          <strong>Daily Check-ins:</strong> I'll send you a friendly health summary each morning
          at 9 AM, highlighting what's going well and areas to focus on.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={saving}
          className="px-6 py-3 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={saving}
          className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Continue
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
