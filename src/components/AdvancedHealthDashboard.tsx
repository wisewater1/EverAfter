import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Activity, Heart, TrendingUp, TrendingDown, Zap, Moon,
  Footprints, AlertCircle, CheckCircle, Target, Calendar,
  Droplet, Wind, Battery, Brain
} from 'lucide-react';

interface HealthMetric {
  id: string;
  metric_type: string;
  metric_value: number;
  metric_unit: string;
  recorded_at: string;
  source: string;
}

interface HealthScore {
  overall: number;
  activity: number;
  sleep: number;
  vitals: number;
  recovery: number;
}

interface HealthInsight {
  type: 'positive' | 'warning' | 'info';
  title: string;
  message: string;
  icon: React.ReactNode;
}

export default function AdvancedHealthDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [healthScore, setHealthScore] = useState<HealthScore>({
    overall: 0,
    activity: 0,
    sleep: 0,
    vitals: 0,
    recovery: 0
  });
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    if (user) {
      fetchHealthData();
    }
  }, [user, timeRange]);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      const { data: healthMetrics, error } = await supabase
        .from('health_metrics')
        .select('*')
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: false });

      if (error) throw error;

      setMetrics(healthMetrics || []);
      calculateHealthScore(healthMetrics || []);
      generateInsights(healthMetrics || []);
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateHealthScore = (data: HealthMetric[]) => {
    const steps = data.filter(m => m.metric_type === 'steps');
    const heartRates = data.filter(m => m.metric_type === 'heart_rate');
    const sleep = data.filter(m => m.metric_type === 'sleep');
    const hrv = data.filter(m => m.metric_type === 'hrv');

    const avgSteps = steps.length > 0 ? steps.reduce((sum, m) => sum + m.metric_value, 0) / steps.length : 0;
    const avgHR = heartRates.length > 0 ? heartRates.reduce((sum, m) => sum + m.metric_value, 0) / heartRates.length : 0;
    const avgSleep = sleep.length > 0 ? sleep.reduce((sum, m) => sum + m.metric_value, 0) / sleep.length : 0;
    const avgHRV = hrv.length > 0 ? hrv.reduce((sum, m) => sum + m.metric_value, 0) / hrv.length : 0;

    const activityScore = Math.min((avgSteps / 10000) * 100, 100);
    const sleepScore = Math.min((avgSleep / 8) * 100, 100);
    const vitalsScore = avgHR > 0 && avgHR < 100 ? Math.max(100 - Math.abs(avgHR - 70) * 2, 0) : 0;
    const recoveryScore = avgHRV > 0 ? Math.min((avgHRV / 60) * 100, 100) : 0;
    const overallScore = (activityScore + sleepScore + vitalsScore + recoveryScore) / 4;

    setHealthScore({
      overall: Math.round(overallScore),
      activity: Math.round(activityScore),
      sleep: Math.round(sleepScore),
      vitals: Math.round(vitalsScore),
      recovery: Math.round(recoveryScore)
    });
  };

  const generateInsights = (data: HealthMetric[]) => {
    const newInsights: HealthInsight[] = [];

    const steps = data.filter(m => m.metric_type === 'steps');
    const avgSteps = steps.length > 0 ? steps.reduce((sum, m) => sum + m.metric_value, 0) / steps.length : 0;

    if (avgSteps >= 10000) {
      newInsights.push({
        type: 'positive',
        title: 'Excellent Activity Level',
        message: `You're averaging ${Math.round(avgSteps).toLocaleString()} steps per day. Keep up the great work!`,
        icon: <CheckCircle className="w-5 h-5 text-green-400" />
      });
    } else if (avgSteps < 5000) {
      newInsights.push({
        type: 'warning',
        title: 'Low Activity Detected',
        message: 'Try to increase your daily steps. Even a 10-minute walk can make a difference.',
        icon: <AlertCircle className="w-5 h-5 text-yellow-400" />
      });
    }

    const sleep = data.filter(m => m.metric_type === 'sleep');
    const avgSleep = sleep.length > 0 ? sleep.reduce((sum, m) => sum + m.metric_value, 0) / sleep.length : 0;

    if (avgSleep < 7) {
      newInsights.push({
        type: 'warning',
        title: 'Insufficient Sleep',
        message: `You're averaging ${avgSleep.toFixed(1)} hours of sleep. Aim for 7-9 hours for optimal health.`,
        icon: <Moon className="w-5 h-5 text-blue-400" />
      });
    } else if (avgSleep >= 7 && avgSleep <= 9) {
      newInsights.push({
        type: 'positive',
        title: 'Great Sleep Pattern',
        message: `Your ${avgSleep.toFixed(1)} hours of sleep is in the healthy range. Excellent!`,
        icon: <CheckCircle className="w-5 h-5 text-green-400" />
      });
    }

    const heartRates = data.filter(m => m.metric_type === 'resting_hr');
    const avgHR = heartRates.length > 0 ? heartRates.reduce((sum, m) => sum + m.metric_value, 0) / heartRates.length : 0;

    if (avgHR > 0 && avgHR < 60) {
      newInsights.push({
        type: 'positive',
        title: 'Excellent Resting Heart Rate',
        message: `Your resting heart rate of ${Math.round(avgHR)} bpm indicates good cardiovascular fitness.`,
        icon: <Heart className="w-5 h-5 text-red-400" />
      });
    }

    setInsights(newInsights);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-600 to-emerald-600';
    if (score >= 60) return 'from-yellow-600 to-orange-600';
    return 'from-red-600 to-rose-600';
  };

  const getLatestMetric = (type: string) => {
    const metric = metrics.find(m => m.metric_type === type);
    return metric ? metric.metric_value : 0;
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Advanced Health Analytics</h2>
          <p className="text-slate-400 text-sm">Comprehensive health insights and trends</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => setTimeRange('day')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              timeRange === 'day'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              timeRange === 'week'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              timeRange === 'month'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Overall Health Score */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getScoreGradient(healthScore.overall)} flex items-center justify-center shadow-lg`}>
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Overall Health Score</h3>
              <p className="text-sm text-slate-400">Based on your recent activity and vitals</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-5xl font-bold ${getScoreColor(healthScore.overall)}`}>
              {healthScore.overall}
            </p>
            <p className="text-xs text-slate-500 mt-1">out of 100</p>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Activity</span>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(healthScore.activity)}`}>
              {healthScore.activity}
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Sleep</span>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(healthScore.sleep)}`}>
              {healthScore.sleep}
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-red-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Vitals</span>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(healthScore.vitals)}`}>
              {healthScore.vitals}
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Battery className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Recovery</span>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(healthScore.recovery)}`}>
              {healthScore.recovery}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-900/20 to-teal-900/20 rounded-xl p-5 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-3">
            <Footprints className="w-8 h-8 text-emerald-400" />
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {getLatestMetric('steps').toLocaleString()}
          </p>
          <p className="text-sm text-emerald-300">Steps Today</p>
          <div className="mt-3 pt-3 border-t border-emerald-500/20">
            <p className="text-xs text-slate-400">Goal: 10,000</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-900/20 to-rose-900/20 rounded-xl p-5 border border-red-500/20">
          <div className="flex items-center justify-between mb-3">
            <Heart className="w-8 h-8 text-red-400" />
            <Activity className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {Math.round(getLatestMetric('resting_hr'))}
          </p>
          <p className="text-sm text-red-300">Resting HR (bpm)</p>
          <div className="mt-3 pt-3 border-t border-red-500/20">
            <p className="text-xs text-slate-400">Avg: 60-100 bpm</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 rounded-xl p-5 border border-blue-500/20">
          <div className="flex items-center justify-between mb-3">
            <Moon className="w-8 h-8 text-blue-400" />
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {getLatestMetric('sleep').toFixed(1)}h
          </p>
          <p className="text-sm text-blue-300">Sleep Duration</p>
          <div className="mt-3 pt-3 border-t border-blue-500/20">
            <p className="text-xs text-slate-400">Goal: 7-9 hours</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-xl p-5 border border-purple-500/20">
          <div className="flex items-center justify-between mb-3">
            <Brain className="w-8 h-8 text-purple-400" />
            <Wind className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {Math.round(getLatestMetric('hrv'))}
          </p>
          <p className="text-sm text-purple-300">HRV (ms)</p>
          <div className="mt-3 pt-3 border-t border-purple-500/20">
            <p className="text-xs text-slate-400">Recovery indicator</p>
          </div>
        </div>
      </div>

      {/* Health Insights */}
      {insights.length > 0 && (
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-emerald-400" />
            AI Health Insights
          </h3>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border ${
                  insight.type === 'positive'
                    ? 'bg-green-500/5 border-green-500/20'
                    : insight.type === 'warning'
                      ? 'bg-yellow-500/5 border-yellow-500/20'
                      : 'bg-blue-500/5 border-blue-500/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">{insight.icon}</div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium mb-1">{insight.title}</h4>
                    <p className="text-sm text-slate-400">{insight.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {metrics.length === 0 && (
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-lg rounded-2xl p-12 border border-slate-700/50 text-center">
          <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Health Data Yet</h3>
          <p className="text-slate-400 mb-6">
            Connect your health devices or manually log your metrics to see personalized insights.
          </p>
          <button className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg transition-all shadow-lg shadow-emerald-500/20">
            Connect Device
          </button>
        </div>
      )}
    </div>
  );
}
