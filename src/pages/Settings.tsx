import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Key, Check, Trash2, Loader, AlertCircle, ExternalLink } from 'lucide-react';

interface ProviderConfig {
  provider: 'openai' | 'groq';
  label: string;
  placeholder: string;
  helpUrl: string;
  helpText: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    provider: 'openai',
    label: 'OpenAI API Key',
    placeholder: 'sk-...',
    helpUrl: 'https://platform.openai.com/api-keys',
    helpText: 'Powers custom engram chat and St. Raphael when the shared key is unavailable.',
  },
  {
    provider: 'groq',
    label: 'Groq API Key',
    placeholder: 'gsk_...',
    helpUrl: 'https://console.groq.com/keys',
    helpText: 'Used by St. Raphael chat for fast responses.',
  },
];

interface SavedKeyState {
  hasKey: boolean;
  maskedKey: string | null;
}

function maskKey(key: string): string {
  if (key.length <= 8) return `${key.slice(0, 2)}...`;
  return `${key.slice(0, 5)}...${key.slice(-4)}`;
}

export default function Settings() {
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Record<string, SavedKeyState>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [clearingProvider, setClearingProvider] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { type: 'success' | 'error'; message: string } | undefined>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadKeys() {
      if (isDemoMode || !supabase || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_provider_credentials')
          .select('provider, api_key')
          .eq('user_id', user.id);

        if (error) throw error;
        if (cancelled) return;

        const next: Record<string, SavedKeyState> = {};
        for (const row of data || []) {
          next[row.provider] = { hasKey: true, maskedKey: maskKey(row.api_key) };
        }
        setSavedKeys(next);
      } catch (err) {
        if (cancelled) return;
        console.warn('Failed to load saved API keys:', err);
        setLoadError('Unable to load your saved API keys right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadKeys();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isDemoMode]);

  const handleSave = async (provider: 'openai' | 'groq') => {
    const value = (inputs[provider] || '').trim();
    if (!value || !user?.id || !supabase) return;

    setSavingProvider(provider);
    setFeedback((prev) => ({ ...prev, [provider]: undefined }));

    try {
      const { error } = await supabase
        .from('user_provider_credentials')
        .upsert(
          { user_id: user.id, provider, api_key: value },
          { onConflict: 'user_id,provider' },
        );

      if (error) throw error;

      setSavedKeys((prev) => ({ ...prev, [provider]: { hasKey: true, maskedKey: maskKey(value) } }));
      setInputs((prev) => ({ ...prev, [provider]: '' }));
      setFeedback((prev) => ({ ...prev, [provider]: { type: 'success', message: 'Saved. This key will be used for your requests from now on.' } }));
    } catch (err) {
      console.warn(`Failed to save ${provider} key:`, err);
      setFeedback((prev) => ({ ...prev, [provider]: { type: 'error', message: 'Could not save this key. Please try again.' } }));
    } finally {
      setSavingProvider(null);
    }
  };

  const handleClear = async (provider: 'openai' | 'groq') => {
    if (!user?.id || !supabase) return;

    setClearingProvider(provider);
    setFeedback((prev) => ({ ...prev, [provider]: undefined }));

    try {
      const { error } = await supabase
        .from('user_provider_credentials')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider);

      if (error) throw error;

      setSavedKeys((prev) => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
      setFeedback((prev) => ({ ...prev, [provider]: { type: 'success', message: 'Removed. Requests will fall back to the shared key, if one is configured.' } }));
    } catch (err) {
      console.warn(`Failed to clear ${provider} key:`, err);
      setFeedback((prev) => ({ ...prev, [provider]: { type: 'error', message: 'Could not remove this key. Please try again.' } }));
    } finally {
      setClearingProvider(null);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">Manage your account and connected services.</p>

        <div className="bg-gray-800/50 sm:backdrop-blur-xl rounded-2xl border border-gray-700 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <Key className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Your Own API Keys</h2>
              <p className="text-sm text-gray-400">Bring your own key so AI chat keeps working even if the shared key is unavailable.</p>
            </div>
          </div>

          {isDemoMode ? (
            <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-200">
              API keys are saved to your account, so this isn't available in demo mode. Sign in with a real account to add your own key.
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm mt-6">
              <Loader className="w-4 h-4 animate-spin" />
              Loading your saved keys...
            </div>
          ) : loadError ? (
            <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {loadError}
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {PROVIDERS.map(({ provider, label, placeholder, helpUrl, helpText }) => {
                const saved = savedKeys[provider];
                const isSaving = savingProvider === provider;
                const isClearing = clearingProvider === provider;
                const providerFeedback = feedback[provider];

                return (
                  <div key={provider} className="p-4 rounded-xl bg-gray-900/50 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-white">{label}</label>
                      <a
                        href={helpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        Get a key
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{helpText}</p>

                    {saved?.hasKey && (
                      <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-sm text-emerald-300 flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          Saved: {saved.maskedKey}
                        </span>
                        <button
                          onClick={() => handleClear(provider)}
                          disabled={isClearing}
                          className="text-xs text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {isClearing ? <Loader className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Remove
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={inputs[provider] || ''}
                        onChange={(e) => setInputs((prev) => ({ ...prev, [provider]: e.target.value }))}
                        placeholder={saved?.hasKey ? 'Enter a new key to replace it' : placeholder}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => handleSave(provider)}
                        disabled={isSaving || !(inputs[provider] || '').trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSaving && <Loader className="w-3.5 h-3.5 animate-spin" />}
                        Save
                      </button>
                    </div>

                    {providerFeedback && (
                      <p className={`text-xs mt-2 ${providerFeedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {providerFeedback.message}
                      </p>
                    )}
                  </div>
                );
              })}

              <p className="text-xs text-gray-500">
                Health device connections (Fitbit, Terra, Dexcom, Oura) work differently: they use a single app-wide
                connection that every account signs into, so there's nothing to enter here for those. If a device
                connection isn't working, that's a configuration step for the app owner, not something fixable from
                this page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
