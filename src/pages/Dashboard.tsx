import { Suspense, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bot, Brain, Heart, LogOut, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import MobileMenu from '../components/MobileMenu';
import SaintsNavigation from '../components/SaintsNavigation';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { loadStarterEngramDraft } from '../lib/onboardingDraft';
import { getOnboardingStatus } from '../lib/onboardingApi';
import { readStoredPersonalityProfile } from '../lib/joseph/personalityProfiles';

const UnifiedActivityCenter = lazyWithRetry(() => import('../components/UnifiedActivityCenter'), 'components/UnifiedActivityCenter');
const FamilyEngrams = lazyWithRetry(() => import('../components/FamilyEngrams'), 'components/FamilyEngrams');
const UnifiedFamilyInterface = lazyWithRetry(() => import('../components/UnifiedFamilyInterface'), 'components/UnifiedFamilyInterface');
const CustomEngramsDashboard = lazyWithRetry(() => import('../components/CustomEngramsDashboard'), 'components/CustomEngramsDashboard');
const UnifiedChatInterface = lazyWithRetry(() => import('../components/UnifiedChatInterface'), 'components/UnifiedChatInterface');
const SocietyFeed = lazyWithRetry(() => import('../components/SocietyFeed'), 'components/SocietyFeed');
const TrajectoryDashboard = lazyWithRetry(() => import('../components/TrajectoryDashboard'), 'components/TrajectoryDashboard');
const HolisticTimeline = lazyWithRetry(() => import('../components/HolisticTimeline'), 'components/HolisticTimeline');

const ONBOARDING_STEPS = [
  'Welcome',
  'Raphael',
  'Health',
  'Connect',
  'Permissions',
  'AI + Family',
];

interface OnboardingResumeState {
  visible: boolean;
  progressPercent: number;
  completedCount: number;
  currentLabel: string;
  skipped: boolean;
  lastUpdated: string | null;
}

interface PersonalityResumeState {
  visible: boolean;
  memberId: string | null;
  memberName: string;
  answered: number;
  total: number;
}

function DashboardSectionFallback({ label }: { label: string }) {
  return (
    <div className="rounded-2xl sm:rounded-3xl border border-slate-800/70 bg-slate-950/55 px-4 sm:px-6 py-5 sm:py-8 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
        <div>
          <p className="text-sm font-medium text-slate-200">{label}</p>
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.24em] text-slate-500">Loading</p>
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-4 w-5/6" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, signOut, loading, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState<'activities' | 'engrams' | 'chat'>('engrams');
  const [selectedAIId, setSelectedAIId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [onboardingResume, setOnboardingResume] = useState<OnboardingResumeState>({
    visible: false,
    progressPercent: 0,
    completedCount: 0,
    currentLabel: ONBOARDING_STEPS[0],
    skipped: false,
    lastUpdated: null,
  });
  const [loadingOnboardingResume, setLoadingOnboardingResume] = useState(true);
  const [secondaryPanelsReady, setSecondaryPanelsReady] = useState(false);
  const [personalityResume, setPersonalityResume] = useState<PersonalityResumeState>({
    visible: false,
    memberId: null,
    memberName: 'your primary family member',
    answered: 0,
    total: 50,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSelectAI = (aiId: string) => {
    setSelectedAIId(aiId);
    setSelectedView('engrams');
  };

  useEffect(() => {
    setSecondaryPanelsReady(false);
    const timer = window.setTimeout(() => {
      setSecondaryPanelsReady(true);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [selectedView, user?.id]);

  useEffect(() => {
    async function loadOnboardingResume() {
      if (isDemoMode) {
        setOnboardingResume({
          visible: false,
          progressPercent: 0,
          completedCount: 0,
          currentLabel: ONBOARDING_STEPS[0],
          skipped: false,
          lastUpdated: null,
        });
        setLoadingOnboardingResume(false);
        return;
      }

      if (!user?.id) {
        setLoadingOnboardingResume(false);
        return;
      }

      try {
        const bundle = await getOnboardingStatus();
        const profile = bundle?.profile || null;
        const status = bundle?.onboarding_status || null;

        const isComplete = Boolean(profile?.has_completed_onboarding || status?.onboarding_complete);
        const completedSteps = Array.isArray(status?.completed_steps) ? status.completed_steps : [];
        const currentStepIndex = Math.min(
          Math.max((status?.current_step ?? completedSteps.length + 1) - 1, 0),
          ONBOARDING_STEPS.length - 1,
        );

        setOnboardingResume({
          visible: !isComplete,
          progressPercent: Math.round((completedSteps.length / ONBOARDING_STEPS.length) * 100),
          completedCount: completedSteps.length,
          currentLabel: ONBOARDING_STEPS[currentStepIndex] ?? ONBOARDING_STEPS[0],
          skipped: Boolean(profile?.onboarding_skipped),
          lastUpdated: status?.last_step_at ?? null,
        });
      } catch (error) {
        console.error('Failed to load onboarding resume state:', error);
        setOnboardingResume({
          visible: false,
          progressPercent: 0,
          completedCount: 0,
          currentLabel: ONBOARDING_STEPS[0],
          skipped: false,
          lastUpdated: null,
        });
      } finally {
        setLoadingOnboardingResume(false);
      }
    }

    if (!loading) {
      loadOnboardingResume();
    }
  }, [user?.id, loading, isDemoMode]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const starterDraft = loadStarterEngramDraft(user.id);
    const primaryMemberId = starterDraft?.primaryMemberId || null;
    const storedProfile = primaryMemberId ? readStoredPersonalityProfile<any>(primaryMemberId) : null;
    const answered = Number.isFinite(storedProfile?.answered) ? storedProfile.answered : Object.keys(starterDraft?.personalityQuiz?.answers || {}).length;
    const total = Number.isFinite(storedProfile?.total_questions) ? storedProfile.total_questions : 50;
    const hasDetailedProfile = answered >= total && total >= 50;

    setPersonalityResume({
      visible: Boolean(primaryMemberId) && !hasDetailedProfile,
      memberId: primaryMemberId,
      memberName: starterDraft?.familySetup?.selfName?.trim() || storedProfile?.member_name || 'your primary family member',
      answered,
      total,
    });
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-4">
        <div className="text-center animate-fadeIn">
          <div className="relative mx-auto mb-5 w-14 h-14">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-sky-500/20 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-700 border-t-emerald-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-400">Loading dashboard</p>
          <div className="mt-3 flex justify-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const navItems = [
    { id: 'engrams', label: 'Engrams', icon: Bot },
    { id: 'trinity', label: 'Trinity', icon: Sparkles },
  ];

  const handleNavigateToLegacy = () => {
    navigate('/legacy-vault');
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col animate-page-enter">
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigateToLegacy={() => navigate('/legacy-vault')}
        onNavigateToTrinity={() => navigate('/trinity')}
        onSignOut={handleSignOut}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-2xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-lg active:bg-slate-800/50"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <div className="relative">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950" />
              </div>
              <h1 className="text-sm sm:text-lg font-medium text-white tracking-tight">EverAfter AI</h1>
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => navigate('/legacy-vault')}
                className="relative px-4 py-2 bg-slate-900/40 backdrop-blur-xl border border-purple-500/30 hover:border-purple-400/50 text-white rounded-xl transition-all flex items-center gap-2 text-sm font-medium shadow-lg shadow-purple-500/10 hover:shadow-purple-500/30 hover:bg-slate-900/60 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Heart className="w-4 h-4 relative z-10 text-purple-400 group-hover:text-purple-300" />
                <span className="relative z-10">Legacy Vault</span>
              </button>
              <button
                onClick={handleSignOut}
                className="relative px-4 py-2 bg-slate-900/40 backdrop-blur-xl border border-slate-600/30 hover:border-slate-500/50 text-slate-300 hover:text-white rounded-xl transition-all flex items-center gap-2 text-sm font-medium shadow-lg shadow-slate-900/20 hover:shadow-slate-700/30 hover:bg-slate-900/60 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-slate-800/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <LogOut className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{isDemoMode ? 'Exit Demo' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="sticky top-[49px] sm:top-[57px] z-40 bg-black/40 backdrop-blur-xl border-b border-slate-800/30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = selectedView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'trinity') {
                      navigate('/trinity');
                    } else {
                      setSelectedView(item.id as any);
                    }
                  }}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group relative flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg transition-all duration-200 ${isActive
                    ? 'text-white bg-slate-800/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20 active:bg-slate-800/30'
                    }`}
                >
                  <Icon
                    className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-all duration-200 ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-400'
                      }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className={`text-xs sm:text-sm font-medium transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-28 sm:pb-32 safe-bottom w-full">
        <div className="space-y-4 sm:space-y-8">
          {!loadingOnboardingResume && onboardingResume.visible && (
            <section className="relative overflow-hidden rounded-3xl border border-cyan-400/15 bg-slate-950/65 px-6 py-6 shadow-[0_0_0_1px_rgba(15,23,42,0.45),0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.14),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(129,140,248,0.12),_transparent_28%)]" />
              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
                        Setup Progress
                      </p>
                      <h2 className="text-xl font-semibold text-white">
                        {onboardingResume.skipped ? 'Resume onboarding' : 'Continue onboarding'}
                      </h2>
                    </div>
                  </div>
                  <p className="max-w-2xl text-sm text-slate-300">
                    The dashboard is available, but your core setup is not finished yet. Resume onboarding to complete
                    Raphael, Joseph, health, permissions, and AI-family setup.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-300">
                      {onboardingResume.progressPercent}% complete
                    </span>
                    <span>{onboardingResume.completedCount} of {ONBOARDING_STEPS.length} steps complete</span>
                    <span className="text-slate-400">Current step: {onboardingResume.currentLabel}</span>
                  </div>
                  <div className="h-2.5 w-full max-w-2xl overflow-hidden rounded-full bg-slate-900/70">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 shadow-[0_0_18px_rgba(56,189,248,0.45)] transition-all"
                      style={{ width: `${Math.max(onboardingResume.progressPercent, 6)}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ONBOARDING_STEPS.map((step, index) => {
                      const isDone = index < onboardingResume.completedCount;
                      const isCurrent = step === onboardingResume.currentLabel;

                      return (
                        <span
                          key={step}
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${
                            isDone
                              ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                              : isCurrent
                                ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200'
                                : 'border-slate-700/70 bg-slate-900/60 text-slate-400'
                          }`}
                        >
                          {step}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                  {onboardingResume.lastUpdated && (
                    <p className="text-xs text-slate-400">
                      Last updated {new Date(onboardingResume.lastUpdated).toLocaleString()}
                    </p>
                  )}
                  <button
                    onClick={() => navigate('/onboarding')}
                    className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-400/15"
                  >
                    Resume onboarding
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {!loadingOnboardingResume && !onboardingResume.visible && personalityResume.visible && personalityResume.memberId && (
            <section className="relative overflow-hidden rounded-3xl border border-violet-400/15 bg-slate-950/65 px-6 py-6 shadow-[0_0_0_1px_rgba(15,23,42,0.45),0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(168,85,247,0.14),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(34,211,238,0.1),_transparent_28%)]" />
              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-violet-300">
                      <Brain className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-300/80">
                        Joseph Personality
                      </p>
                      <h2 className="text-xl font-semibold text-white">Continue the full OCEAN assessment</h2>
                    </div>
                  </div>
                  <p className="max-w-2xl text-sm text-slate-300">
                    Onboarding created a starter personality seed for {personalityResume.memberName}. The detailed 50-question Joseph assessment is where Delphi, Trinity, and family predictions get their full behavioral profile.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                    <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-violet-300">
                      {Math.min(Math.round((personalityResume.answered / Math.max(personalityResume.total, 1)) * 100), 100)}% complete
                    </span>
                    <span>{personalityResume.answered} of {personalityResume.total} questions answered</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/family-dashboard?tab=quiz&memberId=${encodeURIComponent(personalityResume.memberId!)}`)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-400/10 px-5 py-3 text-sm font-medium text-violet-100 transition hover:border-violet-300/35 hover:bg-violet-400/15"
                >
                  Open Joseph quiz
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}

          {selectedView === 'activities' && (
            <div className="space-y-4 sm:space-y-8">
              <Suspense fallback={<DashboardSectionFallback label="Holistic Timeline" />}>
                <HolisticTimeline />
              </Suspense>
              {secondaryPanelsReady ? (
                <>
                  <Suspense fallback={<DashboardSectionFallback label="Society Feed" />}>
                    <SocietyFeed />
                  </Suspense>
                  <Suspense fallback={<DashboardSectionFallback label="Unified Activity Center" />}>
                    <UnifiedActivityCenter />
                  </Suspense>
                </>
              ) : (
                <>
                  <DashboardSectionFallback label="Society Feed" />
                  <DashboardSectionFallback label="Unified Activity Center" />
                </>
              )}
            </div>
          )}
          {selectedView === 'engrams' && (
            <>
              <Suspense fallback={<DashboardSectionFallback label="Trajectory Dashboard" />}>
                <TrajectoryDashboard userId={user.id} />
              </Suspense>
              {secondaryPanelsReady ? (
                <>
                  <Suspense fallback={<DashboardSectionFallback label="Family Engrams" />}>
                    <FamilyEngrams />
                  </Suspense>
                  <Suspense fallback={<DashboardSectionFallback label="Family Hub" />}>
                    <UnifiedFamilyInterface userId={user.id} onNavigateToLegacy={handleNavigateToLegacy} preselectedAIId={selectedAIId || undefined} />
                  </Suspense>
                  <Suspense fallback={<DashboardSectionFallback label="Engram Training Center" />}>
                    <CustomEngramsDashboard userId={user.id} onSelectAI={handleSelectAI} />
                  </Suspense>
                </>
              ) : (
                <>
                  <DashboardSectionFallback label="Family Engrams" />
                  <DashboardSectionFallback label="Family Hub" />
                  <DashboardSectionFallback label="Engram Training Center" />
                </>
              )}
            </>
          )}

          {selectedView === 'chat' && (
            <>
              <Suspense fallback={<DashboardSectionFallback label="Unified Chat Interface" />}>
                <UnifiedChatInterface />
              </Suspense>
            </>
          )}
        </div>

        {/* Scroll sentinel for testing */}
        <div id="scroll-end" className="h-1 w-1 opacity-0 pointer-events-none" aria-hidden="true"></div>
      </main>

      {/* Saints Navigation - Fixed Bottom */}
      <SaintsNavigation />
    </div>
  );
}
