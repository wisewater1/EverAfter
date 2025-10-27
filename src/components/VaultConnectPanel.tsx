/**
 * Vault Connect Panel Component
 *
 * A complete UI for managing secure connections with legacy partners.
 * Provides partner discovery, connection management, and data sharing controls.
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Link2,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Settings,
  FileText,
  Lock,
  Unlock,
  Trash2,
  PauseCircle,
  PlayCircle,
  ExternalLink,
} from 'lucide-react';
import {
  VaultConnectAPI,
  Partner,
  Connection,
  ConnectionRequest,
  getPartnerCategories,
  getConnectionStatusInfo,
  ValidationError,
  ConnectionExistsError,
  PartnerNotFoundError,
} from '../lib/vault-connect-api';

interface VaultConnectPanelProps {
  userId: string;
}

export default function VaultConnectPanel({ userId }: VaultConnectPanelProps) {
  const [api] = useState(() => new VaultConnectAPI(userId));
  const [activeTab, setActiveTab] = useState<'discover' | 'connections'>('discover');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load partners
  useEffect(() => {
    loadPartners();
  }, [selectedCategory]);

  // Load connections
  useEffect(() => {
    loadConnections();
  }, []);

  const loadPartners = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = selectedCategory === 'all'
        ? await api.getAvailablePartners()
        : await api.getAvailablePartners(selectedCategory as any);
      setPartners(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  const loadConnections = async () => {
    try {
      const data = await api.getConnections();
      setConnections(data);
    } catch (err) {
      console.error('Failed to load connections:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadPartners();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.searchPartners(searchTerm);
      setPartners(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (partnerId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const request: ConnectionRequest = {
        partner_id: partnerId,
        data_sharing_level: 'standard',
        permissions: ['read_engrams', 'read_profile'],
        expiry_days: 365,
      };
      await api.createConnection(request);
      setSuccess('Connection request created successfully!');
      await loadConnections();
      setActiveTab('connections');
    } catch (err) {
      if (err instanceof ConnectionExistsError) {
        setError('You already have a connection with this partner');
      } else if (err instanceof ValidationError) {
        setError('Invalid connection request');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create connection');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (connectionId: string) => {
    try {
      await api.activateConnection(connectionId);
      setSuccess('Connection activated successfully!');
      await loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate connection');
    }
  };

  const handleSuspend = async (connectionId: string) => {
    try {
      await api.suspendConnection(connectionId);
      setSuccess('Connection suspended');
      await loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suspend connection');
    }
  };

  const handleRevoke = async (connectionId: string) => {
    if (!confirm('Are you sure you want to revoke this connection? This action cannot be undone.')) {
      return;
    }
    try {
      await api.revokeConnection(connectionId);
      setSuccess('Connection revoked');
      await loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke connection');
    }
  };

  const getConnectionForPartner = (partnerId: string) => {
    return connections.find(c => c.partner_id === partnerId);
  };

  const categories = getPartnerCategories();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Vault Connect API</h1>
              <p className="text-sm sm:text-base text-slate-400">
                Connect your encrypted Engram and digital will with trusted partners for seamless legacy execution and estate management.
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-slate-700/50">
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-4 py-2.5 text-sm font-medium transition-all relative touch-manipulation ${
                activeTab === 'discover'
                  ? 'text-amber-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Discover Partners
              </div>
              {activeTab === 'discover' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('connections')}
              className={`px-4 py-2.5 text-sm font-medium transition-all relative touch-manipulation ${
                activeTab === 'connections'
                  ? 'text-amber-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                My Connections
                {connections.length > 0 && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs">
                    {connections.length}
                  </span>
                )}
              </div>
              {activeTab === 'connections' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400"></div>
              )}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <XCircle className="w-5 h-5 text-red-400" />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-400">{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto">
              <XCircle className="w-5 h-5 text-green-400" />
            </button>
          </div>
        )}

        {/* Discover Partners Tab */}
        {activeTab === 'discover' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search partners..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-xl transition-all font-medium shadow-lg"
                >
                  Search
                </button>
              </div>

              {/* Category Filters */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-300'
                  }`}
                >
                  All Partners
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedCategory === cat.value
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-300'
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Partners Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
                <p className="text-slate-400 mt-4">Loading partners...</p>
              </div>
            ) : partners.length === 0 ? (
              <div className="bg-slate-900/30 border border-dashed border-slate-700/50 rounded-xl p-12 text-center">
                <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-400 mb-2">No Partners Found</h3>
                <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {partners.map((partner) => {
                  const connection = getConnectionForPartner(partner.id);
                  const statusInfo = connection ? getConnectionStatusInfo(connection.status) : null;

                  return (
                    <div
                      key={partner.id}
                      className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-xl p-6 hover:border-amber-500/30 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText className="w-6 h-6 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-white font-semibold truncate">{partner.name}</h3>
                            <p className="text-xs text-slate-400 capitalize">{partner.category.replace('_', ' ')}</p>
                          </div>
                        </div>
                        {partner.is_verified && (
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                        )}
                      </div>

                      <p className="text-sm text-slate-400 mb-4 line-clamp-2">{partner.description}</p>

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-amber-400" />
                          <span className="text-sm text-slate-400">Trust Score:</span>
                          <span className="text-sm font-semibold text-amber-400">{partner.trust_score}%</span>
                        </div>
                        {partner.website_url && (
                          <a
                            href={partner.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-amber-400 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      {connection ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                          <span className="text-lg">{statusInfo!.icon}</span>
                          <span className="text-sm text-slate-300">{statusInfo!.label}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConnect(partner.id)}
                          disabled={loading}
                          className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2"
                        >
                          <Link2 className="w-4 h-4" />
                          Connect
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* My Connections Tab */}
        {activeTab === 'connections' && (
          <div className="space-y-6">
            {connections.length === 0 ? (
              <div className="bg-slate-900/30 border border-dashed border-slate-700/50 rounded-xl p-12 text-center">
                <Link2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-400 mb-2">No Connections Yet</h3>
                <p className="text-sm text-slate-500 mb-6">Start by discovering and connecting with trusted partners</p>
                <button
                  onClick={() => setActiveTab('discover')}
                  className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl transition-all font-medium"
                >
                  Discover Partners
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {connections.map((connection) => {
                  const statusInfo = getConnectionStatusInfo(connection.status);
                  return (
                    <div
                      key={connection.id}
                      className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-xl p-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              statusInfo.color === 'green' ? 'bg-green-500/20 text-green-400' :
                              statusInfo.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                              statusInfo.color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {statusInfo.icon} {statusInfo.label}
                            </div>
                            <span className="text-xs text-slate-500">
                              Partner ID: {connection.partner_id.substring(0, 8)}...
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-slate-500">Data Sharing:</span>
                              <span className="text-slate-300 ml-2 capitalize">{connection.data_sharing_level}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Permissions:</span>
                              <span className="text-slate-300 ml-2">{connection.permissions.length} granted</span>
                            </div>
                            {connection.connected_at && (
                              <div>
                                <span className="text-slate-500">Connected:</span>
                                <span className="text-slate-300 ml-2">
                                  {new Date(connection.connected_at).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {connection.expires_at && (
                              <div>
                                <span className="text-slate-500">Expires:</span>
                                <span className="text-slate-300 ml-2">
                                  {new Date(connection.expires_at).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex sm:flex-col gap-2">
                          {connection.status === 'pending' && (
                            <button
                              onClick={() => handleActivate(connection.id)}
                              className="px-3 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-lg transition-all text-sm flex items-center gap-2"
                            >
                              <PlayCircle className="w-4 h-4" />
                              Activate
                            </button>
                          )}
                          {connection.status === 'active' && (
                            <button
                              onClick={() => handleSuspend(connection.id)}
                              className="px-3 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-400 rounded-lg transition-all text-sm flex items-center gap-2"
                            >
                              <PauseCircle className="w-4 h-4" />
                              Suspend
                            </button>
                          )}
                          {connection.status === 'suspended' && (
                            <button
                              onClick={() => handleActivate(connection.id)}
                              className="px-3 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-lg transition-all text-sm flex items-center gap-2"
                            >
                              <PlayCircle className="w-4 h-4" />
                              Resume
                            </button>
                          )}
                          {connection.status !== 'revoked' && (
                            <button
                              onClick={() => handleRevoke(connection.id)}
                              className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg transition-all text-sm flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
