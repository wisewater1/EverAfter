import React, { useState, useEffect } from 'react';
import { Brain, MessageCircle, Users, Heart, TrendingUp, Target, Sparkles, BarChart3, Clock, CheckCircle, AlertCircle, Loader2, RefreshCw, X,  } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { readDemoStorage, writeDemoStorage, createDemoId } from '../lib/demo-storage';

interface PersonalityProfile {
  id: string;
  family_member_id: string;
  profile_data: {
    core_traits: Record<string, TraitData>;
    communication_style: Record<string, TraitData>;
    social_tendencies: Record<string, TraitData>;
    interests: Record<string, TraitData>;
    behavioral_patterns: Record<string, unknown>;
    relationship_dynamics: Record<string, TraitData>;
  };
  completeness_score: number;
  confidence_score: number;
  total_responses: number;
  questions_answered: number;
  last_analyzed_at: string;
  profile_version: number;
  created_at: string;
}

interface TraitData {
  value: string;
  description: string;
  confidence: number;
  evidence: string[];
}

interface _FamilyMember {
  id: string;
  name: string;
  relationship: string;
  email: string;
}

interface PersonalityProfileViewerProps {
  familyMemberId: string;
  familyMemberName: string;
  familyMemberRelationship: string;
  onClose: () => void;
}

const DEMO_PERSONALITY_PROFILES_KEY = 'everafter_demo_personality_profiles';

