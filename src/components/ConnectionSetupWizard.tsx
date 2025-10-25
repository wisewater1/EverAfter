import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Heart, Activity, Watch, Smartphone, ArrowRight, Check } from 'lucide-react';

interface ServiceOption {
  id: string;
  name: string;
  type: string;
  icon: React.ReactNode;
  description: string;
  requiresOAuth: boolean;
}

const serviceOptions: ServiceOption[] = [
  {
    id: 'apple-health',
    name: 'Apple Health',
    type: 'apple_health',
    icon: <Heart className="w-8 h-8" />,
    description: 'Sync data from Apple Health app on iOS devices',
    requiresOAuth: true
  },
  {
    id: 'google-fit',
    name: 'Google Fit',
    type: 'google_fit',
    icon: <Activity className="w-8 h-8" />,
    description: 'Connect to Google Fit for Android health data',
    requiresOAuth: true
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    type: 'fitbit',
    icon: <Watch className="w-8 h-8" />,
    description: 'Import activity and health data from Fitbit devices',
    requiresOAuth: true
  },
  {
    id: 'manual',
    name: 'Manual Entry',
    type: 'manual',
    icon: <Smartphone className="w-8 h-8" />,
    description: 'Manually track your health metrics',
    requiresOAuth: false
  }
];

interface ConnectionSetupWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export default function ConnectionSetupWizard({ onComplete, onCancel }: ConnectionSetupWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleServiceSelect = (service: ServiceOption) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleConnect = async () => {
    if (!selectedService || !user) return;

    setLoading(true);
    setError(null);

    try {
      if (selectedService.requiresOAuth) {
        const state = btoa(JSON.stringify({
          userId: user.id,
          serviceType: selectedService.type
        }));

        const redirectUri = `${window.location.origin}/oauth/callback`;
        const oauthUrl = `https://oauth-provider.example.com/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=${redirectUri}&state=${state}&service=${selectedService.name}`;

        window.location.href = oauthUrl;
      } else {
        const { error: insertError } = await supabase
          .from('health_connections')
          .insert({
            user_id: user.id,
            service_name: selectedService.name,
            service_type: selectedService.type,
            status: 'connected'
          });

        if (insertError) throw insertError;

        setStep(3);
        setTimeout(() => {
          onComplete?.();
        }, 1500);
      }
    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Connect Health Service</h2>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-purple-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-purple-500' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div>
          <p className="text-purple-200 mb-6">
            Choose a health service to connect and start tracking your health data automatically.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {serviceOptions.map((service) => (
              <button
                key={service.id}
                onClick={() => handleServiceSelect(service)}
                className="p-6 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-purple-500/50 transition-all text-left group"
              >
                <div className="flex items-start space-x-4">
                  <div className="text-purple-400 group-hover:text-purple-300 transition-colors">
                    {service.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">{service.name}</h3>
                    <p className="text-purple-300 text-sm">{service.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && selectedService && (
        <div>
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-purple-500/20 rounded-full mb-4">
              <div className="text-purple-300">{selectedService.icon}</div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{selectedService.name}</h3>
            <p className="text-purple-200">{selectedService.description}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4 mb-8">
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="text-white font-medium mb-2">What data will be synced?</h4>
              <ul className="space-y-1 text-purple-200 text-sm">
                <li>• Activity metrics (steps, distance, calories)</li>
                <li>• Heart rate and cardiovascular data</li>
                <li>• Sleep patterns and quality</li>
                <li>• Weight and body measurements</li>
              </ul>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="text-white font-medium mb-2">Privacy & Security</h4>
              <p className="text-purple-200 text-sm">
                Your health data is encrypted and only accessible by you. We never share your
                personal health information with third parties.
              </p>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connecting...' : selectedService.requiresOAuth ? 'Authorize Connection' : 'Connect'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="text-center py-8">
          <div className="inline-block p-4 bg-green-500/20 rounded-full mb-4">
            <Check className="w-12 h-12 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Successfully Connected!</h3>
          <p className="text-purple-200">
            Your {selectedService?.name} account is now connected and syncing.
          </p>
        </div>
      )}
    </div>
  );
}
