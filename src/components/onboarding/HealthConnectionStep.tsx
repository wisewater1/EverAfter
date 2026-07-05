import React, { useState } from 'react';
import {
  Activity,
  Watch,
  Smartphone,
  Heart,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  Plus,
} from 'lucide-react';
import {
  loadHealthConnectionPreferencesDraft,
  saveHealthConnectionPreferencesDraft,
} from '../../lib/onboardingApi';

interface HealthConnectionStepProps {
  onNext: (selectedProviders: string[]) => void;
  onBack: () => void;
  saving: boolean;
  userId: string;
}

interface HealthProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  popular?: boolean;
}

const HEALTH_PROVIDERS: HealthProvider[] = [
  {
    id: 'apple_health',
    name: 'Apple Health',
    description: 'iPhone & Apple Watch data',
    icon: Smartphone,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    popular: true,
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    description: 'Activity, sleep & heart rate',
    icon: Watch,
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/20',
    popular: true,
  },
  {
    id: 'google_fit',
    name: 'Google Fit',
    description: 'Android health & fitness',
    icon: Activity,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    popular: true,
  },
  {
    id: 'oura',
    name: 'Oura Ring',
    description: 'Sleep & readiness tracking',
    icon: Heart,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  {
    id: 'whoop',
    name: 'WHOOP',
    description: 'Recovery & strain metrics',
    icon: Activity,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    description: 'Sports & outdoor tracking',
    icon: Watch,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
  },
];

const KNOWN_PROVIDER_IDS = new Set(HEALTH_PROVIDERS.map((provider) => provider.id));

export default function HealthConnectionStep({
  onNext,
  onBack,
  saving,
  userId,
}: HealthConnectionStepProps) {
  const [selectedProviders, setSelectedProviders] = useState<string[]>(() =>
    loadHealthConnectionPreferencesDraft(userId).filter((id) => KNOWN_PROVIDER_IDS.has(id))
  );

  const toggleProvider = (providerId: string) => {
    const next = selectedProviders.includes(providerId)
      ? selectedProviders.filter((id) => id !== providerId)
      : [...selectedProviders, providerId];
    setSelectedProviders(next);
    saveHealthConnectionPreferencesDraft(userId, next);
  };

  const handleContinue = () => {
    saveHealthConnectionPreferencesDraft(userId, selectedProviders);
    onNext(selectedProviders);
  };

  const popularProviders = HEALTH_PROVIDERS.filter((p) => p.popular);
  const otherProviders = HEALTH_PROVIDERS.filter((p) => !p.popular);

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Health Sources</h2>
        <p className="text-gray-400 text-sm">
          Pick the devices and apps you use. We save your choices now, and you complete each
          secure connection in the St. Raphael health hub after setup finishes.
        </p>
      </div>

      {/* Popular Providers */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Popular Sources</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {popularProviders.map((provider) => {
            const isSelected = selectedProviders.includes(provider.id);
            const Icon = provider.icon;

            return (
              <button
                key={provider.id}
                onClick={() => toggleProvider(provider.id)}
                disabled={saving}
                aria-pressed={isSelected}
                className={`p-4 rounded-xl border transition-all text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isSelected
                    ? 'bg-indigo-500/10 border-indigo-500/50'
                    : 'bg-gray-700/30 border-gray-600/50 hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${provider.bgColor}`}>
                    <Icon className={`w-5 h-5 ${provider.color}`} />
                  </div>
                  {isSelected ? (
                    <Check className="w-5 h-5 text-indigo-400" />
                  ) : (
                    <Plus className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <h4 className="font-medium text-white mt-3">{provider.name}</h4>
                <p className="text-xs text-gray-400 mt-1">{provider.description}</p>
                {isSelected && (
                  <p className="text-xs text-indigo-300 mt-2">Selected for setup</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Other Providers */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">More Devices</h3>
        <div className="space-y-2">
          {otherProviders.map((provider) => {
            const isSelected = selectedProviders.includes(provider.id);
            const Icon = provider.icon;

            return (
              <button
                key={provider.id}
                onClick={() => toggleProvider(provider.id)}
                disabled={saving}
                aria-pressed={isSelected}
                className={`w-full p-3 rounded-lg border transition-all flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isSelected
                    ? 'bg-indigo-500/10 border-indigo-500/50'
                    : 'bg-gray-700/30 border-gray-600/50 hover:bg-gray-700/50'
                }`}
              >
                <div className={`p-2 rounded-lg ${provider.bgColor}`}>
                  <Icon className={`w-4 h-4 ${provider.color}`} />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-medium text-white text-sm">{provider.name}</h4>
                  <p className="text-xs text-gray-400">{provider.description}</p>
                </div>
                {isSelected ? (
                  <span className="flex items-center gap-1.5 text-xs text-indigo-300">
                    Selected for setup
                    <Check className="w-4 h-4 text-indigo-400" />
                  </span>
                ) : (
                  <Plus className="w-4 h-4 text-gray-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selection Summary */}
      {selectedProviders.length > 0 && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-indigo-400" />
            <span className="text-indigo-300 font-medium">
              {selectedProviders.length} source{selectedProviders.length > 1 ? 's' : ''} selected
              for setup
            </span>
          </div>
          <p className="text-indigo-300/70 text-sm mt-1">
            Nothing is connected yet. After setup, the St. Raphael health hub walks you through
            each provider's secure sign-in.
          </p>
        </div>
      )}

      {/* Info Note */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-8">
        <p className="text-indigo-300 text-sm">
          <strong>Privacy Note:</strong> Selecting a source only saves your preference. No health
          data flows until you approve the secure connection, and you can change your choices at
          any time in settings.
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
          onClick={handleContinue}
          disabled={saving}
          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {selectedProviders.length > 0 ? 'Continue' : 'Skip for now'}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
