import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Brain, Heart, Shield, Crown, Star, ArrowRight, LogIn, LogOut, LayoutDashboard, Sparkles } from 'lucide-react';

export default function Landing() {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();

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
              <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 safe-top">
                      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                                <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 sm:gap-3">
                                                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                          <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                                          </div>div>
                                                          <h1 className="text-base sm:text-xl font-medium text-white truncate">EverAfter AI</h1>h1>
                                            </div>div>
                                
                                            <div className="flex items-center gap-2 sm:gap-3">
                                              {user ? (
                          <>
                                            <button
                                                                  onClick={() => navigate('/dashboard')}
                                                                  className="px-4 sm:px-6 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all flex items-center gap-2 text-sm sm:text-base touch-target"
                                                                >
                                                                <LayoutDashboard className="w-4 h-4" />
                                                                <span className="hidden xs:inline">Dashboard</span>span>
                                            </button>button>
                                            <button
                                                                  onClick={async () => { await signOut(); navigate('/'); }}
                                                                  className="px-3 sm:px-4 py-2 text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:bg-gray-800 transition-all flex items-center gap-2 text-sm touch-target"
                                                                >
                                                                <LogOut className="w-4 h-4" />
                                                                <span className="hidden sm:inline">Sign Out</span>span>
                                            </button>button>
                          </>>
                        ) : (
                          <button
                                              onClick={() => navigate('/login')}
                                              className="px-4 sm:px-6 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all flex items-center gap-2 text-sm sm:text-base touch-target"
                                            >
                                            <LogIn className="w-4 h-4" />
                                            <span className="hidden xs:inline">Sign In</span>span>
                          </button>button>
                                                          )}
                                            </div>div>
                                </div>div>
                      </div>div>
              </header>header>
        
          {/* Hero Section */}
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
                      <div className="text-center mb-12 sm:mb-16">
                                <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600/20 border border-blue-500/30 rounded-full text-blue-400 text-xs sm:text-sm mb-4 sm:mb-6">
                                            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                                            Autonomous AI Agents for Your Life
                                </div>div>
                                <h2 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-light text-white mb-4 sm:mb-6 px-4">
                                            Your Digital Legacy,<br />
                                            <span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                                                          Managed by Saints
                                            </span>span>
                                </h2>h2>
                                <p className="text-base sm:text-lg lg:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-6 sm:mb-8 px-4">
                                            EverAfter AI creates autonomous AI agents that work in the background
                                            to manage your health, protect your legacy, and support your loved
                                            ones today and after you're gone.
                                </p>p>
                                <div className="flex items-center justify-center gap-3 sm:gap-4 px-4">
                                            <button
                                                            onClick={() => navigate(user ? '/dashboard' : '/signup')}
                                                            className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all shadow-2xl font-medium text-base sm:text-lg flex items-center gap-2 touch-target"
                                                          >
                                              {user ? 'Go to Dashboard' : 'Start Free'}
                                                          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                            </button>button>
                                </div>div>
                      </div>div>
              
                {/* Saints Grid */}
                      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-12 sm:mt-20">
                        {saints.map((saint) => {
                      const Icon = saint.icon;
                      return (
                                      <div
                                                        key={saint.name}
                                                        className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl sm:rounded-2xl shadow-2xl border border-gray-700/50 p-4 sm:p-6 backdrop-blur-sm hover:scale-105 transition-all"
                                                      >
                                                      <div className={`w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br ${saint.color} rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 shadow-lg`}>
                                                                        <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                                      </div>div>
                                                      <div className="mb-2">
                                                                        <span className={`inline-block px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                                                                            saint.tier === 'Free'
                                                                              ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                                                                              : 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                                                      }`}>
                                                                          {saint.tier}
                                                                        </span>span>
                                                      </div>div>
                                                      <h3 className="text-lg sm:text-xl font-medium text-white mb-1">{saint.name}</h3>h3>
                                                      <p className="text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3">{saint.title}</p>p>
                                                      <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">{saint.description}</p>p>
                                      </div>div>
                                    );
        })}
                      </div>div>
              </section>section>
        
          {/* Features Section */}
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
                      <div className="text-center mb-12 sm:mb-16">
                                <h3 className="text-3xl sm:text-4xl font-light text-white mb-3 sm:mb-4">How It Works</h3>h3>
                                <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto px-4">
                                            Build AI personalities through daily questions, then let them work autonomously
                                </p>p>
                      </div>div>
              
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                                <div className="bg-gray-800/50 rounded-xl sm:rounded-2xl border border-gray-700/50 p-6 sm:p-8 text-center">
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-xl sm:text-2xl font-bold text-white">
                                                          1
                                            </div>div>
                                            <h4 className="text-lg sm:text-xl font-medium text-white mb-2 sm:mb-3">Answer Daily Questions</h4>h4>
                                            <p className="text-sm sm:text-base text-gray-400">
                                                          Build rich AI personalities by answering thoughtful questions about yourself and your loved ones
                                            </p>p>
                                </div>div>
                      
                                <div className="bg-gray-800/50 rounded-xl sm:rounded-2xl border border-gray-700/50 p-6 sm:p-8 text-center">
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-xl sm:text-2xl font-bold text-white">
                                                          2
                                            </div>div>
                                            <h4 className="text-lg sm:text-xl font-medium text-white mb-2 sm:mb-3">Train Your Saints</h4>h4>
                                            <p className="text-sm sm:text-base text-gray-400">
                                                          Each Saint learns your preferences, habits, and needs to serve you better
                                            </p>p>
                                </div>div>
                      
                                <div className="bg-gray-800/50 rounded-xl sm:rounded-2xl border border-gray-700/50 p-6 sm:p-8 text-center">
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 text-xl sm:text-2xl font-bold text-white">
                                                          3
                                            </div>div>
                                            <h4 className="text-lg sm:text-xl font-medium text-white mb-2 sm:mb-3">Let Them Work</h4>h4>
                                            <p className="text-sm sm:text-base text-gray-400">
                                                          Your Saints operate autonomously in the background, handling tasks and preserving your legacy
                                            </p>p>
                                </div>div>
                      </div>div>
              </section>section>
        
          {/* Footer */}
              <footer className="border-t border-gray-800 mt-12 sm:mt-20 safe-bottom">
                      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                                <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 sm:gap-0">
                                            <div className="flex items-center gap-3">
                                                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                                                                          <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                                          </div>div>
                                                          <span className="text-gray-400 text-xs sm:text-sm">EverAfter AI</span>span>
                                            </div>div>
                                            <p className="text-gray-500 text-xs sm:text-sm text-center sm:text-right">Building digital legacies that last forever</p>p>
                                </div>div>
                      </div>div>
              </footer>footer>
        </div>div>
      );
}</></div>