export default function PersonalityProfileViewer({
  familyMemberId,
  familyMemberName,
  familyMemberRelationship,
  onClose,
}: PersonalityProfileViewerProps) {
  const { isDemoMode } = useAuth();
  const [profile, setProfile] = useState<PersonalityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('core_traits');

  useEffect(() => {
    loadProfile();
  }, [familyMemberId, isDemoMode]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      if (isDemoMode) {
        const demoProfiles = readDemoStorage<Record<string, PersonalityProfile>>(DEMO_PERSONALITY_PROFILES_KEY, {});
        setProfile(demoProfiles[familyMemberId] ?? null);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('family_personality_profiles')
        .select('*')
        .eq('family_member_id', familyMemberId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setProfile(data || null);
    } catch (err) {
      console.warn('Error loading profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateProfile = async (forceRegenerate = false) => {
    try {
      setGenerating(true);
      setError(null);

      if (isDemoMode) {
        const demoProfile: PersonalityProfile = {
          id: createDemoId('personality'),
          family_member_id: familyMemberId,
          profile_data: {
            core_traits: {
              grounded: {
                value: 'Steady and dependable',
                description: `${familyMemberName} presents as calm under pressure and prefers thoughtful, practical decisions.`,
                confidence: 0.84,
                evidence: ['Shows patience during difficult family decisions.', 'Prefers clear plans and consistent routines.'],
              },
            },
            communication_style: {
              supportive: {
                value: 'Warm and direct',
                description: `${familyMemberName} tends to communicate with reassurance first, then moves into concrete guidance.`,
                confidence: 0.8,
                evidence: ['Balances empathy with actionable next steps.', 'Uses concise language when clarity matters.'],
              },
            },
            social_tendencies: {
              relational: {
                value: 'Family-centered',
                description: `Interactions are strongly shaped by care for close relationships, especially as ${familyMemberRelationship}.`,
                confidence: 0.78,
                evidence: ['Prioritizes family harmony.', 'Engages most deeply in trusted circles.'],
              },
            },
            interests: {
              wellness: {
                value: 'Health and stability',
                description: 'Shows repeat interest in routines, wellbeing, and long-term family resilience.',
                confidence: 0.72,
                evidence: ['Returns to sustainability and quality-of-life themes.', 'Values practical improvements over novelty.'],
              },
            },
            behavioral_patterns: {
              decision_making: {
                description: 'Prefers to gather enough context before acting, then follows through consistently.',
              },
            },
            relationship_dynamics: {
              trusted_anchor: {
                value: 'Reliable presence',
                description: `${familyMemberName} often fills the role of stabilizer and trusted sounding board.`,
                confidence: 0.82,
                evidence: ['Others look to them for reassurance.', 'Maintains consistency across stressful situations.'],
              },
            },
          },
          completeness_score: 76,
          confidence_score: 0.81,
          total_responses: 12,
          questions_answered: 12,
          last_analyzed_at: new Date().toISOString(),
          profile_version: forceRegenerate ? 2 : 1,
          created_at: new Date().toISOString(),
        };

        const demoProfiles = readDemoStorage<Record<string, PersonalityProfile>>(DEMO_PERSONALITY_PROFILES_KEY, {});
        writeDemoStorage(DEMO_PERSONALITY_PROFILES_KEY, {
          ...demoProfiles,
          [familyMemberId]: demoProfile,
        });
        setProfile(demoProfile);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-personality-profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          family_member_id: familyMemberId,
          force_regenerate: forceRegenerate,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || result.message || 'Failed to generate profile');
      }

      await loadProfile();
    } catch (err) {
      console.warn('Error generating profile:', err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'core_traits': return Brain;
      case 'communication_style': return MessageCircle;
      case 'social_tendencies': return Users;
      case 'interests': return Heart;
      case 'behavioral_patterns': return TrendingUp;
      case 'relationship_dynamics': return Target;
      default: return Sparkles;
    }
  };

  const getCategoryLabel = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-emerald-400 bg-emerald-500/10';
    if (confidence >= 0.6) return 'text-teal-400 bg-teal-500/10';
    if (confidence >= 0.4) return 'text-amber-400 bg-amber-500/10';
    return 'text-orange-400 bg-orange-500/10';
  };

  const getCompletenessColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-teal-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-orange-400';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
            <p className="text-slate-300 text-lg">Loading personality profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 max-w-2xl w-full p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">Personality Profile</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-medium text-white mb-3">
              No Profile Yet for {familyMemberName}
            </h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Generate a comprehensive personality profile based on their questionnaire responses.
              This uses AI to analyze communication patterns, values, and behavioral tendencies.
            </p>
            {error && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                <p className="text-rose-400 text-sm">{error}</p>
              </div>
            )}
            <button
              onClick={() => generateProfile(false)}
              disabled={generating}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto font-semibold"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Profile...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Personality Profile
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const categories = [
    'core_traits',
    'communication_style',
    'social_tendencies',
    'interests',
    'behavioral_patterns',
    'relationship_dynamics',
  ];

  const selectedData = profile.profile_data[selectedCategory as keyof typeof profile.profile_data];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700/50 max-w-6xl w-full my-8">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-600/20 via-teal-600/20 to-sky-600/20 backdrop-blur-xl border-b border-slate-700/50 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white">{familyMemberName}'s Personality Profile</h2>
                <p className="text-slate-400 text-sm">{familyMemberRelationship}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Completeness</span>
              </div>
              <p className={`text-2xl font-light ${getCompletenessColor(profile.completeness_score)}`}>
                {profile.completeness_score}%
              </p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Confidence</span>
              </div>
              <p className="text-2xl font-light text-emerald-400">
                {Math.round(profile.confidence_score * 100)}%
              </p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Responses</span>
              </div>
              <p className="text-2xl font-light text-white">{profile.questions_answered}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">Version</span>
              </div>
              <p className="text-2xl font-light text-white">v{profile.profile_version}</p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => generateProfile(true)}
              disabled={generating}
              className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl hover:bg-emerald-600/30 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerate Profile
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row">
          <div className="md:w-64 border-b md:border-b-0 md:border-r border-slate-700/50 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
              Categories
            </h3>
            <nav className="space-y-1">
              {categories.map((category) => {
                const Icon = getCategoryIcon(category);
                const isActive = selectedCategory === category;
                const categoryData = profile.profile_data[category as keyof typeof profile.profile_data];
                const traitCount = typeof categoryData === 'object' ? Object.keys(categoryData).length : 0;

                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between gap-2 ${
                      isActive
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">{getCategoryLabel(category)}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-500'
                    }`}>
                      {traitCount}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex-1 p-6 max-h-[600px] overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                {getCategoryLabel(selectedCategory)}
              </h3>
              <p className="text-slate-400 text-sm">
                Personality traits and patterns identified through AI analysis
              </p>
            </div>

            {selectedData && typeof selectedData === 'object' && Object.keys(selectedData).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(selectedData).map(([traitName, traitData]: [string, unknown]) => (
                  <div
                    key={traitName}
                    className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50 hover:border-slate-600/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-white mb-1">
                          {traitName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </h4>
                        {traitData.value && (
                          <p className="text-emerald-400 text-sm font-medium mb-2">
                            {traitData.value}
                          </p>
                        )}
                      </div>
                      {traitData.confidence !== undefined && (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getConfidenceColor(traitData.confidence)}`}>
                          {Math.round(traitData.confidence * 100)}% confident
                        </span>
                      )}
                    </div>
                    {traitData.description && (
                      <p className="text-slate-300 leading-relaxed mb-3">
                        {traitData.description}
                      </p>
                    )}
                    {traitData.evidence && traitData.evidence.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Evidence from responses:</p>
                        <div className="space-y-1">
                          {traitData.evidence.slice(0, 3).map((evidence: string, idx: number) => (
                            <p key={idx} className="text-sm text-slate-400 italic">
                              "{evidence}"
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No data available for this category yet.</p>
                <p className="text-slate-500 text-sm mt-2">
                  More responses are needed to analyze this dimension.
                </p>
              </div>
            )}
          </div>
        </div>

        {profile.last_analyzed_at && (
          <div className="border-t border-slate-700/50 p-4 bg-slate-900/50">
            <p className="text-xs text-slate-500 text-center">
              Last analyzed: {new Date(profile.last_analyzed_at).toLocaleDateString()} at{' '}
              {new Date(profile.last_analyzed_at).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
