import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Heart, BarChart3, Target, Users, Bell, ArrowLeft } from 'lucide-react';
import RaphaelInsights from '../components/RaphaelInsights';
import RaphaelChat from '../components/RaphaelChat';
import HealthAnalytics from '../components/HealthAnalytics';
import MedicationTracker from '../components/MedicationTracker';
import HealthGoals from '../components/HealthGoals';
import EmergencyContacts from '../components/EmergencyContacts';
import HealthReportGenerator from '../components/HealthReportGenerator';
import HealthConnectionManager from '../components/HealthConnectionManager';

type TabView = 'overview' | 'analytics' | 'medications' | 'goals' | 'contacts' | 'chat' | 'connections';

export default function HealthDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabView>('overview');

  const tabs = [
    { id: 'overview' as TabView, label: 'Overview', icon: Activity },
    { id: 'analytics' as TabView, label: 'Analytics', icon: BarChart3 },
    { id: 'medications' as TabView, label: 'Medications', icon: Heart },
    { id: 'goals' as TabView, label: 'Goals', icon: Target },
    { id: 'connections' as TabView, label: 'Connections', icon: Activity },
    { id: 'contacts' as TabView, label: 'Emergency', icon: Users },
    { id: 'chat' as TabView, label: 'Raphael AI', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Health Monitor</h1>
            <p className="text-purple-200">Comprehensive health tracking and management powered by St. Raphael AI</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 mb-6 p-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'text-purple-300 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 gap-6">
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

          {activeTab === 'analytics' && <HealthAnalytics />}
          {activeTab === 'medications' && <MedicationTracker />}
          {activeTab === 'goals' && <HealthGoals />}
          {activeTab === 'connections' && <HealthConnectionManager />}
          {activeTab === 'contacts' && <EmergencyContacts />}
          {activeTab === 'chat' && <RaphaelChat />}
        </div>
      </div>
    </div>
  );
}
