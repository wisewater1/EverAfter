import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function OAuthCallback() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing OAuth callback...');

  useEffect(() => {
    if (user) {
      handleOAuthCallback();
    }
  }, [user]);

  const handleOAuthCallback = async () => {
    try {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const serviceName = searchParams.get('service') || 'Unknown Service';

      if (error) {
        throw new Error(`OAuth error: ${error}`);
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      const stateData = state ? JSON.parse(atob(state)) : {};
      const serviceType = stateData.serviceType || 'manual';

      const { data: connectionData, error: connectionError } = await supabase
        .from('health_connections')
        .insert({
          user_id: user?.id,
          service_name: serviceName,
          service_type: serviceType,
          status: 'connected',
          last_sync_at: new Date().toISOString()
        })
        .select()
        .single();

      if (connectionError) throw connectionError;

      const { error: credentialsError } = await supabase
        .from('oauth_credentials')
        .insert({
          user_id: user?.id,
          service_name: serviceName,
          access_token: code,
          is_active: true
        });

      if (credentialsError) throw credentialsError;

      setStatus('success');
      setMessage(`Successfully connected to ${serviceName}!`);

      setTimeout(() => {
        navigate('/health-dashboard');
      }, 2000);
    } catch (error) {
      console.error('OAuth callback error:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to complete OAuth connection');

      setTimeout(() => {
        navigate('/health-dashboard');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center">
          {status === 'processing' && (
            <>
              <Loader className="w-16 h-16 text-purple-400 animate-spin mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Processing Connection</h1>
              <p className="text-purple-200">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Connection Successful!</h1>
              <p className="text-purple-200 mb-4">{message}</p>
              <p className="text-sm text-purple-300">Redirecting to Health Dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Connection Failed</h1>
              <p className="text-purple-200 mb-4">{message}</p>
              <p className="text-sm text-purple-300">Redirecting to Health Dashboard...</p>
            </>
          )}

          <button
            onClick={() => navigate('/health-dashboard')}
            className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Go to Health Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
