import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X, Loader2, Activity, Heart, Moon, Droplet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ConnectionResult {
  success: boolean;
  provider: string;
  user_id?: string;
  error?: string;
}

export default function TerraCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    processCallback();
  }, []);

  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      navigate('/health/devices');
    }
  }, [status, countdown, navigate]);

  const processCallback = async () => {
    try {
      const provider = searchParams.get('provider');
      const terraUserId = searchParams.get('user_id') || searchParams.get('reference_id');
      const statusParam = searchParams.get('status');
      const error = searchParams.get('error');

      if (error || statusParam === 'error') {
        setResult({
          success: false,
          provider: provider || 'Unknown',
          error: error || 'Connection failed',
        });
        setStatus('error');
        return;
      }

      if (!provider || !terraUserId) {
        setResult({
          success: false,
          provider: provider || 'Unknown',
          error: 'Missing required parameters',
        });
        setStatus('error');
        return;
      }

      const { data: existingConnection } = await supabase
        .from('terra_connections')
        .select('id')
        .eq('user_id', user?.id)
        .eq('provider', provider.toUpperCase())
        .single();

      if (existingConnection) {
        await supabase
          .from('terra_connections')
          .update({
            terra_user_id: terraUserId,
            status: 'connected',
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingConnection.id);
      } else {
        await supabase.from('terra_connections').insert({
          user_id: user?.id,
          provider: provider.toUpperCase(),
          terra_user_id: terraUserId,
          status: 'connected',
          last_sync_at: new Date().toISOString(),
          permissions: {},
          metadata: {},
        });
      }

      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.access_token) {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/terra-backfill`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.session.access_token}`,
            },
            body: JSON.stringify({
              user_id: user?.id,
              provider: provider.toUpperCase(),
              days: 30,
            }),
          }
        );
      }

      setResult({
        success: true,
        provider: provider,
        user_id: terraUserId,
      });
      setStatus('success');
    } catch (error) {
      console.error('Error processing Terra callback:', error);
      setResult({
        success: false,
        provider: searchParams.get('provider') || 'Unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setStatus('error');
    }
  };

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, React.ReactNode> = {
      FITBIT: <Activity className="w-12 h-12" />,
      OURA: <Moon className="w-12 h-12" />,
      GARMIN: <Heart className="w-12 h-12" />,
      DEXCOM: <Droplet className="w-12 h-12" />,
      FREESTYLELIBRE: <Droplet className="w-12 h-12" />,
      WHOOP: <Activity className="w-12 h-12" />,
      WITHINGS: <Activity className="w-12 h-12" />,
    };
    return icons[provider.toUpperCase()] || <Activity className="w-12 h-12" />;
  };

  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      FITBIT: 'Fitbit',
      OURA: 'Oura Ring',
      GARMIN: 'Garmin',
      DEXCOM: 'Dexcom',
      FREESTYLELIBRE: 'FreeStyle Libre',
      WHOOP: 'WHOOP',
      WITHINGS: 'Withings',
      POLAR: 'Polar',
      SUUNTO: 'Suunto',
      PELOTON: 'Peloton',
    };
    return names[provider.toUpperCase()] || provider;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-8">
          {status === 'processing' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Connecting Device
                </h2>
                <p className="text-gray-400">
                  Setting up your connection...
                </p>
              </div>
            </div>
          )}

          {status === 'success' && result && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Successfully Connected!
                </h2>
                <p className="text-gray-400">
                  {getProviderName(result.provider)} is now syncing your health data
                </p>
              </div>

              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="text-blue-400">
                    {getProviderIcon(result.provider)}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-1">Provider</p>
                  <p className="text-lg font-medium text-white">
                    {getProviderName(result.provider)}
                  </p>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  We're fetching your last 30 days of data. This may take a few minutes.
                  You'll see your metrics appear in the dashboard shortly.
                </p>
              </div>

              <div className="text-sm text-gray-400">
                Redirecting in {countdown} seconds...
              </div>

              <button
                onClick={() => navigate('/health/devices')}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700"
              >
                Go to Devices Dashboard
              </button>
            </div>
          )}

          {status === 'error' && result && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto">
                <X className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Connection Failed
                </h2>
                <p className="text-gray-400">
                  Unable to connect {getProviderName(result.provider)}
                </p>
              </div>

              {result.error && (
                <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 text-left">
                  <p className="text-sm font-medium text-red-400 mb-1">Error:</p>
                  <p className="text-sm text-red-300">{result.error}</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => navigate('/health/devices')}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate('/health')}
                  className="w-full py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Having trouble?{' '}
            <a
              href="/support"
              className="text-blue-400 hover:text-blue-300"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
