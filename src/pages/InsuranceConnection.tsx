import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart, Shield, Users, FileText, CheckCircle2, ArrowRight,
  Lock, Clock, Award, TrendingUp, DollarSign, Activity,
  ChevronRight, ArrowLeft, Info
} from 'lucide-react';

export default function InsuranceConnection() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const plans = [
    {
      id: 'life-insurance',
      name: 'Life Insurance',
      description: 'Comprehensive life insurance coverage with flexible terms',
      icon: Heart,
      color: 'from-rose-500/20 to-pink-500/20',
      borderColor: 'border-rose-500/30',
      iconColor: 'text-rose-400',
      features: [
        'Term and whole life options',
        'Coverage up to $5 million',
        'No medical exam required',
        'Instant policy decisions'
      ],
      benefits: ['Financial security for loved ones', 'Estate planning assistance', 'Tax-free death benefit']
    },
    {
      id: 'legacy-protection',
      name: 'Legacy Protection',
      description: 'Specialized coverage for digital legacy and estate planning',
      icon: Shield,
      color: 'from-emerald-500/20 to-teal-500/20',
      borderColor: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
      features: [
        'Digital asset protection',
        'Automated beneficiary notifications',
        'Legacy vault integration',
        'Multi-generational planning'
      ],
      benefits: ['Protect digital assets', 'Seamless inheritance transfer', 'Lifetime legacy management']
    },
    {
      id: 'beneficiary-management',
      name: 'Beneficiary Management',
      description: 'Advanced tools for managing and updating beneficiaries',
      icon: Users,
      color: 'from-sky-500/20 to-blue-500/20',
      borderColor: 'border-sky-500/30',
      iconColor: 'text-sky-400',
      features: [
        'Unlimited beneficiaries',
        'Percentage allocation tools',
        'Automatic updates',
        'Trust fund setup'
      ],
      benefits: ['Easy beneficiary changes', 'Fair distribution planning', 'Legal documentation support']
    },
    {
      id: 'claims-support',
      name: 'Claims Support',
      description: 'Expert assistance with filing and managing insurance claims',
      icon: FileText,
      color: 'from-amber-500/20 to-orange-500/20',
      borderColor: 'border-amber-500/30',
      iconColor: 'text-amber-400',
      features: [
        '24/7 claims assistance',
        'Expedited processing',
        'Document management',
        'Legal support included'
      ],
      benefits: ['Fast claim resolution', 'Dedicated support team', 'Stress-free process']
    }
  ];

  const trustFeatures = [
    {
      icon: Lock,
      title: 'Bank-Level Security',
      description: 'Your information is encrypted and protected with industry-leading security'
    },
    {
      icon: Clock,
      title: 'Instant Setup',
      description: 'Get started in minutes with our streamlined connection process'
    },
    {
      icon: Award,
      title: 'Trusted Partner',
      description: 'Certified and regulated insurance provider with A+ ratings'
    },
    {
      icon: TrendingUp,
      title: 'Transparent Pricing',
      description: 'No hidden fees, clear terms, and competitive premium rates'
    }
  ];

  const handleConnect = () => {
    if (selectedPlan) {
      navigate('/insurance');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/legacy-vault')}
          className="mb-6 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Legacy Vault
        </button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 border border-rose-500/30 mb-6">
            <Heart className="w-10 h-10 text-rose-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Welcome to Eternal Care Insurance
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Specialized life insurance and legacy protection plans designed to secure your family's future
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {trustFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-400">{feature.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Choose Your Coverage</h2>
            {selectedPlan && (
              <span className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
                Plan Selected
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isSelected = selectedPlan === plan.id;

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? `bg-gradient-to-br ${plan.color} ${plan.borderColor} ring-2 ring-offset-2 ring-offset-slate-950 ring-rose-500/50`
                      : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.color} border ${plan.borderColor} flex items-center justify-center`}>
                      <Icon className={`w-7 h-7 ${plan.iconColor}`} />
                    </div>
                    {isSelected && (
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{plan.description}</p>

                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Features</p>
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${plan.iconColor} flex-shrink-0`} />
                        <span className="text-sm text-slate-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-700/50">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Benefits</p>
                    <div className="space-y-1">
                      {plan.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${plan.iconColor}`} />
                          <span className="text-xs text-slate-400">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-800/30 border border-slate-700/50 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">What Happens Next?</h3>
              <p className="text-slate-400 text-sm">
                After selecting your coverage plan and clicking "Continue to Dashboard," you'll be taken to your personalized insurance management dashboard where you can:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-14">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/30 flex-shrink-0">
                <span className="text-rose-400 text-xs font-bold">1</span>
              </div>
              <div>
                <p className="text-white font-medium text-sm mb-1">Add Your Policies</p>
                <p className="text-slate-400 text-xs">Import existing policies or create new ones</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/30 flex-shrink-0">
                <span className="text-rose-400 text-xs font-bold">2</span>
              </div>
              <div>
                <p className="text-white font-medium text-sm mb-1">Manage Beneficiaries</p>
                <p className="text-slate-400 text-xs">Set up and update beneficiary information</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/30 flex-shrink-0">
                <span className="text-rose-400 text-xs font-bold">3</span>
              </div>
              <div>
                <p className="text-white font-medium text-sm mb-1">Track Everything</p>
                <p className="text-slate-400 text-xs">Monitor claims, payments, and documents</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate('/legacy-vault')}
            className="px-6 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white transition-all font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={!selectedPlan}
            className={`px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              selectedPlan
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg shadow-rose-500/20'
                : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
            }`}
          >
            Continue to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            By continuing, you agree to Eternal Care Insurance's terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}
