import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Activity, ArrowRight, Check, Heart, Smartphone, Watch } from 'lucide-react';

interface ServiceOption {
  id: string;
  name: string;
  providerKey: string;
  icon: React.ReactNode;
  description: string;
  requiresOAuth: boolean;
  status: 'live' | 'planned';
}

const serviceOptions: ServiceOption[] = [
  {
    id: 'apple-health',
    name: 'Apple Health',
    providerKey: 'apple_health',
    icon: <Heart className="h-8 w-8" />,
    description: 'Sync data from Apple Health on iPhone and Apple Watch.',
    requiresOAuth: true,
    status: 'live',
  },
  {
    id: 'android-health-connect',
    name: 'Android Health Connect',
    providerKey: 'android_health_connect',
    icon: <Activity className="h-8 w-8" />,
    description: 'Connect Android Health Connect for supported wearable and wellness data.',
    requiresOAuth: true,
    status: 'live',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    providerKey: 'fitbit',
    icon: <Watch className="h-8 w-8" />,
    description: 'Import activity, cardio, and sleep data from Fitbit devices.',
    requiresOAuth: true,
    status: 'live',
  },
  {
    id: 'manual',
    name: 'Manual Entry',
    providerKey: 'manual',
    icon: <Smartphone className="h-8 w-8" />,
    description: 'Track health metrics manually when no live connector is required.',
    requiresOAuth: false,
    status: 'live',
  },
];

interface ConnectionSetupWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export default function ConnectionSetupWizard({ onComplete, onCancel }: ConnectionSetupWizardProps) {
  const { user, isDemoMode } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleServiceSelect(service: ServiceOption) {
    setSelectedService(service);
    setStep(2);
  }

  async function handleConnect() {
    if (!selectedService) return;

    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured for health connections.');
      }
      if (!user || isDemoMode) {
        throw new Error('A real signed-in account is required to connect live health services.');
      }

      if (selectedService.status !== 'live') {
        throw new Error(`${selectedService.name} is still planned and cannot be connected yet.`);
      }

      if (selectedService.requiresOAuth) {
        const { data, error: invokeError } = await supabase.functions.invoke('health-oauth-initiate', {
          body: { provider_key: selectedService.providerKey },
        });

        if (invokeError) {
          throw invokeError;
        }

        if (!data?.authorization_url) {
          throw new Error('The health connector did not return an authorization URL.');
        }

        window.location.href = data.authorization_url;
        return;
      }

      const { error: insertError } = await supabase
        .from('health_connections')
        .insert({
          user_id: user.id,
          provider: selectedService.providerKey,
          service_name: selectedService.name,
          service_type: selectedService.providerKey,
          status: 'connected',
        });

      if (insertError) throw insertError;

      setStep(3);
      window.setTimeout(() => {
        onComplete?.();
      }, 1500);
    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect service');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-lg">
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Connect Health Service</h2>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-purple-300 transition-colors hover:text-white"
            >
              Cancel
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {[1, 2, 3].map((value) => (
            <div
              key={value}
              className={`h-2 flex-1 rounded-full transition-colors ${
                value <= step ? 'bg-purple-500' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div>
          <p className="mb-6 text-purple-200">
            Choose a health service to connect. Only live connectors below can start a real authorization flow.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {serviceOptions.map((service) => (
              <button
                key={service.id}
                onClick={() => handleServiceSelect(service)}
                className="group rounded-xl border border-white/10 bg-white/5 p-6 text-left transition-all hover:border-purple-500/50 hover:bg-white/10"
              >
                <div className="flex items-start space-x-4">
                  <div className="text-purple-400 transition-colors group-hover:text-purple-300">
                    {service.icon}
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-semibold text-white">{service.name}</h3>
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                        {service.status}
                      </span>
                    </div>
                    <p className="text-sm text-purple-300">{service.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-purple-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && selectedService && (
        <div>
          <div className="mb-8 text-center">
            <div className="mb-4 inline-block rounded-full bg-purple-500/20 p-4">
              <div className="text-purple-300">{selectedService.icon}</div>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">{selectedService.name}</h3>
            <p className="text-purple-200">{selectedService.description}</p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div className="mb-8 space-y-4">
            <div className="rounded-lg bg-white/5 p-4">
              <h4 className="mb-2 font-medium text-white">What data will be synced?</h4>
              <ul className="space-y-1 text-sm text-purple-200">
                <li>- Activity metrics such as steps, calories, and movement.</li>
                <li>- Heart rate and recovery signals when the connector supports them.</li>
                <li>- Sleep and readiness metrics from supported devices.</li>
                <li>- Manual entry remains available when no device connector is required.</li>
              </ul>
            </div>

            <div className="rounded-lg bg-white/5 p-4">
              <h4 className="mb-2 font-medium text-white">Privacy and Security</h4>
              <p className="text-sm text-purple-200">
                Live connections use the canonical Supabase OAuth initiation flow. No placeholder OAuth URLs or localhost-only backends are used here.
              </p>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg bg-white/10 py-3 text-white transition-colors hover:bg-white/20"
            >
              Back
            </button>
            <button
              onClick={() => void handleConnect()}
              disabled={loading}
              className="flex-1 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 py-3 font-medium text-white transition-all hover:from-purple-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Connecting...' : selectedService.requiresOAuth ? 'Authorize Connection' : 'Connect'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="py-8 text-center">
          <div className="mb-4 inline-block rounded-full bg-green-500/20 p-4">
            <Check className="h-12 w-12 text-green-400" />
          </div>
          <h3 className="mb-2 text-2xl font-bold text-white">Successfully Connected</h3>
          <p className="text-purple-200">
            Your {selectedService?.name} account is now connected and ready to sync.
          </p>
        </div>
      )}
    </div>
  );
}
