import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, Heart, Cloud, Sparkles, Lock, Crown, Users, Calendar, BarChart3, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ResearchParticipation from './ResearchParticipation';

interface InsightData {
  emotional_arcs: Array<{ date: string; sentiment: number; emotion: string }>;
  recurring_themes: Array<{ theme: string; frequency: number; context: string }>;
  relationship_map: Array<{ person: string; connection_strength: number; interactions: number }>;
  dream_words: Array<{ word: string; frequency: number; sentiment: string }>;
  mood_correlations: Array<{ mood: string; trigger: string; correlation: number }>;
  archetypal_clusters: Array<{ archetype: string; percentage: number; traits: string[] }>;
}

interface CognitiveInsightsProps {
  userId: string;
  engramId?: string;
}

export default function CognitiveInsights({ userId, engramId }: CognitiveInsightsProps) {
  const [hasInsightPro, setHasInsightPro] = useState(false);
  const [insights, setInsights] = useState<Partial<InsightData>>({});
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [activeView, setActiveView] = useState<'emotional' | 'themes' | 'relationships' | 'dreams' | 'mood' | 'archetypes'>('emotional');

  useEffect(() => {
    checkSubscriptionStatus();
    loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, engramId]);

  const checkSubscriptionStatus = async () => {
    try {
      const { data } = await supabase
        .from('insight_subscriptions')
        .select('subscription_tier, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      setHasInsightPro(data?.subscription_tier === 'insight_pro');
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const loadInsights = async () => {
    try {
      const query = supabase
        .from('cognitive_insights')
        .select('*')
        .eq('user_id', userId)
        .gte('generated_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('generated_at', { ascending: false })
        .limit(10);

      if (engramId) {
        query.eq('engram_id', engramId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate insights
      const aggregated: Partial<InsightData> = {
        emotional_arcs: [],
        recurring_themes: [],
        relationship_map: [],
        dream_words: [],
        mood_correlations: [],
        archetypal_clusters: [],
      };

      data?.forEach((insight) => {
        const insightData = insight.insight_data as Record<string, unknown>;
        if (insight.insight_type === 'emotional_arc' && insightData.arcs) {
          aggregated.emotional_arcs = [...(aggregated.emotional_arcs || []), ...insightData.arcs];
        } else if (insight.insight_type === 'recurring_themes' && insightData.themes) {
          aggregated.recurring_themes = insightData.themes;
        } else if (insight.insight_type === 'relationship_map' && insightData.relationships) {
          aggregated.relationship_map = insightData.relationships;
        } else if (insight.insight_type === 'dream_words' && insightData.words) {
          aggregated.dream_words = insightData.words;
        } else if (insight.insight_type === 'mood_correlation' && insightData.correlations) {
          aggregated.mood_correlations = insightData.correlations;
        } else if (insight.insight_type === 'archetypal_cluster' && insightData.clusters) {
          aggregated.archetypal_clusters = insightData.clusters;
        }
      });

      setInsights(aggregated);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          type: 'insight_pro',
          price_id: 'price_insight_pro_monthly',
          success_url: `${window.location.origin}/dashboard?upgrade=success&section=insights`,
          cancel_url: `${window.location.origin}/dashboard?upgrade=cancelled`,
        },
      });

      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error('Upgrade error:', err);
      alert('Failed to start upgrade. Please try again.');
    }
  };

  const views = [
    { id: 'emotional' as const, label: 'Emotional Arc', icon: Heart, color: 'from-rose-500 to-pink-600', isPremium: false },
    { id: 'themes' as const, label: 'Recurring Themes', icon: Sparkles, color: 'from-violet-500 to-purple-600', isPremium: false },
    { id: 'relationships' as const, label: 'Relationship Map', icon: Users, color: 'from-blue-500 to-cyan-600', isPremium: true },
    { id: 'dreams' as const, label: 'Dream Words', icon: Cloud, color: 'from-sky-500 to-blue-600', isPremium: true },
    { id: 'mood' as const, label: 'Mood Correlations', icon: BarChart3, color: 'from-amber-500 to-orange-600', isPremium: true },
    { id: 'archetypes' as const, label: 'Archetypal Clusters', icon: Brain, color: 'from-teal-500 to-emerald-600', isPremium: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Research Participation */}
      <ResearchParticipation userId={userId} />

      {/* Header Card */}
      <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-medium text-white">Insights & Analytics</h2>
              <p className="text-sm text-slate-400">Discover patterns in your emotional journey</p>
            </div>
          </div>
          {!hasInsightPro && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-lg shadow-violet-500/20 font-medium flex items-center gap-2"
            >
              <Crown className="w-4 h-4" />
              Upgrade to Pro
            </button>
          )}
        </div>

        {/* Free Tier Notice */}
        {!hasInsightPro && (
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-slate-300 mb-2">
                  You're viewing basic insights. Upgrade to <span className="font-medium text-violet-400">Insight Pro</span> for deeper analytics.
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  <span>Sentiment timeline</span>
                  <span>•</span>
                  <span>Archetypal mapping</span>
                  <span>•</span>
                  <span>Dream analysis</span>
                  <span>•</span>
                  <span>Mood correlations</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {views.map((view) => {
            const Icon = view.icon;
            const isLocked = view.isPremium && !hasInsightPro;
            return (
              <button
                key={view.id}
                onClick={() => !isLocked && setActiveView(view.id)}
                disabled={isLocked}
                className={`relative px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeView === view.id && !isLocked
                    ? `bg-gradient-to-r ${view.color} text-white shadow-lg`
                    : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                <Icon className="w-4 h-4" />
                {view.label}
                {isLocked && <Lock className="w-3 h-3 ml-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Insights Display */}
      {activeView === 'emotional' && (
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-medium text-white">Emotional Arc (Last 90 Days)</h3>
          </div>
          {insights.emotional_arcs && insights.emotional_arcs.length > 0 ? (
            <div className="space-y-3">
              {insights.emotional_arcs.slice(0, 5).map((arc, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-slate-800/30 rounded-lg">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-300">{arc.emotion}</span>
                      <span className="text-xs text-slate-500">{new Date(arc.date).toLocaleDateString()}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${arc.sentiment > 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-rose-500 to-pink-500'}`}
                        style={{ width: `${Math.abs(arc.sentiment) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No emotional arc data yet. Keep answering daily questions to build insights.</p>
            </div>
          )}
        </div>
      )}

      {activeView === 'themes' && (
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-medium text-white">Recurring Themes</h3>
          </div>
          {insights.recurring_themes && insights.recurring_themes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.recurring_themes.map((theme, index) => (
                <div key={index} className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-white">{theme.theme}</span>
                    <span className="px-2 py-1 bg-violet-500/10 text-violet-400 text-xs rounded-lg">
                      {theme.frequency}x
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{theme.context}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No recurring themes detected yet. Continue your journey to discover patterns.</p>
            </div>
          )}
        </div>
      )}

      {/* Premium Views (Locked) */}
      {(['relationships', 'dreams', 'mood', 'archetypes'] as const).includes(activeView) && !hasInsightPro && (
        <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-violet-500/30 p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-500/20">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-medium text-white mb-3">Unlock Advanced Insights</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Upgrade to Insight Pro to access deep emotional analytics, relationship patterns, and archetypal mapping
          </p>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-lg shadow-violet-500/20 font-medium inline-flex items-center gap-2"
          >
            <Crown className="w-5 h-5" />
            Upgrade to Insight Pro - $7/month
          </button>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-violet-500/30 p-8 max-w-2xl w-full">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-light text-white mb-1">Insight Pro</h3>
                <p className="text-sm text-violet-400 font-medium">Unlock Cognitive Intelligence</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                <Zap className="w-5 h-5 text-violet-400" />
                <span className="text-sm text-slate-300">Sentiment timeline analysis</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                <Brain className="w-5 h-5 text-violet-400" />
                <span className="text-sm text-slate-300">Archetypal cluster mapping</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                <Cloud className="w-5 h-5 text-violet-400" />
                <span className="text-sm text-slate-300">Dream-word frequency analysis</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                <BarChart3 className="w-5 h-5 text-violet-400" />
                <span className="text-sm text-slate-300">Mood correlation graphs</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                <Users className="w-5 h-5 text-violet-400" />
                <span className="text-sm text-slate-300">Relationship pattern insights</span>
              </div>
            </div>

            <div className="mb-6 p-6 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-xl text-center">
              <div className="text-sm text-slate-400 mb-1">Insight Pro</div>
              <div className="text-4xl font-light text-white mb-1">$7</div>
              <div className="text-xs text-slate-500">per month · cancel anytime</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all font-medium"
              >
                Maybe Later
              </button>
              <button
                onClick={handleUpgrade}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-lg shadow-violet-500/20 font-medium flex items-center justify-center gap-2"
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
