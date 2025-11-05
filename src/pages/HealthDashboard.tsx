import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Heart, BarChart3, Target, Users, Bell, ArrowLeft, TrendingUp, FolderOpen, Link2, Cpu, Brain, Stethoscope, LayoutGrid } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useConnections } from '../contexts/ConnectionsContext';
import { useAuth } from '../contexts/AuthContext';
import { getTodayOverview } from '../lib/raphael/monitors';
import type { TodayOverview } from '../lib/raphael/monitors';
import Today from '../components/raphael/Today';
import RaphaelInsights from '../components/RaphaelInsights';
import RaphaelInsightsPanel from '../components/RaphaelInsightsPanel';
import RaphaelChat from '../components/RaphaelChat';
import HealthAnalytics from '../components/HealthAnalytics';
import MedicationTracker from '../components/MedicationTracker';
import HealthGoals from '../components/HealthGoals';
import EmergencyContacts from '../components/EmergencyContacts';
import HealthReportGenerator from '../components/HealthReportGenerator';
import HealthConnectionManager from '../components/HealthConnectionManager';
import FileManager from '../components/FileManager';
import ConnectionRotationConfig from '../components/ConnectionRotationConfig';
import ConnectionRotationMonitor from '../components/ConnectionRotationMonitor';
import DeviceMonitorDashboard from '../components/DeviceMonitorDashboard';
import PredictiveHealthInsights from '../components/PredictiveHealthInsights';
import HeartDeviceRecommendations from '../components/HeartDeviceRecommendations';
import ComprehensiveAnalyticsDashboard from '../components/ComprehensiveAnalyticsDashboard';
import ScrollIndicator from '../components/ScrollIndicator';

type TabView = 'overview' | 'medications' | 'goals' | 'contacts' | 'chat' | 'connections' | 'files' | 'devices-analytics' | 'predictions';

