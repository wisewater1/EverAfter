import React, { useState } from 'react';
import { MessageCircle, Activity, BarChart3, Heart, Calendar, Target, Users, Pill, Link2 } from 'lucide-react';
import RaphaelChat from './RaphaelChat';
import HealthConnectionManager from './HealthConnectionManager';
import HealthAnalytics from './HealthAnalytics';
import MedicationTracker from './MedicationTracker';
import HealthGoals from './HealthGoals';
import EmergencyContacts from './EmergencyContacts';
import RaphaelInsights from './RaphaelInsights';
import HealthReportGenerator from './HealthReportGenerator';
import AppointmentManager from './AppointmentManager';

type HealthTab = 'chat' | 'overview' | 'analytics' | 'medications' | 'appointments' | 'goals' | 'connections' | 'emergency';

export default function RaphaelHealthInterface() {
  const [activeTab, setActiveTab] = useState<HealthTab>('chat');

  const tabs = [
    { id: 'chat' as HealthTab, label: 'Chat with Raphael', icon: MessageCircle, color: 'from-emerald-600 to-teal-600' },
    { id: 'overview' as HealthTab, label: 'Overview', icon: Activity, color: 'from-blue-600 to-cyan-600' },
    { id: 'analytics' as HealthTab, label: 'Analytics', icon: BarChart3, color: 'from-green-600 to-emerald-600' },
    { id: 'medications' as HealthTab, label: 'Medications', icon: Pill, color: 'from-pink-600 to-rose-600' },
    { id: 'appointments' as HealthTab, label: 'Appointments', icon: Calendar, color: 'from-orange-600 to-amber-600' },
    { id: 'goals' as HealthTab, label: 'Health Goals', icon: Target, color: 'from-cyan-600 to-blue-600' },
    { id: 'connections' as HealthTab, label: 'Connections', icon: Link2, color: 'from-teal-600 to-green-600' },
    { id: 'emergency' as HealthTab, label: 'Emergency', icon: Users, color: 'from-red-600 to-pink-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 rounded-2xl p-6 border border-emerald-500/20">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">St. Raphael Health Monitor</h1>
            <p className="text-emerald-200">Your comprehensive health companion powered by AI</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[140px] px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'chat' && <RaphaelChat />}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <RaphaelInsights />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
                <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('medications')}
                    className="w-full px-4 py-3 bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 rounded-lg transition-all flex items-center gap-3 text-left"
                  >
                    <Pill className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Track Medication</p>
                      <p className="text-xs text-pink-400/70">Log your daily medications</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('appointments')}
                    className="w-full px-4 py-3 bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 rounded-lg transition-all flex items-center gap-3 text-left"
                  >
                    <Calendar className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Schedule Appointment</p>
                      <p className="text-xs text-orange-400/70">Book a medical appointment</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('goals')}
                    className="w-full px-4 py-3 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 rounded-lg transition-all flex items-center gap-3 text-left"
                  >
                    <Target className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Set Health Goal</p>
                      <p className="text-xs text-cyan-400/70">Create a new health objective</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('connections')}
                    className="w-full px-4 py-3 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 rounded-lg transition-all flex items-center gap-3 text-left"
                  >
                    <Link2 className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Connect Health Service</p>
                      <p className="text-xs text-teal-400/70">Sync your health devices</p>
                    </div>
                  </button>
                </div>
              </div>

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

        {activeTab === 'analytics' && <HealthAnalytics />}
        {activeTab === 'medications' && <MedicationTracker />}
        {activeTab === 'appointments' && <AppointmentManager />}
        {activeTab === 'goals' && <HealthGoals />}
        {activeTab === 'connections' && <HealthConnectionManager />}
        {activeTab === 'emergency' && <EmergencyContacts />}
      </div>
    </div>
  );
}
