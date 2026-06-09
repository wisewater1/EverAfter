import React, { useState, useEffect } from 'react';
import { Shield, Check, DollarSign, Info, AlertCircle, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ResearchParticipationProps {
  userId: string;
}

export default function ResearchParticipation({ userId }: ResearchParticipationProps) {
  const [hasConsented, setHasConsented] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadConsentStatus();
    loadCreditBalance();
  }, [userId]);

  const loadConsentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('research_consent')
        .select('has_consented')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setHasConsented(data?.has_consented || false);
    } catch (error) {
      console.error('Error loading consent status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCreditBalance = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_research_credits_balance', { p_user_id: userId });

      if (error) throw error;
      setCreditBalance(data || 0);
    } catch (error) {
      console.error('Error loading credit balance:', error);
    }
  };

  const handleToggleConsent = async () => {
    try {
      if (hasConsented) {
        // Revoke consent
        const { error } = await supabase
          .from('research_consent')
          .update({
            has_consented: false,
            revocation_date: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (error) throw error;
        setHasConsented(false);
      } else {
        // Grant consent
        const { error } = await supabase
          .from('research_consent')
          .upsert({
            user_id: userId,
            has_consented: true,
            consent_date: new Date().toISOString(),
            revocation_date: null,
            data_categories_shared: ['emotional_patterns', 'daily_responses', 'sentiment_analysis'],
            anonymization_level: 'full',
            consent_version: '1.0',
          }, {
            onConflict: 'user_id',
          });

        if (error) throw error;
        setHasConsented(true);
      }
    } catch (error) {
      console.error('Error updating consent:', error);
      alert('Failed to update consent status. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-medium text-white mb-1">Research Participation</h3>
          <p className="text-sm text-slate-400">
            Contribute to wellness research with anonymized data and earn monthly credits
          </p>
        </div>
      </div>

      {/* Credit Balance */}
      {hasConsented && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-white">Credit Balance</p>
                <p className="text-xs text-slate-400">Available for subscription discounts</p>
              </div>
            </div>
            <div className="text-2xl font-light text-emerald-400">${creditBalance.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${hasConsented ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
          <div>
            <p className="text-sm font-medium text-white">
              {hasConsented ? 'Active Participant' : 'Not Participating'}
            </p>
            <p className="text-xs text-slate-500">
              {hasConsented ? 'Earning $5/month in credits' : 'Opt-in to earn credits'}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggleConsent}
          className={`px-4 py-2 rounded-lg transition-all font-medium text-sm ${
            hasConsented
              ? 'bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-300 hover:text-white'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20'
          }`}
        >
          {hasConsented ? 'Opt Out' : 'Opt In'}
        </button>
      </div>

      {/* Privacy Info */}
      <div className="space-y-3">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-all"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-white">Privacy & Data Usage</span>
          </div>
          <div className={`text-slate-500 transition-transform ${showDetails ? 'rotate-180' : ''}`}>▼</div>
        </button>

        {showDetails && (
          <div className="space-y-3 p-4 bg-slate-800/20 rounded-lg border border-slate-700/30">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white mb-1">Full Anonymization</p>
                <p className="text-xs text-slate-400">
                  All personally identifiable information is stripped before data sharing. Your name, email, and specific details are never included.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white mb-1">Approved Institutions Only</p>
                <p className="text-xs text-slate-400">
                  Data is shared exclusively with verified universities and wellness research organizations.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white mb-1">Revocable Anytime</p>
                <p className="text-xs text-slate-400">
                  You can opt out at any moment. Future data will not be shared, though previously anonymized data cannot be removed from ongoing studies.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white mb-1">Monthly Rewards</p>
                <p className="text-xs text-slate-400">
                  Earn $5 in credits each month, applicable to any EverAfter AI subscription. Credits expire after one year.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white mb-1">Contributing to Science</p>
                <p className="text-xs text-slate-400">
                  Your anonymized emotional patterns help researchers understand mental wellness, grief processing, and human connection.
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300">
                  Data shared includes: emotional patterns, sentiment trends, question responses, and aggregated statistics. Excludes: names, contact info, family details, specific memories, or anything personally identifiable.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
