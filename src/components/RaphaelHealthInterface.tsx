import React, { useState, useEffect } from 'react';
import { MessageCircle, Activity, BarChart3, Heart, Calendar, Target, Users, Pill, Link2, TrendingUp, Crown, Sparkles, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
import HealthTips from './HealthTips';

type HealthTab = 'chat' | 'overview' | 'insights' | 'analytics' | 'medications' | 'appointments' | 'goals' | 'connections' | 'emergency';

export default function RaphaelHealthInterface() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<HealthTab>('chat');
  const [raphaelEngramId, setRaphaelEngramId] = useState<string>('');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [hasPremiumHealth, setHasPremiumHealth] = useState(false);

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

    async function checkPremiumStatus() {
      if (!user) return;
      const { data } = await supabase
        .from('health_premium_features')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setHasPremiumHealth(
          data.nutrition_plan_access ||
          data.telemedicine_access ||
          data.prescription_refill_access ||
          data.unlimited_reports
        );
      }
    }
    checkPremiumStatus();
  }, [user]);

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

      {/* Premium Upgrade Banner */}
      {!hasPremiumHealth && (
        <div className="relative bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-purple-500/10 border border-rose-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-purple-500/5 animate-pulse"></div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-white mb-1">Upgrade for Personalized Care</h3>
                <p className="text-sm text-slate-300 mb-3">
                  Unlock advanced health features, personalized nutrition plans, telemedicine access, and unlimited health reports
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-lg border border-emerald-500/20 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Nutrition Plans
                  </span>
                  <span className="px-2.5 py-1 bg-sky-500/10 text-sky-400 text-xs rounded-lg border border-sky-500/20 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Telemedicine
                  </span>
                  <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 text-xs rounded-lg border border-rose-500/20 flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    Unlimited Reports
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowPremiumModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white rounded-xl transition-all shadow-lg shadow-rose-500/20 font-medium whitespace-nowrap flex items-center gap-2"
            >
              <Crown className="w-5 h-5" />
              Upgrade to Premium
            </button>
          </div>
        </div>
      )}

      {/* Partner Integrations Banner */}
      {hasPremiumHealth && (
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-700/50">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Trusted Health Partners</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <div className="flex flex-col items-center justify-center p-3 bg-slate-900/50 rounded-lg border border-slate-800/50 hover:border-slate-700 transition-all cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mb-2">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-slate-400 text-center">NutriPro</p>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-slate-900/50 rounded-lg border border-slate-800/50 hover:border-slate-700 transition-all cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center mb-2">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-slate-400 text-center">LabCorp</p>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-slate-900/50 rounded-lg border border-slate-800/50 hover:border-slate-700 transition-all cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg flex items-center justify-center mb-2">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-slate-400 text-center">Teladoc</p>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-slate-900/50 rounded-lg border border-slate-800/50 hover:border-slate-700 transition-all cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center mb-2">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-slate-400 text-center">Garmin</p>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-slate-900/50 rounded-lg border border-slate-800/50 hover:border-slate-700 transition-all cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mb-2">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-slate-400 text-center">Partners</p>
            </div>
          </div>
        </div>
      )}

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
              <HealthTips />
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

      {/* Health Premium Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-rose-500/30 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-light text-white mb-1">Health Premium</h3>
                <p className="text-sm text-rose-400 font-medium">Advanced Personalized Care</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white mb-1">Personalized Nutrition Plans</h4>
                    <p className="text-xs text-slate-400">AI-generated meal plans tailored to your health goals, dietary restrictions, and preferences</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-sky-500/5 border border-sky-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-sky-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Activity className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white mb-1">Telemedicine Integration</h4>
                    <p className="text-xs text-slate-400">Connect with board-certified physicians 24/7 for virtual consultations and prescriptions</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Pill className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white mb-1">Prescription Refill Services</h4>
                    <p className="text-xs text-slate-400">Automatic prescription refills with pharmacy coordination and delivery options</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-rose-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white mb-1">Unlimited Health Reports</h4>
                    <p className="text-xs text-slate-400">Generate and export comprehensive health reports with no monthly limits</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Crown className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white mb-1">Partner Discounts</h4>
                    <p className="text-xs text-slate-400">Exclusive discounts on supplements, wearables, lab tests, and insurance through our health partners</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 p-6 bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-500/20 rounded-xl text-center">
              <div className="text-sm text-slate-400 mb-1">Health Premium</div>
              <div className="text-4xl font-light text-white mb-1">$24.99</div>
              <div className="text-xs text-slate-500">per month · cancel anytime</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPremiumModal(false)}
                className="flex-1 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all font-medium"
              >
                Maybe Later
              </button>
              <button
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
                      body: {
                        type: 'health_premium',
                        price_id: 'price_health_premium_monthly',
                        success_url: `${window.location.origin}/dashboard?upgrade=success&type=health`,
                        cancel_url: `${window.location.origin}/dashboard?upgrade=cancelled`,
                      },
                    });

                    if (error) throw error;
                    if (data?.url) {
                      window.location.href = data.url;
                    }
                  } catch (err) {
                    console.error('Upgrade error:', err);
                    alert('Failed to start upgrade. Please try again.');
                  }
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white rounded-xl transition-all shadow-lg shadow-rose-500/20 font-medium flex items-center justify-center gap-2"
              >
                <Crown className="w-5 h-5" />
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
