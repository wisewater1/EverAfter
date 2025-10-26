import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Brain,
  AlertTriangle,
  CheckCircle,
  Link as LinkIcon,
  Lightbulb,
  Calendar,
  BarChart3,
} from 'lucide-react';

interface HealthPattern {
  metric: string;
  trend: 'improving' | 'stable' | 'declining';
  confidence: number;
  prediction_next_7_days: {
    expected_range: [number, number];
    risk_level: 'low' | 'medium' | 'high';
  };
}

interface Correlation {
  metric_1: string;
  metric_2: string;
  correlation: number;
  strength: 'strong' | 'moderate' | 'weak';
}

interface AnalyticsData {
  analysis: {
    period_analyzed: string;
    total_data_points: number;
    metrics_analyzed: number;
  };
  patterns: HealthPattern[];
  correlations: Correlation[];
  insights: string[];
  recommendations: string[];
  generated_at: string;
}

export default function PredictiveHealthInsights() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lookbackDays, setLookbackDays] = useState(30);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, lookbackDays]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();

      if (!session.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/predictive-health-analytics?lookbackDays=${lookbackDays}`,
        {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'declining': return <TrendingDown className="w-5 h-5 text-red-400" />;
      case 'stable': return <Minus className="w-5 h-5 text-gray-400" />;
      default: return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'from-green-900/20 to-emerald-900/20 border-green-500/30';
      case 'declining': return 'from-red-900/20 to-orange-900/20 border-red-500/30';
      case 'stable': return 'from-gray-900/20 to-slate-900/20 border-gray-500/30';
      default: return 'from-gray-900/20 to-slate-900/20 border-gray-500/30';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-600 text-white';
      case 'medium': return 'bg-orange-600 text-white';
      case 'low': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
        <div className="text-center py-8 text-gray-400">
          <Brain className="w-12 h-12 mx-auto mb-3 text-gray-500" />
          <p>Unable to load predictive analytics</p>
          <button
            onClick={loadAnalytics}
            className="mt-4 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-900/20 via-fuchsia-900/20 to-pink-900/20 rounded-2xl p-6 border border-purple-500/20">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Predictive Health Analytics</h2>
              <p className="text-purple-200 text-sm">AI-powered insights from your health data</p>
            </div>
          </div>
          <button
            onClick={loadAnalytics}
            className="p-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-all"
          >
            <RefreshCw className="w-5 h-5 text-purple-400" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-purple-300" />
          <span className="text-purple-200 text-sm">Analysis Period:</span>
          <select
            value={lookbackDays}
            onChange={(e) => setLookbackDays(parseInt(e.target.value))}
            className="bg-purple-900/30 border border-purple-500/30 text-purple-200 px-3 py-1 rounded-lg text-sm"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-sm text-gray-400 mb-1">Data Points</div>
            <div className="text-2xl font-bold text-white">{analytics.analysis.total_data_points}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-sm text-gray-400 mb-1">Metrics Analyzed</div>
            <div className="text-2xl font-bold text-purple-400">{analytics.analysis.metrics_analyzed}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-sm text-gray-400 mb-1">Patterns Found</div>
            <div className="text-2xl font-bold text-pink-400">{analytics.patterns.length}</div>
          </div>
        </div>
      </div>

      {analytics.recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-2xl p-6 border border-blue-500/20">
          <div className="flex items-center gap-3 mb-4">
            <Lightbulb className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-bold text-white">Personalized Recommendations</h3>
          </div>
          <div className="space-y-3">
            {analytics.recommendations.map((rec, index) => (
              <div key={index} className="p-4 bg-blue-900/20 rounded-xl border border-blue-500/20">
                <p className="text-blue-200">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics.insights.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            <h3 className="text-xl font-bold text-white">Health Insights</h3>
          </div>
          <div className="space-y-2">
            {analytics.insights.map((insight, index) => (
              <div key={index} className="p-3 bg-white/5 rounded-lg border border-white/10 text-gray-300 text-sm">
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
        <h3 className="text-xl font-bold text-white mb-4">Metric Trends & Predictions</h3>

        {analytics.patterns.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No patterns detected yet</p>
            <p className="text-sm mt-1">Continue tracking your health to see predictive insights</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.patterns.map((pattern, index) => (
              <div
                key={index}
                className={`p-5 rounded-xl border bg-gradient-to-br ${getTrendColor(pattern.trend)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getTrendIcon(pattern.trend)}
                    <div>
                      <h4 className="text-white font-semibold capitalize">
                        {pattern.metric.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-gray-400 text-xs">
                        {pattern.trend} trend
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-lg ${getRiskColor(pattern.prediction_next_7_days.risk_level)}`}>
                    {pattern.prediction_next_7_days.risk_level} risk
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Confidence</span>
                    <span className="text-white font-medium">{pattern.confidence}%</span>
                  </div>

                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: `${pattern.confidence}%` }}
                    />
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <p className="text-gray-400 text-xs mb-1">Next 7 days prediction:</p>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">
                        {pattern.prediction_next_7_days.expected_range[0].toFixed(1)} - {pattern.prediction_next_7_days.expected_range[1].toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {analytics.correlations.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-3 mb-4">
            <LinkIcon className="w-6 h-6 text-green-400" />
            <h3 className="text-xl font-bold text-white">Health Metric Correlations</h3>
          </div>

          <div className="space-y-3">
            {analytics.correlations.map((corr, index) => (
              <div key={index} className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium capitalize">
                      {corr.metric_1.replace(/_/g, ' ')}
                    </span>
                    <LinkIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-white font-medium capitalize">
                      {corr.metric_2.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-lg ${
                    corr.strength === 'strong' ? 'bg-green-600 text-white' :
                    corr.strength === 'moderate' ? 'bg-yellow-600 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {corr.strength}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        Math.abs(corr.correlation) > 0.7 ? 'bg-green-500' :
                        Math.abs(corr.correlation) > 0.4 ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`}
                      style={{ width: `${Math.abs(corr.correlation) * 100}%` }}
                    />
                  </div>
                  <span className="text-gray-400 text-sm font-mono">
                    {(corr.correlation * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Brain className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-purple-300 font-medium mb-2">How Predictive Analytics Works</h4>
            <p className="text-purple-200/80 text-sm mb-2">
              Our AI analyzes your health data using advanced statistical methods to identify patterns,
              predict trends, and discover correlations between different health metrics.
            </p>
            <ul className="text-sm text-purple-200/70 space-y-1">
              <li>• Trend analysis compares recent data with historical baselines</li>
              <li>• Risk predictions use statistical modeling to forecast potential issues</li>
              <li>• Correlation analysis reveals how different health factors influence each other</li>
              <li>• Confidence scores indicate the reliability of predictions based on data quantity and quality</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
