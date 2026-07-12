import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { clearDemoAuth } from '../lib/demo-auth';
import { Brain, Heart, Shield, Users, Wallet, Search, ArrowRight, LogIn, Sparkles } from 'lucide-react';
import StarfieldBackground from '../components/StarfieldBackground';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';

export default function Landing() {
  const navigate = useNavigate();
  const { user, startDemoMode, isDemoMode } = useAuth();

  // The real product: make sure any lingering demo state is cleared, then
  // hard-load so the demo data interceptor is gone and the app boots for real.
  const enterRealApp = () => {
    try { clearDemoAuth(); } catch { /* ignore */ }
    window.location.href = user && !isDemoMode ? '/dashboard' : '/signup';
  };

  // The one true roster, must match SaintsNavigation and the in-app hubs.
  const saints = [
    {
      name: 'St. Michael',
      title: 'Protection & Security',
      description: 'Guards access, privacy, and permissions across your entire legacy, deciding who may see or act on what.',
      icon: Shield,
      tier: 'Premium',
      color: 'from-blue-500 to-sky-600',
    },
    {
      name: 'St. Joseph',
      title: 'Family coordination',
      description: 'Keeps your family connected: the shared family tree, calendars, tasks, and everyday care in one place.',
      icon: Users,
      tier: 'Premium',
      color: 'from-amber-500 to-orange-600',
    },
    {
      name: 'St. Raphael',
      title: 'Health & Healing',
      description: 'Your free health companion: device monitoring, gentle insights, and support through recovery and resilience.',
      icon: Heart,
      tier: 'Free',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      name: 'St. Gabriel',
      title: 'Finance & Trusteeship',
      description: 'Stewards budgets, accounts, and financial readiness for you today and for your designated successors.',
      icon: Wallet,
      tier: 'Premium',
      color: 'from-purple-500 to-violet-600',
    },
    {
      name: 'St. Anthony',
      title: 'Guidance',
      description: 'Finds what matters when you need it: guidance, records, and a clear audit trail across your whole account.',
      icon: Search,
      tier: 'Premium',
      color: 'from-rose-500 to-pink-600',
    },
  ];

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-[#06080c] via-[#0a0f15] to-[#0a1626]">
      {/* Living night sky behind the dark glass: parallax, constellations, touch-reactive */}
      <StarfieldBackground />
      <div className="relative z-10">
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
                  className={`px-6 py-2 min-h-11 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all shadow-lg font-medium flex items-center gap-2 ${focusRing}`}
                >
                  Dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className={`px-6 py-2 min-h-11 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all flex items-center gap-2 ${focusRing}`}
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
      <section className="max-w-7xl mx-auto px-4 py-12 sm:py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-full text-blue-400 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            Autonomous AI Agents for Your Life
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-light leading-tight text-white mb-6">
            Your Digital Legacy,<br />
            <span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
              Managed by Saints
            </span>
          </h2>
          <p className="text-base sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-8">
            Five Saints work quietly in the background to care for your health, protect your family,
            steward your finances, and carry your legacy forward for the people you love.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            {/* LEFT: the real, fully-developed app (no demo data). */}
            <button
              onClick={enterRealApp}
              className={`w-full sm:w-auto justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all shadow-2xl font-medium text-lg flex items-center gap-2 ${focusRing}`}
            >
              {user && !isDemoMode ? 'Go to Dashboard' : 'Start Free'}
              <ArrowRight className="w-5 h-5" />
            </button>
            {/* RIGHT: instant guided demo with sample data, no account needed. */}
            <button
              onClick={() => {
                startDemoMode();
                navigate('/dashboard');
              }}
              className={`w-full sm:w-auto justify-center px-8 py-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 rounded-xl hover:from-amber-300 hover:to-yellow-400 transition-all shadow-2xl font-semibold text-lg flex items-center gap-2 ${focusRing}`}
            >
              <Sparkles className="w-5 h-5" />
              See the Live Demo
            </button>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            The demo opens instantly with sample family data. No account needed.
          </p>
        </div>

        {/* Saints Grid: the real five */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mt-20">
          {saints.map((saint) => {
            const Icon = saint.icon;
            return (
              <div
                key={saint.name}
                className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 rounded-2xl shadow-2xl border border-gray-700/50 p-6 backdrop-blur-md transition-transform duration-200 lg:hover:scale-105"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${saint.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div className="mb-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${saint.tier === 'Free'
                    ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                    : 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                    }`}>
                    {saint.tier}
                  </span>
                </div>
                <h3 className="text-xl font-medium text-white mb-1">{saint.name}</h3>
                <p className="text-sm text-teal-300/90 mb-3">{saint.title}</p>
                <p className="text-sm text-gray-300 leading-relaxed">{saint.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 py-12 sm:py-20">
        <div className="text-center mb-16">
          <h3 className="text-3xl sm:text-4xl font-light text-white mb-4">How It Works</h3>
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

      {/* Trinity Section */}
      <section className="max-w-7xl mx-auto px-4 pb-12 sm:pb-20">
        <div className="bg-gray-800/40 rounded-3xl border border-gray-700/50 p-8 sm:p-12 text-center backdrop-blur-md">
          <h3 className="text-2xl sm:text-3xl font-light text-white mb-4">One Family, One Dashboard</h3>
          <p className="text-gray-400 max-w-3xl mx-auto leading-relaxed">
            The Trinity Dashboard brings all five Saints together around your family tree: a live Family
            Vitality Score built from family continuity, recovery and resilience, and financial readiness,
            with St. Michael governing who may see or act on each part.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
        <div className="bg-gradient-to-br from-blue-600 to-teal-600 rounded-3xl shadow-2xl p-8 sm:p-12 text-center">
          <h3 className="text-3xl sm:text-4xl font-light text-white mb-4">
            Start Building Your Digital Legacy Today
          </h3>
          <p className="text-lg sm:text-xl text-blue-100 mb-8">
            St. Raphael is completely free. Try health management automation now.
          </p>
          <button
            onClick={() => navigate(user ? '/dashboard' : '/signup')}
            className={`px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-gray-100 transition-all shadow-lg font-medium text-lg inline-flex items-center gap-2 ${focusRing}`}
          >
            {user ? 'Go to Dashboard' : 'Get Started Free'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-gray-400 text-sm">EverAfter AI</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <button onClick={() => navigate('/privacy')} className={`hover:text-gray-300 transition-colors ${focusRing}`}>Privacy</button>
              <button onClick={() => navigate('/terms')} className={`hover:text-gray-300 transition-colors ${focusRing}`}>Terms</button>
              <p>Building digital legacies that last</p>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
