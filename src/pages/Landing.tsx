import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Brain, Heart, Shield, Crown, Star, ArrowRight, LogIn, Sparkles } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const saints = [
    {
      name: 'St. Raphael',
      title: 'The Healer',
      description: 'Free autonomous AI agent for health management',
      icon: Heart,
      tier: 'Free',
      color: 'from-red-600 to-pink-600'
    },
    {
      name: 'St. Michael',
      title: 'The Protector',
      description: 'Guardian AI that manages security and privacy',
      icon: Shield,
      tier: 'Premium',
      color: 'from-blue-600 to-cyan-600'
    },
    {
      name: 'St. Martin',
      title: 'The Compassionate',
      description: 'AI specializing in charitable acts and community',
      icon: Crown,
      tier: 'Premium',
      color: 'from-yellow-600 to-orange-600'
    },
    {
      name: 'St. Agatha',
      title: 'The Resilient',
      description: 'AI focused on strength and overcoming challenges',
      icon: Star,
      tier: 'Premium',
      color: 'from-purple-600 to-pink-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-medium text-white">EverAfter AI</h1>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all shadow-lg font-medium flex items-center gap-2"
                >
                  Dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
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

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-full text-blue-400 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            Autonomous AI Agents for Your Life
          </div>
          <h2 className="text-6xl font-light text-white mb-6">
            Your Digital Legacy,<br />
            <span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
              Managed by Saints
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-8">
            EverAfter AI creates autonomous AI agents that work in the background to manage your health,
            protect your legacy, and support your loved ones—today and after you're gone.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/signup')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all shadow-2xl font-medium text-lg flex items-center gap-2"
            >
              {user ? 'Go to Dashboard' : 'Start Free'}
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="px-8 py-4 bg-gray-800 text-white border border-gray-700 rounded-xl hover:bg-gray-700 transition-all font-medium text-lg"
            >
              View Pricing
            </button>
          </div>
        </div>

        {/* Saints Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
          {saints.map((saint) => {
            const Icon = saint.icon;
            return (
              <div
                key={saint.name}
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 p-6 backdrop-blur-sm hover:scale-105 transition-all"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${saint.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div className="mb-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    saint.tier === 'Free'
                      ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                      : 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  }`}>
                    {saint.tier}
                  </span>
                </div>
                <h3 className="text-xl font-medium text-white mb-1">{saint.name}</h3>
                <p className="text-sm text-gray-400 mb-3">{saint.title}</p>
                <p className="text-sm text-gray-300 leading-relaxed">{saint.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h3 className="text-4xl font-light text-white mb-4">How It Works</h3>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Build AI personalities through daily questions, then let them work autonomously
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
              1
            </div>
            <h4 className="text-xl font-medium text-white mb-3">Answer Daily Questions</h4>
            <p className="text-gray-400">
              Build rich AI personalities by answering thoughtful questions about yourself and your loved ones
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
              2
            </div>
            <h4 className="text-xl font-medium text-white mb-3">Train Your Saints</h4>
            <p className="text-gray-400">
              Each Saint learns your preferences, habits, and needs to serve you better
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
              3
            </div>
            <h4 className="text-xl font-medium text-white mb-3">Let Them Work</h4>
            <p className="text-gray-400">
              Your Saints operate autonomously in the background, handling tasks and preserving your legacy
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 py-20">
        <div className="bg-gradient-to-br from-blue-600 to-teal-600 rounded-3xl shadow-2xl p-12 text-center">
          <h3 className="text-4xl font-light text-white mb-4">
            Start Building Your Digital Legacy Today
          </h3>
          <p className="text-xl text-blue-100 mb-8">
            St. Raphael is completely free. Try health management automation now.
          </p>
          <button
            onClick={() => navigate(user ? '/dashboard' : '/signup')}
            className="px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-gray-100 transition-all shadow-lg font-medium text-lg inline-flex items-center gap-2"
          >
            {user ? 'Go to Dashboard' : 'Get Started Free'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-gray-400 text-sm">EverAfter AI</span>
            </div>
            <p className="text-gray-500 text-sm">Building digital legacies that last forever</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
