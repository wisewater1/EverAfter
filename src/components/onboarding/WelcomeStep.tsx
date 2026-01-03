import React from 'react';
import { Heart, Brain, Users, Shield, ArrowRight, Loader2 } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
  saving: boolean;
}

export default function WelcomeStep({ onNext, onSkip, saving }: WelcomeStepProps) {
  return (
    <div className="text-center">
      {/* Logo/Icon */}
      <div className="mb-6">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center">
          <Heart className="w-10 h-10 text-white" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
        Welcome to EverAfter
      </h1>

      <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
        Your AI-powered health companion and digital legacy platform
      </p>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
        <div className="p-4 bg-gray-700/30 rounded-xl border border-gray-600/50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Heart className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Health Monitoring</h3>
              <p className="text-sm text-gray-400">
                Track your health with AI-powered insights from St. Raphael
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-700/30 rounded-xl border border-gray-600/50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Custom AI Personalities</h3>
              <p className="text-sm text-gray-400">
                Create Engrams that capture who you are
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-700/30 rounded-xl border border-gray-600/50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Digital Legacy</h3>
              <p className="text-sm text-gray-400">
                Preserve memories and messages for loved ones
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-700/30 rounded-xl border border-gray-600/50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Private & Secure</h3>
              <p className="text-sm text-gray-400">
                Your data is encrypted and never shared
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Setup Info */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-8">
        <p className="text-indigo-300 text-sm">
          This quick setup will help personalize your experience. It takes about 3-5 minutes.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onNext}
          disabled={saving}
          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Get Started
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
        <button
          onClick={onSkip}
          disabled={saving}
          className="px-8 py-3 text-gray-400 hover:text-white transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
