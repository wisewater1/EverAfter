import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, XCircle, Loader2, Sparkles, Activity } from 'lucide-react';

export default function OAuthCallback() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Securing your connection...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (user) {
      handleOAuthCallback();
    }
  }, [user]);

  useEffect(() => {
    if (status === 'processing') {
      const interval = setInterval(() => {
        setProgress(p => Math.min(p + Math.random() * 15, 90));
      }, 400);
      return () => clearInterval(interval);
    } else if (status === 'success') {
      setProgress(100);
    }
  }, [status]);

  const handleOAuthCallback = async () => {
    try {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const serviceName = searchParams.get('service') || 'Health Provider';

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
      setMessage(`Successfully linked ${serviceName}!`);

      setTimeout(() => {
        navigate('/health-dashboard');
      }, 2500);
    } catch (error) {
      console.error('OAuth callback error:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to synchronize with provider');

      setTimeout(() => {
        navigate('/health-dashboard');
      }, 3500);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0f] relative flex items-center justify-center overflow-hidden px-4">
      {/* Ambient glassmorphic background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] mix-blend-screen animate-[pulse_4s_ease-in-out_infinite]"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="bg-gradient-to-br from-[#151520]/80 to-[#0a0a0f]/90 backdrop-blur-2xl rounded-[32px] p-10 border border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)] text-center transform transition-all duration-700 ease-out">

          {/* Decorative Top Accent */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-teal-500/50 to-transparent"></div>
          <div className="absolute top-0 inset-x-0 h-[2px] blur-sm bg-gradient-to-r from-transparent via-teal-400/30 to-transparent"></div>

          {status === 'processing' && (
            <div className="animate-[fade-in_0.5s_ease-out]">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative w-full h-full rounded-full border border-white/10 bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center shadow-[inset_0_2px_10px_rgba(255,255,255,0.05)]">
                  <Activity className="w-10 h-10 text-teal-400 animate-[pulse_2s_ease-in-out_infinite]" />
                </div>
                {/* Orbital dots */}
                <div className="absolute inset-0 animate-[spin_3s_linear_infinite]">
                  <div className="absolute -top-1 left-1/2 w-2 h-2 bg-teal-400 rounded-full shadow-[0_0_10px_rgba(45,212,191,0.8)]"></div>
                </div>
                <div className="absolute inset-0 animate-[spin_4s_linear_infinite_reverse]">
                  <div className="absolute top-1/2 -right-1 w-1.5 h-1.5 bg-purple-400 rounded-full shadow-[0_0_10px_rgba(192,132,252,0.8)]"></div>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Authenticating</h1>
              <p className="text-teal-200/70 font-medium mb-6 text-sm">{message}</p>

              {/* Premium Progress Bar */}
              <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden mb-2 relative">
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(45,212,191,0.5)]"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-right text-xs text-slate-500 font-medium">{Math.round(progress)}%</div>
            </div>
          )}

          {status === 'success' && (
            <div className="animate-[scale-in_0.6s_spring]">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative w-full h-full rounded-full border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent flex items-center justify-center shadow-[inset_0_2px_15px_rgba(16,185,129,0.2)]">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                </div>
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-emerald-300 animate-[bounce_2s_infinite]" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Connection Complete</h1>
              <p className="text-emerald-200/80 mb-6 font-medium">{message}</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redirecting to health dashboard...</span>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="animate-[shake_0.5s_ease-in-out]">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-xl"></div>
                <div className="relative w-full h-full rounded-full border border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-transparent flex items-center justify-center shadow-[inset_0_2px_15px_rgba(244,63,94,0.2)]">
                  <XCircle className="w-12 h-12 text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Setup Failed</h1>
              <p className="text-rose-200/80 mb-8 font-medium">{message}</p>
              <button
                onClick={() => navigate('/health-dashboard')}
                className="px-8 py-3.5 bg-gradient-to-r from-rose-500/10 to-red-500/10 hover:from-rose-500/20 hover:to-red-500/20 border border-rose-500/30 text-rose-300 font-semibold rounded-xl transition-all duration-300 shadow-lg"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Style blocks for keyframes */}
        <style>{`
          @keyframes fade-in {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes scale-in {
            0% { opacity: 0; transform: scale(0.9); }
            50% { transform: scale(1.05); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-5px); }
            40%, 80% { transform: translateX(5px); }
          }
        `}</style>
      </div>
    </div>
  );
}
