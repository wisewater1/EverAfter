import React, { useState, useEffect } from 'react';
import { MessageCircle, Activity, BarChart3, Heart, Calendar, Target, Users, Pill, Link2, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import RaphaelChat from './RaphaelChat';
import HealthConnectionManager from './HealthConnectionManager';
import HealthAnalytics from './HealthAnalytics';
import MedicationTracker from './MedicationTracker';
import HealthGoals from './HealthGoals';
import EmergencyContacts from './EmergencyContacts';
import RaphaelInsights from './RaphaelInsights';
import RaphaelInsightsPanel from './RaphaelInsightsPanel';
import HealthReportGenerator from './HealthReportGenerator';
import AppointmentManager from './AppointmentManager';
import RaphaelConnectors from './RaphaelConnectors';
import QuickActions from './QuickActions';

type HealthTab = 'chat' | 'overview' | 'insights' | 'analytics' | 'medications' | 'appointments' | 'goals' | 'connections' | 'emergency';

export default function RaphaelHealthInterface() {
  const [activeTab, setActiveTab] = useState<HealthTab>('chat');
  const [raphaelEngramId, setRaphaelEngramId] = useState<string>('');

  useEffect(() => {
    async function fetchRaphaelEngram() {
      const { data } = await supabase
        .from('engrams')
        .select('id')
        .eq('name', 'St. Raphael')
        .limit(1)
        .maybeSingle();

      if (data) {
        setRaphaelEngramId(data.id);
      }
    }
    fetchRaphaelEngram();
  }, []);

  const tabs = [
    { id: 'chat' as HealthTab, label: 'Chat with Raphael', icon: MessageCircle, color: 'from-emerald-600 to-teal-600' },
    { id: 'overview' as HealthTab, label: 'Overview', icon: Activity, color: 'from-blue-600 to-cyan-600' },
    { id: 'insights' as HealthTab, label: 'Insights', icon: TrendingUp, color: 'from-purple-600 to-pink-600' },
    { id: 'analytics' as HealthTab, label: 'Analytics', icon: BarChart3, color: 'from-green-600 to-emerald-600' },
    { id: 'medications' as HealthTab, label: 'Medications', icon: Pill, color: 'from-pink-600 to-rose-600' },
    { id: 'appointments' as HealthTab, label: 'Appointments', icon: Calendar, color: 'from-orange-600 to-amber-600' },
    { id: 'goals' as HealthTab, label: 'Health Goals', icon: Target, color: 'from-cyan-600 to-blue-600' },
    { id: 'connections' as HealthTab, label: 'Connections', icon: Link2, color: 'from-teal-600 to-green-600' },
    { id: 'emergency' as HealthTab, label: 'Emergency', icon: Users, color: 'from-red-600 to-pink-600' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-emerald-500/20">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-0.5 sm:mb-1">St. Raphael Health Monitor</h1>
            <p className="text-xs sm:text-sm lg:text-base text-emerald-200">Your comprehensive health companion powered by AI</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl sm:rounded-2xl border border-gray-700/50 p-1 sm:p-2 overflow-x-auto">
        <div className="flex sm:flex-wrap gap-1 sm:gap-2 min-w-max sm:min-w-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 sm:flex-1 sm:min-w-[120px] px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm whitespace-nowrap">{tab.label.split(' ').pop()}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-[300px] sm:min-h-[400px] lg:min-h-[600px]">
        {activeTab === 'chat' && <RaphaelChat />}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <RaphaelInsights />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <QuickActions onNavigate={(tab) => setActiveTab(tab as HealthTab)} />

              <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
                <h2 className="text-xl font-semibold text-white mb-4">Health Tips</h2>
                <div className="space-y-4">
                  <div className="p-3 bg-green-900/20 rounded-lg border border-green-500/20">
                    <p className="text-green-300 text-sm font-medium mb-1">Stay Hydrated</p>
                    <p className="text-green-200/70 text-xs">Drink at least 8 glasses of water daily for optimal health.</p>
                  </div>
                  <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/20">
                    <p className="text-blue-300 text-sm font-medium mb-1">Regular Exercise</p>
                    <p className="text-blue-200/70 text-xs">Aim for 150 minutes of moderate activity per week.</p>
                  </div>
                  <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-500/20">
                    <p className="text-purple-300 text-sm font-medium mb-1">Quality Sleep</p>
                    <p className="text-purple-200/70 text-xs">Get 7-9 hours of sleep each night for recovery.</p>
                  </div>
                  <div className="p-3 bg-orange-900/20 rounded-lg border border-orange-500/20">
                    <p className="text-orange-300 text-sm font-medium mb-1">Stress Management</p>
                    <p className="text-orange-200/70 text-xs">Practice mindfulness and take breaks throughout the day.</p>
                  </div>
                </div>
              </div>
            </div>
            <HealthReportGenerator />
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
            <RaphaelInsightsPanel engramId={raphaelEngramId} />
          </div>
        )}
        {activeTab === 'analytics' && <HealthAnalytics />}
        {activeTab === 'medications' && <MedicationTracker />}
        {activeTab === 'appointments' && <AppointmentManager />}
        {activeTab === 'goals' && <HealthGoals />}
        {activeTab === 'connections' && <RaphaelConnectors />}
        {activeTab === 'emergency' && <EmergencyContacts />}
      </div>
    </div>
  );
}
