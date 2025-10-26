import React, { useState } from 'react';
import { X, Link2, Activity, CheckCircle, XCircle, RefreshCw, Loader, AlertCircle, Sparkles } from 'lucide-react';
import { useConnections } from '../contexts/ConnectionsContext';
import RaphaelConnectors from './RaphaelConnectors';

export default function ConnectionsPanel() {
  const { isPanelOpen, closeConnectionsPanel, activeCategory, connections, getActiveConnectionsCount } = useConnections();
  const [view, setView] = useState<'overview' | 'health' | 'all'>('overview');

  if (!isPanelOpen) return null;

  const activeCount = getActiveConnectionsCount();
  const healthConnections = connections.filter(c =>
    ['fitbit', 'oura', 'terra', 'dexcom', 'garmin', 'whoop', 'withings', 'polar'].includes(c.provider)
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40"
        onClick={closeConnectionsPanel}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[600px] lg:w-[700px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 p-4 sm:p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <Link2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Connections</h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  {activeCount} active connection{activeCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={closeConnectionsPanel}
              className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* View Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setView('overview')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                view === 'overview'
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setView('health')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                view === 'health'
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              Health Devices
              {healthConnections.filter(c => c.status === 'active').length > 0 && (
                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs rounded">
                  {healthConnections.filter(c => c.status === 'active').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setView('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                view === 'all'
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              All Connections
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {view === 'overview' && (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{activeCount}</div>
                  <div className="text-xs text-emerald-300">Active</div>
                </div>

                <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {healthConnections.filter(c => c.status === 'active').length}
                  </div>
                  <div className="text-xs text-blue-300">Health</div>
                </div>

                <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/20 rounded-xl p-4 col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between mb-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{connections.length}</div>
                  <div className="text-xs text-purple-300">Total Setup</div>
                </div>
              </div>

              {/* Context Message */}
              {activeCategory && (
                <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-blue-300 font-medium text-sm mb-1">Contextual View</p>
                      <p className="text-blue-200 text-xs">
                        Showing connections relevant to the current tab. Switch to "All Connections" to see everything.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Access */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Quick Access</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setView('health')}
                    className="w-full p-4 bg-gradient-to-r from-teal-900/20 to-cyan-900/20 hover:from-teal-900/30 hover:to-cyan-900/30 border border-teal-500/20 hover:border-teal-500/30 rounded-xl transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-lg flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">Health Devices</p>
                        <p className="text-xs text-slate-400">Wearables, CGM, fitness trackers</p>
                      </div>
                    </div>
                    <div className="text-teal-300 group-hover:translate-x-1 transition-transform">→</div>
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              {connections.slice(0, 3).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Connections</h3>
                  <div className="space-y-2">
                    {connections.slice(0, 3).map((connection) => (
                      <div
                        key={connection.id}
                        className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            connection.status === 'active' ? 'bg-emerald-400' : 'bg-slate-600'
                          }`} />
                          <div>
                            <p className="text-white text-sm font-medium capitalize">{connection.provider}</p>
                            <p className="text-xs text-slate-400">
                              {connection.last_sync_at
                                ? `Synced ${new Date(connection.last_sync_at).toLocaleString()}`
                                : 'Never synced'
                              }
                            </p>
                          </div>
                        </div>
                        {connection.status === 'active' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {view === 'health' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-teal-900/20 to-cyan-900/20 border border-teal-500/20 rounded-xl p-4">
                <h3 className="text-white font-medium mb-2">Health Device Connections</h3>
                <p className="text-sm text-slate-300">
                  Connect your wearables, CGM devices, and fitness trackers to sync health data automatically.
                </p>
              </div>
              <RaphaelConnectors />
            </div>
          )}

          {view === 'all' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/20 rounded-xl p-4">
                <h3 className="text-white font-medium mb-2">All Connections</h3>
                <p className="text-sm text-slate-300">
                  Manage all your connected services and data sources in one place.
                </p>
              </div>

              {connections.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Link2 className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No connections yet</h3>
                  <p className="text-sm text-slate-400">Connect your first service to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {connections.map((connection) => (
                    <div
                      key={connection.id}
                      className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${
                            connection.status === 'active'
                              ? 'bg-gradient-to-br from-emerald-600 to-teal-600'
                              : 'bg-slate-700'
                          } rounded-lg flex items-center justify-center`}>
                            <Link2 className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="text-white font-medium capitalize">{connection.provider}</h4>
                            <p className="text-xs text-slate-400">
                              Added {new Date(connection.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          connection.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : 'bg-slate-700 text-slate-400'
                        }`}>
                          {connection.status}
                        </div>
                      </div>
                      {connection.last_sync_at && (
                        <p className="text-xs text-slate-500">
                          Last synced: {new Date(connection.last_sync_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