export default function HealthDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { openConnectionsPanel, getActiveConnectionsCount } = useConnections();
  const [activeTab, setActiveTab] = useState<TabView>('overview');
  const [raphaelEngramId, setRaphaelEngramId] = useState<string>('');
  const [todayData, setTodayData] = useState<TodayOverview | null>(null);
  const [loadingToday, setLoadingToday] = useState(true);

  const activeConnectionsCount = getActiveConnectionsCount();

  // Handle deep links from legacy routes (PRESERVES OLD ROUTES)
  useEffect(() => {
    const hash = location.hash.slice(1); // Remove # prefix
    if (hash === 'emergency') {
      setActiveTab('goals'); // Show goals tab with emergency section
    } else if (hash === 'documents' || hash === 'files') {
      setActiveTab('medications'); // Show medications tab with documents
    }
  }, [location.hash]);

  useEffect(() => {
    // Fetch St. Raphael engram ID
    async function fetchRaphaelEngram() {
      const { data } = await supabase
        .from('engrams')
        .select('id')
        .eq('name', 'St. Raphael')
        .limit(1)
        .single();

      if (data) {
        setRaphaelEngramId(data.id);
      }
    }
    fetchRaphaelEngram();
  }, []);

  useEffect(() => {
    async function loadTodayData() {
      if (!user?.id) return;

      setLoadingToday(true);
      try {
        const data = await getTodayOverview(user.id);
        setTodayData(data);
      } catch (error) {
        console.error('Error loading today data:', error);
      } finally {
        setLoadingToday(false);
      }
    }

    loadTodayData();
  }, [user?.id]);

  // NAVIGATION REFACTOR: Connections first, Emergency merged into Goals, Files merged into Medications
  const tabs = [
    { id: 'overview' as TabView, label: 'Overview', icon: Activity },
    { id: 'connections' as TabView, label: 'Connections', icon: Link2 }, // MOVED TO SECOND POSITION
    { id: 'devices-analytics' as TabView, label: 'Devices & Analytics', icon: LayoutGrid },
    { id: 'predictions' as TabView, label: 'Predictions', icon: Brain },
    { id: 'medications' as TabView, label: 'Medications', icon: Heart }, // NOW INCLUDES FILES AS DOCUMENTS
    { id: 'goals' as TabView, label: 'Goals', icon: Target }, // NOW INCLUDES EMERGENCY AS SUB-SECTION
    { id: 'chat' as TabView, label: 'Raphael AI', icon: Bell },
    // Legacy tabs removed: 'files', 'contacts' - content merged into medications and goals
  ];

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0f] relative flex flex-col">
      {/* Ambient glow background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative flex-1 overflow-y-auto max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full safe-bottom">
        {/* Header - Dark Neumorphic Card */}
        <div className="flex items-center justify-between mb-8 p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Health Monitor</h1>
            <p className="text-slate-400 text-sm">Comprehensive health tracking powered by St. Raphael AI</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => openConnectionsPanel('health')}
              className="relative px-3 sm:px-5 py-3 rounded-xl sm:rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 hover:border-cyan-400/50 text-white transition-all duration-300 flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/30 hover:bg-slate-900/60 group overflow-hidden whitespace-nowrap"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal-600/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Link2 className="w-4 h-4 relative z-10 text-cyan-400 group-hover:text-cyan-300 group-hover:rotate-12 transition-transform flex-shrink-0" />
              <span className="hidden sm:inline font-medium relative z-10 text-sm">Connections</span>
              {activeConnectionsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center font-bold z-20 shadow-lg shadow-emerald-500/50">
                  {activeConnectionsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="relative px-3 sm:px-5 py-3 rounded-xl sm:rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-600/30 hover:border-slate-500/50 text-slate-300 hover:text-white transition-all duration-300 flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-slate-900/20 hover:shadow-slate-700/30 hover:bg-slate-900/60 group overflow-hidden whitespace-nowrap"
            >
              <div className="absolute inset-0 bg-slate-800/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <ArrowLeft className="w-4 h-4 relative z-10 flex-shrink-0" />
              <span className="font-medium relative z-10 text-sm">Back</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation - Premium Dark Glass UI */}
        <div className="mb-6 p-2 rounded-[28px] bg-gradient-to-br from-[#0d0d12]/95 via-[#13131a]/95 to-[#0d0d12]/95 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.03),inset_0_-1px_1px_rgba(0,0,0,0.5)] border border-white/[0.03] relative overflow-hidden">
          {/* Subtle shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]"></div>

          {/* Inner glass container */}
          <div className="relative rounded-[24px] bg-gradient-to-br from-[#151520]/40 to-[#0a0a0f]/60 backdrop-blur-xl border border-white/[0.02] shadow-[inset_0_1px_2px_rgba(255,255,255,0.03)]">
            <ScrollIndicator>
              <div className="flex gap-1.5 min-w-min p-1.5">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-shrink-0 px-6 py-3.5 rounded-[18px] font-medium transition-all duration-500 flex items-center gap-2.5 min-h-[48px] whitespace-nowrap relative group overflow-hidden ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-br from-teal-500/15 via-cyan-500/10 to-teal-600/15 text-teal-200 shadow-[inset_0_2px_12px_rgba(0,0,0,0.6),inset_0_-1px_4px_rgba(20,184,166,0.15),0_4px_16px_rgba(20,184,166,0.08)] border border-teal-400/20 backdrop-blur-2xl'
                          : 'text-slate-400 hover:text-slate-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4),0_1px_3px_rgba(0,0,0,0.3)] border border-white/[0.02] hover:border-white/[0.06] hover:bg-gradient-to-br hover:from-white/[0.03] hover:to-white/[0.01]'
                      }`}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      aria-controls={`${tab.id}-panel`}
                    >
                      {/* Active tab glow background */}
                      {activeTab === tab.id && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-teal-400/5 via-cyan-400/5 to-teal-500/5 rounded-[18px] blur-md"></div>
                          <div className="absolute inset-0 bg-gradient-to-t from-teal-500/10 to-transparent rounded-[18px]"></div>
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-teal-400/40 to-transparent"></div>
                        </>
                      )}

                      {/* Icon with enhanced animation */}
                      <Icon className={`w-4.5 h-4.5 relative z-10 transition-all duration-500 ${
                        activeTab === tab.id
                          ? 'scale-110 drop-shadow-[0_0_8px_rgba(20,184,166,0.4)]'
                          : 'group-hover:scale-105 opacity-70 group-hover:opacity-100'
                      }`} />

                      {/* Label */}
                      <span className={`text-sm relative z-10 font-semibold transition-all duration-500 ${
                        activeTab === tab.id ? 'tracking-wide' : 'tracking-normal'
                      }`}>
                        {tab.label}
                      </span>

                      {/* Hover glow effect for inactive tabs */}
                      {activeTab !== tab.id && (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-white/[0.01] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[18px]"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollIndicator>
          </div>

          {/* Bottom subtle highlight */}
          <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"></div>
        </div>

        {/* Shimmer animation keyframes */}
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>

        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div id="overview-panel" role="tabpanel" aria-labelledby="overview-tab" className="space-y-6">
              {loadingToday ? (
                <div className="glass-card p-8">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
                    <p className="text-slate-400">Loading today's overview...</p>
                  </div>
                </div>
              ) : todayData ? (
                <Today data={todayData} />
              ) : null}

              <RaphaelInsights />
              <HealthReportGenerator />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveTab('medications')}
                      className="w-full px-4 py-3 bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded-lg transition-all flex items-center gap-3 text-left"
                    >
                      <Heart className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Track Medication</p>
                        <p className="text-xs text-green-400/70">Log your daily medications</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('goals')}
                      className="w-full px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-all flex items-center gap-3 text-left"
                    >
                      <Target className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Set Health Goal</p>
                        <p className="text-xs text-blue-400/70">Create a new health objective</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('chat')}
                      className="w-full px-4 py-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition-all flex items-center gap-3 text-left"
                    >
                      <Bell className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Ask Raphael</p>
                        <p className="text-xs text-purple-400/70">Get health guidance from AI</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <h2 className="text-xl font-semibold text-white mb-4">Health Tips</h2>
                  <div className="space-y-4">
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-purple-300 text-sm font-medium mb-1">Stay Hydrated</p>
                      <p className="text-purple-200 text-xs">Drink at least 8 glasses of water daily for optimal health.</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-purple-300 text-sm font-medium mb-1">Regular Exercise</p>
                      <p className="text-purple-200 text-xs">Aim for 150 minutes of moderate activity per week.</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-purple-300 text-sm font-medium mb-1">Quality Sleep</p>
                      <p className="text-purple-200 text-xs">Get 7-9 hours of sleep each night for recovery.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'devices-analytics' && (
            <div className="space-y-6">
              <DeviceMonitorDashboard />
              <ConnectionRotationConfig />
              <ConnectionRotationMonitor />
              <ComprehensiveAnalyticsDashboard />
            </div>
          )}
          {activeTab === 'predictions' && (
            <div className="space-y-6">
              <PredictiveHealthInsights />
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <RaphaelInsightsPanel engramId={raphaelEngramId} />
              </div>
              <HealthAnalytics />
            </div>
          )}
          {activeTab === 'medications' && (
            <div className="space-y-6">
              <HeartDeviceRecommendations />
              <MedicationTracker />
              {/* Documents Section - Merged from Files */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-6">
                  <FolderOpen className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h2 className="text-2xl font-semibold text-white">Documents</h2>
                    <p className="text-sm text-slate-400">Medical records, prescriptions, and health documents</p>
                  </div>
                </div>
                <FileManager />
              </div>
            </div>
          )}
          {activeTab === 'goals' && (
            <div className="space-y-6">
              <HealthGoals />
              {/* Emergency Actions Section - Merged from Emergency */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-6 h-6 text-rose-400" />
                  <div>
                    <h2 className="text-2xl font-semibold text-white">Emergency Actions</h2>
                    <p className="text-sm text-slate-400">Emergency contacts and critical health information</p>
                  </div>
                </div>
                <EmergencyContacts />
              </div>
            </div>
          )}
          {activeTab === 'connections' && <HealthConnectionManager />}
          {activeTab === 'chat' && <RaphaelChat />}
          {/* Legacy tab handlers preserved for direct state changes */}
          {activeTab === 'files' && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
              <p className="text-amber-300 text-center">Files have been merged into Medications → Documents. Redirecting...</p>
              {setTimeout(() => setActiveTab('medications'), 1500)}
            </div>
          )}
          {activeTab === 'contacts' && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
              <p className="text-amber-300 text-center">Emergency has been merged into Goals → Emergency Actions. Redirecting...</p>
              {setTimeout(() => setActiveTab('goals'), 1500)}
            </div>
          )}
        </div>

        {/* Scroll sentinel for testing */}
        <div id="scroll-end" className="h-1 w-1 opacity-0 pointer-events-none" aria-hidden="true"></div>
      </div>
    </div>
  );
}
