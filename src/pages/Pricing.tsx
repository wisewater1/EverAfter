import React, { useState } from 'react';
import { Check, Zap, Crown, Sparkles, Loader, LogIn, Brain } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const plans = [
  {
    id: 'free',
    name: 'Free Trial',
    price: '$0',
    period: '14 days',
    description: 'Perfect for trying out the platform',
    features: [
      '1 AI personality',
      '30 daily questions',
      'Basic chat interface',
      'Email support',
      '14-day trial period',
    ],
    icon: Sparkles,
    color: 'from-gray-600 to-gray-700',
    priceId: null,
  },
  {
    id: 'pro',
    name: 'Professional',
    price: '$29',
    period: '/month',
    description: 'For serious AI personality builders',
    features: [
      'Unlimited AI personalities',
      'Unlimited questions',
      'Advanced chat with memory',
      'Task automation',
      'Priority support',
      'Export capabilities',
    ],
    icon: Zap,
    color: 'from-blue-600 to-blue-700',
    priceId: 'price_1234567890', // Replace with actual Stripe price ID
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$99',
    period: '/month',
    description: 'For teams and organizations',
    features: [
      'Everything in Professional',
      'Team collaboration',
      'Custom integrations',
      'Dedicated support',
      'Custom AI training',
      'White-label options',
      'SLA guarantee',
    ],
    icon: Crown,
    color: 'from-purple-600 to-purple-700',
    priceId: 'price_0987654321', // Replace with actual Stripe price ID
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
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-medium text-white">EverAfter AI</h1>
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

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border ${
                  plan.popular ? 'border-blue-500/50 ring-2 ring-blue-500/20' : 'border-gray-700/50'
                } p-8 backdrop-blur-sm transition-all hover:scale-105`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
                      Most Popular
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
