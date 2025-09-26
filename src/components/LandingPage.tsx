import React from 'react';
import { Shield, Users, Calendar, ArrowRight, Check, Sparkles, Heart, Lock } from 'lucide-react';

// Dharma Wheel SVG Component
const DharmaWheel = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="22" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="6" y1="12" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="19.07" y1="4.93" x2="16.24" y2="7.76" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="7.76" y1="16.24" x2="4.93" y2="19.07" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="19.07" y1="19.07" x2="16.24" y2="16.24" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="7.76" y1="7.76" x2="4.93" y2="4.93" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const features = [
    {
      icon: DharmaWheel,
      title: 'Gentle Daily Questions',
      description: 'Thoughtfully crafted questions that help capture personality, values, and cherished memories over time.',
      color: 'blue'
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'End-to-end encryption, consent-based sharing, and full family control over all data and access.',
      color: 'green'
    },
    {
      icon: Users,
      title: 'Family Controlled',
      description: 'Families maintain complete ownership with ability to update, export, or delete all memories.',
      color: 'purple'
    },
    {
      icon: Sparkles,
      title: 'Saints AI Engrams',
      description: 'Autonomous AI assistants that handle responsibilities and provide support based on your wishes.',
      color: 'amber'
    }
  ];

  const principles = [
    'Consent is required for every interaction',
    'All data is encrypted and access-controlled',
    'Families own and control their memories',
    'Complete audit trail of all access',
    'One-click data export and deletion',
    'No exploitation of grief or emotion'
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'from-blue-50 to-blue-100 text-blue-600';
      case 'green': return 'from-green-50 to-green-100 text-green-600';
      case 'purple': return 'from-purple-50 to-purple-100 text-purple-600';
      case 'amber': return 'from-amber-50 to-amber-100 text-amber-600';
      default: return 'from-gray-50 to-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-8 pt-32 pb-24">
        <div className="text-center max-w-3xl mx-auto mb-24">
          <div className="flex items-center justify-center gap-4 mb-8">
            <DharmaWheel className="w-16 h-16 text-blue-600" />
            <div className="text-left">
              <h1 className="text-4xl font-light bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                EverAfter
              </h1>
              <p className="text-sm text-gray-500 mt-1">Digital Legacy Platform</p>
            </div>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-6 leading-tight">
            Preserve the voice, stories, and values of your loved ones
          </h2>
          
          <p className="text-xl text-gray-600 mb-12 leading-relaxed font-light max-w-2xl mx-auto">
            A privacy-first platform that captures precious memories through gentle daily questions, 
            creating a lasting digital legacy with consent and dignity at its core.
          </p>
          
          <button
            onClick={onGetStarted}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-2xl font-medium hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-teal-700"
          >
            Begin the Journey
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </div>

        {/* How it Works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="text-center group">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:shadow-md transition-all duration-300">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Daily Questions</h3>
            <p className="text-gray-600 leading-relaxed">Gentle daily questions capture stories and values over time, building a comprehensive portrait of your loved one.</p>
          </div>
          
          <div className="text-center group">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:shadow-md transition-all duration-300">
              <DharmaWheel className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Voice Learning</h3>
            <p className="text-gray-600 leading-relaxed">AI learns their unique voice and personality patterns, preserving their essence for future generations.</p>
          </div>
          
          <div className="text-center group">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:shadow-md transition-all duration-300">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Family Access</h3>
            <p className="text-gray-600 leading-relaxed">Approved family members access memories in beautiful memorial spaces with full privacy controls.</p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {features.map((feature, index) => (
            <div key={index} className="group bg-white rounded-2xl p-8 shadow-sm border border-gray-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-start gap-6">
                <div className={`w-12 h-12 bg-gradient-to-br ${getColorClasses(feature.color)} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Privacy Principles */}
        <div className="bg-white rounded-3xl p-12 shadow-xl border border-gray-100 mb-24">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Shield className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Privacy Promise</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Technology should protect memory, not exploit grief. Every choice is consent-first, privacy-first, and audit-logged.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {principles.map((principle, index) => (
              <div key={index} className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50/50 transition-colors duration-200">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700 font-medium">{principle}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-3xl p-12 text-white shadow-2xl">
            <div className="flex items-center justify-center gap-4 mb-6">
              <Heart className="w-8 h-8 text-white/80" />
              <Lock className="w-8 h-8 text-white/80" />
              <Sparkles className="w-8 h-8 text-white/80" />
            </div>
            <h2 className="text-3xl font-bold mb-6">Honor Memory with Technology That Cares</h2>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              Start preserving precious memories today with a platform designed for dignity, respect, and lasting legacy.
            </p>
            <button
              onClick={onGetStarted}
              className="group inline-flex items-center gap-4 px-10 py-5 bg-white text-blue-600 rounded-2xl font-semibold hover:bg-blue-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
            >
              Start Preserving Memories
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-200" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}