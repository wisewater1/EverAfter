import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, TrendingDown, Activity, Heart, Moon, Footprints, Calendar, Target, Award } from 'lucide-react';

interface HealthMetric {
  id: string;
  metric_type: string;
  metric_value: number;
  metric_unit: string;
  recorded_at: string;
}

interface AnalyticsData {
  avgSteps: number;
  avgHeartRate: number;
  avgSleep: number;
  totalActiveMinutes: number;
  stepsTrend: number;
  heartRateTrend: number;
  sleepTrend: number;
  weeklyData: Array<{
    date: string;
    steps: number;
    heartRate: number;
    sleep: number;
  }>;
}

export default function HealthAnalytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    avgSteps: 0,
    avgHeartRate: 0,
    avgSleep: 0,
    totalActiveMinutes: 0,
    stepsTrend: 0,
    heartRateTrend: 0,
    sleepTrend: 0,
    weeklyData: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const { data: recentMetrics } = await supabase
        .from('health_metrics')
        .select('*')
        .gte('recorded_at', weekAgo.toISOString())
        .order('recorded_at', { ascending: true });

      const { data: previousMetrics } = await supabase
        .from('health_metrics')
        .select('*')
        .gte('recorded_at', twoWeeksAgo.toISOString())
        .lt('recorded_at', weekAgo.toISOString());

      if (recentMetrics) {
        const steps = recentMetrics.filter(m => m.metric_type === 'steps');
        const heartRates = recentMetrics.filter(m => m.metric_type === 'heart_rate');
        const sleep = recentMetrics.filter(m => m.metric_type === 'sleep');
        const active = recentMetrics.filter(m => m.metric_type === 'active_minutes');

        const avgSteps = steps.length > 0 ? Math.round(steps.reduce((sum, m) => sum + m.metric_value, 0) / steps.length) : 0;
        const avgHeartRate = heartRates.length > 0 ? Math.round(heartRates.reduce((sum, m) => sum + m.metric_value, 0) / heartRates.length) : 0;
        const avgSleep = sleep.length > 0 ? Math.round((sleep.reduce((sum, m) => sum + m.metric_value, 0) / sleep.length) * 10) / 10 : 0;
        const totalActive = active.reduce((sum, m) => sum + m.metric_value, 0);

        let stepsTrend = 0;
        let heartRateTrend = 0;
        let sleepTrend = 0;

        if (previousMetrics) {
          const prevSteps = previousMetrics.filter(m => m.metric_type === 'steps');
          const prevHR = previousMetrics.filter(m => m.metric_type === 'heart_rate');
          const prevSleep = previousMetrics.filter(m => m.metric_type === 'sleep');

          if (prevSteps.length > 0) {
            const prevAvgSteps = prevSteps.reduce((sum, m) => sum + m.metric_value, 0) / prevSteps.length;
            stepsTrend = ((avgSteps - prevAvgSteps) / prevAvgSteps) * 100;
          }
          if (prevHR.length > 0) {
            const prevAvgHR = prevHR.reduce((sum, m) => sum + m.metric_value, 0) / prevHR.length;
            heartRateTrend = ((avgHeartRate - prevAvgHR) / prevAvgHR) * 100;
          }
          if (prevSleep.length > 0) {
            const prevAvgSleep = prevSleep.reduce((sum, m) => sum + m.metric_value, 0) / prevSleep.length;
            sleepTrend = ((avgSleep - prevAvgSleep) / prevAvgSleep) * 100;
          }
        }

        const weeklyDataMap = new Map();
        recentMetrics.forEach(metric => {
          const date = new Date(metric.recorded_at).toLocaleDateString();
          if (!weeklyDataMap.has(date)) {
            weeklyDataMap.set(date, { date, steps: 0, heartRate: 0, sleep: 0 });
          }
          const dayData = weeklyDataMap.get(date);
          if (metric.metric_type === 'steps') dayData.steps = metric.metric_value;
          if (metric.metric_type === 'heart_rate') dayData.heartRate = metric.metric_value;
          if (metric.metric_type === 'sleep') dayData.sleep = metric.metric_value;
        });

        setAnalytics({
          avgSteps,
          avgHeartRate,
          avgSleep,
          totalActiveMinutes: totalActive,
          stepsTrend: Math.round(stepsTrend * 10) / 10,
          heartRateTrend: Math.round(heartRateTrend * 10) / 10,
          sleepTrend: Math.round(sleepTrend * 10) / 10,
          weeklyData: Array.from(weeklyDataMap.values())
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Activity className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-400';
    if (trend < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="text-white">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Health Analytics</h2>
          <span className="text-sm text-purple-300">Last 7 days vs previous 7 days</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <Footprints className="w-8 h-8 text-green-400" />
              {getTrendIcon(analytics.stepsTrend)}
            </div>
            <p className="text-3xl font-bold text-white mb-1">{analytics.avgSteps.toLocaleString()}</p>
            <p className="text-purple-300 text-sm mb-2">Average Daily Steps</p>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${getTrendColor(analytics.stepsTrend)}`}>
                {analytics.stepsTrend > 0 ? '+' : ''}{analytics.stepsTrend}%
              </span>
              <span className="text-xs text-gray-400">vs last week</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <Heart className="w-8 h-8 text-red-400" />
              {getTrendIcon(analytics.heartRateTrend)}
            </div>
            <p className="text-3xl font-bold text-white mb-1">{analytics.avgHeartRate}</p>
            <p className="text-purple-300 text-sm mb-2">Average Heart Rate</p>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${getTrendColor(analytics.heartRateTrend)}`}>
                {analytics.heartRateTrend > 0 ? '+' : ''}{analytics.heartRateTrend}%
              </span>
              <span className="text-xs text-gray-400">vs last week</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <Moon className="w-8 h-8 text-blue-400" />
              {getTrendIcon(analytics.sleepTrend)}
            </div>
            <p className="text-3xl font-bold text-white mb-1">{analytics.avgSleep}</p>
            <p className="text-purple-300 text-sm mb-2">Average Sleep (hours)</p>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${getTrendColor(analytics.sleepTrend)}`}>
                {analytics.sleepTrend > 0 ? '+' : ''}{analytics.sleepTrend}%
              </span>
              <span className="text-xs text-gray-400">vs last week</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <Activity className="w-8 h-8 text-purple-400" />
              <Award className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">{analytics.totalActiveMinutes}</p>
            <p className="text-purple-300 text-sm mb-2">Total Active Minutes</p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-purple-400">This week</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4">Weekly Trends</h3>
        {analytics.weeklyData.length > 0 ? (
          <div className="space-y-3">
            {analytics.weeklyData.map((day, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{day.date}</span>
                  <Calendar className="w-4 h-4 text-purple-400" />
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Steps</p>
                    <p className="text-white font-semibold">{day.steps.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Heart Rate</p>
                    <p className="text-white font-semibold">{day.heartRate} bpm</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Sleep</p>
                    <p className="text-white font-semibold">{day.sleep}h</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No data available yet. Start tracking your health metrics!</p>
          </div>
        )}
      </div>
    </div>
  );
}
