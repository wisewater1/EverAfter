import React, { useState } from 'react';
import { Check, Zap, Crown, Sparkles, Loader, LogIn, Brain, Heart, Lock, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const plans = [
  {
    id: 'free',
    name: 'Free Starter',
    price: '$0',
    period: 'forever',
    description: 'Get started with EverAfter AI',
    features: [
      'St. Raphael Health AI (FREE)',
      '2 Custom AI personalities',
      '365 daily questions',
      'Basic chat interface',
      'Email support',
      'Standard storage',
    ],
    icon: Sparkles,
    color: 'from-slate-600 to-slate-700',
    priceId: null,
  },
  {
    id: 'engram_premium',
    name: 'Engram Premium',
    price: '$14.99',
    period: '/month',
    description: 'Unlock your AI personalities faster',
    features: [
      'Fast-track activation at 50%',
      'Premium question categories',
      'Audio & video memory uploads',
      'AI-generated reflections',
      'Priority AI responses',
      'Unlimited custom engrams',
    ],
    icon: Brain,
    color: 'from-amber-600 to-orange-600',
    priceId: 'price_engram_premium_monthly',
  },
  {
    id: 'health_premium',
    name: 'Health Premium',
    price: '$24.99',
    period: '/month',
    description: 'Advanced health monitoring & care',
    features: [
      'Personalized nutrition plans',
      'Telemedicine integration',
      'Prescription refill services',
      'Unlimited health reports',
      'Partner discounts',
      'Advanced health analytics',
    ],
    icon: Heart,
    color: 'from-rose-600 to-pink-600',
    priceId: 'price_health_premium_monthly',
  },
  {
    id: 'insight_pro',
    name: 'Insight Pro',
    price: '$7',
    period: '/month',
    description: 'Unlock cognitive intelligence insights',
    features: [
      'Sentiment timeline analysis',
      'Archetypal cluster mapping',
      'Dream-word frequency analysis',
      'Mood correlation graphs',
      'Relationship pattern insights',
      'Advanced emotional analytics',
    ],
    icon: Brain,
    color: 'from-violet-600 to-purple-600',
    priceId: 'price_insight_pro_monthly',
  },
  {
    id: 'legacy_premium',
    name: 'Legacy Plus',
    price: '$9.99',
    period: '/month',
    description: 'Transform memory preservation into continuity',
    features: [
      '10 GB encrypted storage',
      '10 scheduled messages',
      'Yearly Memorial Compilation',
      'Continuity Plans management',
      'Priority message delivery',
      'Custom memorial pages',
    ],
    icon: Lock,
    color: 'from-amber-600 to-yellow-600',
    priceId: 'price_legacy_premium_monthly',
  },
  {
    id: 'legacy_eternal',
    name: 'Legacy Eternal',
    price: '$49',
    period: '/year',
    description: 'Perpetual hosting with lifetime guarantees',
    features: [
      'All Legacy Plus features',
      'Perpetual hosting after inactivity',
      'Verified delivery to heirs',
      'Blockchain timestamp verification',
      'Blessing Insurance included',
      'Custom memorial domain hosting',
    ],
    icon: Sparkles,
    color: 'from-amber-600 to-orange-600',
    priceId: 'price_legacy_eternal_yearly',
  },
  {
    id: 'ultimate',
    name: 'Ultimate Bundle',
    price: '$49.99',
    period: '/month',
    description: 'Everything EverAfter AI offers',
    features: [
      'All Engram Premium features',
      'All Health Premium features',
      'All Legacy Eternal features',
      'Insight Pro analytics included',
      '$20 monthly marketplace credit',
      'Priority support & early access',
    ],
    icon: Crown,
    color: 'from-gradient-to-r from-amber-600 via-rose-600 to-purple-600',
    priceId: 'price_ultimate_bundle_monthly',
    popular: true,
    badge: 'BEST VALUE',
  },
];

export default function Pricing() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSubscribe = async (priceId: string | null, planId: string) => {
    if (!priceId) {
      if (!user) {
        window.location.href = '/signup';
      } else {
        window.location.href = '/dashboard';
      }
      return;
    }

    if (!user || !session) {
      const confirmLogin = window.confirm('You need to sign in to purchase a premium Saint. Would you like to sign in now?');
      if (confirmLogin) {
        sessionStorage.setItem('pricing_redirect', 'true');
        window.location.href = '/login';
      }
      return;
    }

    setLoading(planId);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          price_id: priceId,
          success_url: `${window.location.origin}/dashboard?success=true`,
          cancel_url: `${window.location.origin}/pricing?canceled=true`,
          mode: 'subscription',
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(user ? '/dashboard' : '/')}
                className="w-10 h-10 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg flex items-center justify-center transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-medium text-white">EverAfter AI</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!user && (
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-12 px-4">
        {/* Title */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-light text-white mb-4">Choose Your Plan</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Start building your AI personality today. Upgrade anytime as your needs grow.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Marketplace Callout */}
        <div className="max-w-4xl mx-auto mb-12 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-500/20 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg font-medium text-white mb-1">Explore the AI Marketplace</h3>
              <p className="text-sm text-slate-400">Purchase expert-created AI personalities and templates starting at $16.99</p>
            </div>
            <button
              onClick={() => navigate('/marketplace')}
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl transition-all shadow-lg shadow-amber-500/20 font-medium whitespace-nowrap"
            >
              Browse Marketplace
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const badge = (plan as { badge?: string }).badge;
            return (
              <div
                key={plan.id}
                className={`relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border ${
                  plan.popular ? 'border-amber-500/50 ring-2 ring-amber-500/20' : 'border-slate-700/50'
                } p-6 backdrop-blur-sm transition-all hover:scale-105 ${plan.id === 'ultimate' ? 'md:col-span-2 lg:col-span-1' : ''}`}
              >
                {(plan.popular || badge) && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg uppercase tracking-wider">
                      {badge || 'Popular'}
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-16 h-16 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center mb-6 shadow-lg`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Plan Details */}
                <h3 className="text-2xl font-medium text-white mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-light text-white">{plan.price}</span>
                  <span className="text-gray-400 ml-2">{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(plan.priceId, plan.id)}
                  disabled={loading === plan.id}
                  className={`w-full px-6 py-3 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                      : 'bg-gray-700 hover:bg-gray-600'
                  } text-white rounded-lg transition-all shadow-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : plan.id === 'free' ? (
                    'Start Free Trial'
                  ) : (
                    'Subscribe Now'
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-light text-white text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
              <h3 className="text-lg font-medium text-white mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-400">Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
              <h3 className="text-lg font-medium text-white mb-2">Is my data secure?</h3>
              <p className="text-gray-400">Absolutely. All data is encrypted and stored securely. We never share your personal information with third parties.</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
              <h3 className="text-lg font-medium text-white mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-400">We accept all major credit cards through our secure Stripe integration.</p>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm mb-4">Trusted by thousands of users worldwide</p>
          <div className="flex items-center justify-center gap-8 text-gray-600">
            <span>🔒 256-bit SSL</span>
            <span>✓ PCI Compliant</span>
            <span>🛡️ SOC 2 Certified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
