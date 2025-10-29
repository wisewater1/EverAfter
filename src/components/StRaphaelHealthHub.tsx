import React, { useState } from 'react';
import { Activity, Heart, BarChart3, Target, Users, Bell, TrendingUp, FolderOpen, Link2, Cpu, Brain, Stethoscope, LayoutGrid, Calendar, Pill, FileText, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConnections } from '../contexts/ConnectionsContext';
import RaphaelHealthInterface from './RaphaelHealthInterface';
import RaphaelInsights from './RaphaelInsights';
import RaphaelInsightsPanel from './RaphaelInsightsPanel';
import RaphaelChat from './RaphaelChat';
import HealthAnalytics from './HealthAnalytics';
import MedicationTracker from './MedicationTracker';
import HealthGoals from './HealthGoals';
import EmergencyContacts from './EmergencyContacts';
import HealthReportGenerator from './HealthReportGenerator';
import HealthConnectionManager from './HealthConnectionManager';
import FileManager from './FileManager';
import ConnectionRotationConfig from './ConnectionRotationConfig';
import ConnectionRotationMonitor from './ConnectionRotationMonitor';
import DeviceMonitorDashboard from './DeviceMonitorDashboard';
import PredictiveHealthInsights from './PredictiveHealthInsights';
import HeartDeviceRecommendations from './HeartDeviceRecommendations';
import ComprehensiveAnalyticsDashboard from './ComprehensiveAnalyticsDashboard';
import AppointmentManager from './AppointmentManager';

type TabView =
  | 'overview'
  | 'analytics'
  | 'medications'
  | 'goals'
  | 'contacts'
  | 'chat'
  | 'connections'
  | 'insights'
  | 'files'
  | 'rotation'
  | 'devices'
  | 'predictive'
  | 'heart-devices'
  | 'comprehensive-analytics'
  | 'appointments';

interface StRaphaelHealthHubProps {
  userId: string;
  raphaelEngramId?: string;
}

export default function StRaphaelHealthHub({ userId, raphaelEngramId }: StRaphaelHealthHubProps) {
  const navigate = useNavigate();
  const { openConnectionsPanel, getActiveConnectionsCount } = useConnections();
  const [activeTab, setActiveTab] = useState<TabView>('overview');

  const activeConnectionsCount = getActiveConnectionsCount();

  const tabs = [
    { id: 'overview' as TabView, label: 'Overview', icon: Activity },
    { id: 'comprehensive-analytics' as TabView, label: 'All Sources', icon: LayoutGrid },
    { id: 'devices' as TabView, label: 'Devices', icon: Cpu },
    { id: 'heart-devices' as TabView, label: 'Heart Monitors', icon: Stethoscope },
    { id: 'predictive' as TabView, label: 'Predictions', icon: Brain },
    { id: 'insights' as TabView, label: 'Insights', icon: TrendingUp },
    { id: 'analytics' as TabView, label: 'Analytics', icon: BarChart3 },
    { id: 'medications' as TabView, label: 'Medications', icon: Pill },
    { id: 'goals' as TabView, label: 'Goals', icon: Target },
    { id: 'appointments' as TabView, label: 'Appointments', icon: Calendar },
    { id: 'files' as TabView, label: 'Files', icon: FolderOpen },
    { id: 'connections' as TabView, label: 'Connections', icon: Activity },
    { id: 'rotation' as TabView, label: 'Auto-Rotation', icon: Zap },
    { id: 'contacts' as TabView, label: 'Emergency', icon: Users },
    { id: 'chat' as TabView, label: 'Raphael AI', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] border border-teal-500/30">
              <Heart className="w-7 h-7 text-teal-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">St. Raphael Health Hub</h2>
              <p className="text-slate-400 text-sm">Comprehensive health tracking and management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => openConnectionsPanel('health')}
              className="relative px-5 py-3 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 hover:from-teal-500/20 hover:to-cyan-500/20 text-teal-400 transition-all duration-300 flex items-center gap-2 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.03)] border border-teal-500/20 backdrop-blur-xl group"
            >
              <Link2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span className="hidden sm:inline font-medium">Connections</span>
              {activeConnectionsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg shadow-emerald-500/50 animate-pulse">
                  {activeConnectionsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/health-dashboard')}
              className="px-5 py-3 rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] hover:from-[#1f1f2c] hover:to-[#16161d] text-slate-300 hover:text-white transition-all duration-300 flex items-center gap-2 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.03)] border border-white/5"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="font-medium hidden sm:inline">Full Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="p-3 rounded-3xl bg-gradient-to-br from-[#1a1a24]/80 to-[#13131a]/80 backdrop-blur-2xl shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-5 py-3 rounded-2xl font-medium transition-all duration-300 flex items-center gap-2.5 min-h-[44px] whitespace-nowrap relative group ${
                  isActive
                    ? 'bg-gradient-to-br from-teal-500/20 to-cyan-500/20 text-teal-300 shadow-[inset_3px_3px_8px_rgba(0,0,0,0.4),inset_-3px_-3px_8px_rgba(255,255,255,0.05)] border border-teal-500/30 backdrop-blur-xl'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 shadow-[2px_2px_5px_rgba(0,0,0,0.2),-2px_-2px_5px_rgba(255,255,255,0.02)] border border-transparent hover:border-white/5'
                }`}
                role="tab"
                aria-selected={isActive}
              >
                <Icon className={`w-4 h-4 transition-transform ${
                  isActive ? 'scale-110' : 'group-hover:scale-105'
                }`} />
                <span className="text-sm">{tab.label}</span>
                {isActive && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-400/10 to-cyan-400/10 blur-sm -z-10"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <RaphaelHealthInterface />
          </div>
        )}

        {activeTab === 'comprehensive-analytics' && (
          <ComprehensiveAnalyticsDashboard />
        )}

        {activeTab === 'devices' && (
          <DeviceMonitorDashboard />
        )}

        {activeTab === 'heart-devices' && (
          <HeartDeviceRecommendations />
        )}

        {activeTab === 'predictive' && (
          <PredictiveHealthInsights />
        )}

        {activeTab === 'insights' && (
          <RaphaelInsightsPanel />
        )}

        {activeTab === 'analytics' && (
          <HealthAnalytics />
        )}

        {activeTab === 'medications' && (
          <MedicationTracker />
        )}

        {activeTab === 'goals' && (
          <HealthGoals />
        )}

        {activeTab === 'appointments' && (
          <AppointmentManager />
        )}

        {activeTab === 'files' && (
          <FileManager context="health" />
        )}

        {activeTab === 'connections' && (
          <HealthConnectionManager />
        )}

        {activeTab === 'rotation' && (
          <div className="space-y-6">
            <ConnectionRotationConfig />
            <ConnectionRotationMonitor />
          </div>
        )}

        {activeTab === 'contacts' && (
          <EmergencyContacts />
        )}

        {activeTab === 'chat' && (
          raphaelEngramId ? (
            <RaphaelChat engramId={raphaelEngramId} />
          ) : (
            <div className="p-8 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5 text-center">
              <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Raphael AI chat is initializing...</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
