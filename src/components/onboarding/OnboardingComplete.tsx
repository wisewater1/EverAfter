import React from 'react';
import {
  CheckCircle,
  Sparkles,
  Heart,
  Brain,
  Calendar,
  ArrowRight,
  Loader2,
  PartyPopper,
} from 'lucide-react';

interface OnboardingCompleteProps {
  onFinish: () => void;
  saving: boolean;
}

export default function OnboardingComplete({ onFinish, saving }: OnboardingCompleteProps) {
  return (
    <div className="text-center">
      {/* Success Animation */}
      <div className="relative mb-6">
        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center animate-bounce">
          <PartyPopper className="w-4 h-4 text-yellow-900" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-3xl font-bold text-white mb-3">You're All Set!</h2>
      <p className="text-gray-400 text-lg mb-8">
        Welcome to EverAfter. Your journey to better health and lasting memories begins now.
      </p>

      {/* What's Next */}
      <div className="bg-gray-700/30 rounded-2xl p-6 mb-8 text-left">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          What's Next?
        </h3>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h4 className="font-medium text-white">Meet St. Raphael</h4>
              <p className="text-sm text-gray-400">
                Your AI health companion is ready to chat. Ask about your health, get daily
                check-ins, and track your progress.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h4 className="font-medium text-white">Train Your Engram</h4>
              <p className="text-sm text-gray-400">
                Answer daily questions to teach your AI personality who you are. Each response
                makes it more uniquely you.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h4 className="font-medium text-white">Daily Check-ins</h4>
              <p className="text-sm text-gray-400">
                Every morning at 9 AM, St. Raphael will send you a personalized health summary
                based on your data.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Preview */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl p-4 border border-indigo-500/20">
          <p className="text-2xl font-bold text-indigo-400">365</p>
          <p className="text-xs text-gray-400">Daily Questions</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
          <p className="text-2xl font-bold text-green-400">∞</p>
          <p className="text-xs text-gray-400">Memories to Create</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-xl p-4 border border-pink-500/20">
          <p className="text-2xl font-bold text-pink-400">24/7</p>
          <p className="text-xs text-gray-400">AI Companion</p>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onFinish}
        disabled={saving}
        className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mx-auto text-lg"
      >
        {saving ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <>
            Go to Dashboard
            <ArrowRight className="w-6 h-6" />
          </>
        )}
      </button>

      <p className="text-gray-500 text-sm mt-4">
        You can always update your preferences in Settings
      </p>
    </div>
  );
}
