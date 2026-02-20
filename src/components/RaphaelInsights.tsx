import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, TrendingDown, Activity, Heart, Moon, Footprints, AlertCircle, CheckCircle, Sparkles, Brain } from 'lucide-react';

interface HealthInsight {
  category: string;
  title: string;
  description: string;
  trend: 'positive' | 'negative' | 'neutral';
  priority: 'high' | 'medium' | 'low';
  icon: React.ReactNode;
}

interface HealthStats {
  weeklySteps: number;
  averageHeartRate: number;
  sleepHours: number;
  activeMinutes: number;
}

export default function RaphaelInsights() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [stats, setStats] = useState<HealthStats>({
    weeklySteps: 0,
    averageHeartRate: 0,
    sleepHours: 0,
    activeMinutes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHealthData();
    }
  }, [user]);

  const fetchHealthData = async () => {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: metrics, error } = await supabase
        .from('health_metrics')
        .select('*')
        .gte('recorded_at', weekAgo.toISOString())
        .order('recorded_at', { ascending: false });

      if (error) throw error;

      if (metrics) {
        const steps = metrics.filter(m => m.metric_type === 'steps');
        const heartRates = metrics.filter(m => m.metric_type === 'heart_rate');
        const sleep = metrics.filter(m => m.metric_type === 'sleep');
        const activity = metrics.filter(m => m.metric_type === 'active_minutes');

        setStats({
          weeklySteps: steps.reduce((sum, m) => sum + m.metric_value, 0),
          averageHeartRate: heartRates.length > 0
            ? Math.round(heartRates.reduce((sum, m) => sum + m.metric_value, 0) / heartRates.length)
            : 0,
          sleepHours: sleep.length > 0
            ? Math.round((sleep.reduce((sum, m) => sum + m.metric_value, 0) / sleep.length) * 10) / 10
            : 0,
          activeMinutes: activity.reduce((sum, m) => sum + m.metric_value, 0)
        });

        generateInsights(metrics);
        if (metrics.length > 0) {
          fetchDeepDiveInsights(metrics);
        }
      }
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeepDiveInsights = async (metrics: any[]) => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const formattedMetrics = metrics.map(m => ({
        type: m.metric_type,
        value: m.metric_value,
        timestamp: m.recorded_at
      }));

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/health/deep_dive/${user.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formattedMetrics)
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const deepDive = data[0];
          setInsights(prev => {
            // Avoid duplicates if re-fetching
            const filtered = prev.filter(i => i.category !== 'Holistic Deep Dive');
            return [{
              category: 'Holistic Deep Dive',
              title: 'St. Raphael AI Analysis',
              description: deepDive.contributing_factors[0],
              trend: 'neutral',
              priority: 'high',
              icon: <Brain className="w-5 h-5 text-fuchsia-400" />
            }, ...filtered];
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch deep dive insights", error);
    }
  };

  const generateInsights = (metrics: any[]) => {
    const newInsights: HealthInsight[] = [];

    const steps = metrics.filter(m => m.metric_type === 'steps');
    if (steps.length > 0) {
      const avgSteps = steps.reduce((sum, m) => sum + m.metric_value, 0) / steps.length;
      if (avgSteps > 8000) {
        newInsights.push({
          category: 'Activity',
          title: 'Excellent Step Count',
          description: `You're averaging ${Math.round(avgSteps)} steps per day. Keep up the great work!`,
          trend: 'positive',
          priority: 'low',
          icon: <Footprints className="w-5 h-5" />
        });
      } else if (avgSteps < 5000) {
        newInsights.push({
          category: 'Activity',
          title: 'Low Step Count',
          description: `Your average is ${Math.round(avgSteps)} steps/day. Try to increase your daily movement.`,
          trend: 'negative',
          priority: 'medium',
          icon: <Footprints className="w-5 h-5" />
        });
      }
    }

    const sleep = metrics.filter(m => m.metric_type === 'sleep');
    if (sleep.length > 0) {
      const avgSleep = sleep.reduce((sum, m) => sum + m.metric_value, 0) / sleep.length;
      if (avgSleep < 7) {
        newInsights.push({
          category: 'Sleep',
          title: 'Insufficient Sleep',
          description: `You're averaging ${avgSleep.toFixed(1)} hours of sleep. Aim for 7-9 hours for optimal health.`,
          trend: 'negative',
          priority: 'high',
          icon: <Moon className="w-5 h-5" />
        });
      } else if (avgSleep >= 7 && avgSleep <= 9) {
        newInsights.push({
          category: 'Sleep',
          title: 'Optimal Sleep Pattern',
          description: `Great job! You're getting ${avgSleep.toFixed(1)} hours of sleep on average.`,
          trend: 'positive',
          priority: 'low',
          icon: <Moon className="w-5 h-5" />
        });
      }
    }

    const heartRates = metrics.filter(m => m.metric_type === 'heart_rate');
    if (heartRates.length > 0) {
      const avgHR = heartRates.reduce((sum, m) => sum + m.metric_value, 0) / heartRates.length;
      if (avgHR > 100) {
        newInsights.push({
          category: 'Heart Health',
          title: 'Elevated Resting Heart Rate',
          description: `Your average heart rate is ${Math.round(avgHR)} bpm. Consider consulting with a healthcare provider.`,
          trend: 'negative',
          priority: 'high',
          icon: <Heart className="w-5 h-5" />
        });
      } else if (avgHR >= 60 && avgHR <= 80) {
        newInsights.push({
          category: 'Heart Health',
          title: 'Healthy Heart Rate',
          description: `Your resting heart rate of ${Math.round(avgHR)} bpm is within the healthy range.`,
          trend: 'positive',
          priority: 'low',
          icon: <Heart className="w-5 h-5" />
        });
      }
    }

    // Generate comprehensive weekly summary
    const totalMetrics = metrics.length;
    const uniqueDays = new Set(metrics.map(m => new Date(m.recorded_at).toDateString())).size;
    const activeMetrics = metrics.filter(m => m.metric_value > 0).length;
    const dataCompleteness = totalMetrics > 0 ? Math.round((activeMetrics / totalMetrics) * 100) : 0;

    if (totalMetrics > 0) {
      const stepData = steps.length > 0 ? `${Math.round(steps.reduce((sum, m) => sum + m.metric_value, 0))} steps` : '';
      const sleepData = sleep.length > 0 ? `${(sleep.reduce((sum, m) => sum + m.metric_value, 0) / sleep.length).toFixed(1)}h avg sleep` : '';
      const hrData = heartRates.length > 0 ? `${Math.round(heartRates.reduce((sum, m) => sum + m.metric_value, 0) / heartRates.length)} bpm avg` : '';

      const summaryParts = [stepData, sleepData, hrData].filter(Boolean);
      const summaryText = summaryParts.length > 0
        ? `This week: ${summaryParts.join(', ')}. Tracking across ${uniqueDays} days with ${dataCompleteness}% data completeness.`
        : `Tracking ${totalMetrics} health metrics across ${uniqueDays} days. Keep logging your data for personalized insights.`;

      newInsights.push({
        category: 'General',
        title: 'Weekly Health Summary',
        description: summaryText,
        trend: dataCompleteness > 70 ? 'positive' : dataCompleteness > 40 ? 'neutral' : 'negative',
        priority: 'low',
        icon: <Activity className="w-5 h-5" />
      });
    } else {
      newInsights.push({
        category: 'General',
        title: 'Weekly Health Summary',
        description: 'No health data recorded this week. Connect your devices or manually log your health metrics to start receiving personalized insights.',
        trend: 'neutral',
        priority: 'medium',
        icon: <Activity className="w-5 h-5" />
      });
    }

    setInsights(newInsights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }));
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Activity className="w-4 h-4 text-purple-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-500/30 bg-red-500/10';
      case 'medium':
        return 'border-yellow-500/30 bg-yellow-500/10';
      default:
        return 'border-purple-500/30 bg-purple-500/10';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-purple-400" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="text-white">Loading insights...</div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div className="flex items-center space-x-3 mb-6">
        <Sparkles className="w-6 h-6 text-purple-400" />
        <h2 className="text-2xl font-bold text-white">Health Insights</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <Footprints className="w-5 h-5 text-green-400 mb-2" />
          <p className="text-2xl font-bold text-white">{stats.weeklySteps.toLocaleString()}</p>
          <p className="text-purple-300 text-sm">Weekly Steps</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <Heart className="w-5 h-5 text-red-400 mb-2" />
          <p className="text-2xl font-bold text-white">{stats.averageHeartRate}</p>
          <p className="text-purple-300 text-sm">Avg Heart Rate</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <Moon className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-white">{stats.sleepHours}</p>
          <p className="text-purple-300 text-sm">Avg Sleep (hrs)</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <Activity className="w-5 h-5 text-purple-400 mb-2" />
          <p className="text-2xl font-bold text-white">{stats.activeMinutes}</p>
          <p className="text-purple-300 text-sm">Active Minutes</p>
        </div>
      </div>

      <div className="space-y-4">
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-50" />
            <p className="text-purple-200">No insights available yet. Keep tracking your health data!</p>
          </div>
        ) : (
          insights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-xl border ${getPriorityColor(insight.priority)}`}
            >
              <div className="flex items-start space-x-3">
                <div className="text-purple-400 mt-1">{insight.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-white font-semibold">{insight.title}</h3>
                    {getTrendIcon(insight.trend)}
                    {getPriorityIcon(insight.priority)}
                  </div>
                  <p className="text-purple-200 text-sm mb-2">{insight.description}</p>
                  <span className="text-xs text-purple-400 font-medium">{insight.category}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
