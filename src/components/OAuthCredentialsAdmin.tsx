import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Key, Eye, EyeOff, Trash2, Plus, Shield } from 'lucide-react';

interface OAuthCredential {
  id: string;
  service_name: string;
  client_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function OAuthCredentialsAdmin() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<OAuthCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTokens, setShowTokens] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (user) {
      fetchCredentials();
    }
  }, [user]);

  const fetchCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('oauth_credentials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setCredentials(data);
    } catch (error) {
      console.error('Error fetching credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTokenVisibility = (credentialId: string) => {
    setShowTokens(prev => ({
      ...prev,
      [credentialId]: !prev[credentialId]
    }));
  };

  const deleteCredential = async (credentialId: string) => {
    if (!confirm('Are you sure you want to delete these credentials? This will disconnect the service.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('oauth_credentials')
        .delete()
        .eq('id', credentialId);

      if (error) throw error;
      await fetchCredentials();
    } catch (error) {
      console.error('Error deleting credential:', error);
    }
  };

  const toggleActiveStatus = async (credentialId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('oauth_credentials')
        .update({ is_active: !currentStatus })
        .eq('id', credentialId);

      if (error) throw error;
      await fetchCredentials();
    } catch (error) {
      console.error('Error updating credential status:', error);
    }
  };

  const maskToken = (token: string | null, show: boolean) => {
    if (!token) return 'Not set';
    if (show) return token;
    return token.substring(0, 8) + '••••••••' + token.substring(token.length - 4);
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return 'No expiry';
    const date = new Date(expiresAt);
    const now = new Date();
    const isExpired = date < now;

    return (
      <span className={isExpired ? 'text-red-400' : 'text-green-400'}>
        {isExpired ? 'Expired' : 'Valid'} - {date.toLocaleDateString()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="text-white">Loading credentials...</div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">OAuth Credentials</h2>
        </div>
        <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Credential</span>
        </button>
      </div>

      <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-300 text-sm flex items-center space-x-2">
          <Shield className="w-4 h-4" />
          <span>
            OAuth credentials are sensitive. Never share these tokens with anyone or expose them in public repositories.
          </span>
        </p>
      </div>

      {credentials.length === 0 ? (
        <div className="text-center py-12">
          <Key className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-50" />
          <p className="text-purple-200 mb-4">No OAuth credentials configured</p>
          <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all font-medium">
            Add Your First Credential
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {credentials.map((credential) => (
            <div
              key={credential.id}
              className="p-6 bg-white/5 rounded-xl border border-white/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">{credential.service_name}</h3>
                  <p className="text-purple-300 text-sm">
                    Created {new Date(credential.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleActiveStatus(credential.id, credential.is_active)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      credential.is_active
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {credential.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => deleteCredential(credential.id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {credential.client_id && (
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-purple-300 text-xs mb-1">Client ID</p>
                      <p className="text-white text-sm font-mono">{credential.client_id}</p>
                    </div>
                  </div>
                )}

                {credential.access_token && (
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex-1">
                      <p className="text-purple-300 text-xs mb-1">Access Token</p>
                      <p className="text-white text-sm font-mono break-all">
                        {maskToken(credential.access_token, showTokens[credential.id])}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleTokenVisibility(credential.id)}
                      className="ml-3 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      {showTokens[credential.id] ? (
                        <EyeOff className="w-4 h-4 text-purple-300" />
                      ) : (
                        <Eye className="w-4 h-4 text-purple-300" />
                      )}
                    </button>
                  </div>
                )}

                {credential.refresh_token && (
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex-1">
                      <p className="text-purple-300 text-xs mb-1">Refresh Token</p>
                      <p className="text-white text-sm font-mono break-all">
                        {maskToken(credential.refresh_token, showTokens[credential.id])}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-purple-300 text-xs mb-1">Token Expiry</p>
                    <p className="text-white text-sm">{formatExpiry(credential.token_expires_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
