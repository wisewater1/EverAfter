import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import OnboardingProgress from '../components/onboarding/OnboardingProgress';
import WelcomeStep from '../components/onboarding/WelcomeStep';
import MeetRaphaelStep from '../components/onboarding/MeetRaphaelStep';
import HealthProfileStep from '../components/onboarding/HealthProfileStep';
import HealthConnectionStep from '../components/onboarding/HealthConnectionStep';
import MediaPermissionsStep from '../components/onboarding/MediaPermissionsStep';
import FirstEngramStep from '../components/onboarding/FirstEngramStep';
import OnboardingComplete from '../components/onboarding/OnboardingComplete';
import { Loader2 } from 'lucide-react';
import { withTimeout } from '../lib/withTimeout';
import { loadHealthProfileDraft } from '../lib/onboardingDraft';

export type OnboardingStep =
  | 'welcome'
  | 'meet_raphael'
  | 'health_profile'
  | 'health_connections'
  | 'media_permissions'
  | 'first_engram'
  | 'complete';

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'meet_raphael',
  'health_profile',
  'health_connections',
  'media_permissions',
  'first_engram',
  'complete',
];

export interface OnboardingData {
  healthProfile: {
    dateOfBirth?: string;
    gender?: string;
    weightKg?: number;
    heightCm?: number;
    healthConditions: string[];
    allergies: string[];
    healthGoals: string[];
    activityLevel?: string;
  };
  mediaConsent: {
    photoLibraryAccess: boolean;
    cameraAccess: boolean;
    videoAccess: boolean;
    allowFaceDetection: boolean;
    allowExpressionAnalysis: boolean;
  };
  firstEngram?: {
    name: string;
    archetype: string;
  };
  personalityQuiz: {
    answers: Record<string, number>;
    scores?: Record<string, number>;
  };
  familySetup: {
    selfName?: string;
    relatives: Array<{
      id: string;
      firstName: string;
      lastName: string;
      relationship: 'parent' | 'sibling' | 'spouse' | 'child';
      birthYear?: string;
    }>;
  };
}

export default function Onboarding() {
  const ONBOARDING_LOAD_TIMEOUT_MS = 7000;
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    healthProfile: {
      healthConditions: [],
      allergies: [],
      healthGoals: [],
    },
    mediaConsent: {
      photoLibraryAccess: false,
      cameraAccess: false,
      videoAccess: false,
      allowFaceDetection: false,
      allowExpressionAnalysis: false,
    },
    personalityQuiz: {
      answers: {},
    },
    familySetup: {
      relatives: [],
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      checkOnboardingStatus();
    }
  }, [user, authLoading, navigate]);

  const checkOnboardingStatus = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      if (!supabase) {
        setLoadWarning('Supabase is unavailable. Onboarding is running in limited mode.');
        return;
      }

      // Check if user has already completed onboarding
      const [{ data: profile }, { data: status }, { data: demographics }] = await Promise.all([
        withTimeout(
          supabase
            .from('profiles')
            .select('has_completed_onboarding, onboarding_skipped')
            .eq('id', user.id)
            .maybeSingle(),
          ONBOARDING_LOAD_TIMEOUT_MS,
          'Timed out while loading the profile'
        ),
        withTimeout(
          supabase
            .from('onboarding_status')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          ONBOARDING_LOAD_TIMEOUT_MS,
          'Timed out while loading onboarding status'
        ),
        withTimeout(
          supabase
            .from('health_demographics')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          ONBOARDING_LOAD_TIMEOUT_MS,
          'Timed out while loading health demographics'
        ),
      ]);

      if (profile?.has_completed_onboarding) {
        navigate('/dashboard');
        return;
      }

      if (status) {
        setCompletedSteps(status.completed_steps || []);
        const savedStepIndex = Math.max((status.current_step ?? 1) - 1, 0);
        const savedStep = STEP_ORDER[Math.min(savedStepIndex, STEP_ORDER.length - 2)];

        if (savedStep) {
          setCurrentStep(savedStep);
        }
      } else {
        // Initialize onboarding for new user
        void supabase.from('onboarding_status').insert({
          user_id: user.id,
          current_step: 1,
          completed_steps: [],
        });
      }

      const healthProfileFromDatabase = demographics
        ? {
            dateOfBirth: demographics.date_of_birth,
            gender: demographics.gender,
            weightKg: demographics.weight_kg,
            heightCm: demographics.height_cm,
            healthConditions: demographics.health_conditions || [],
            allergies: demographics.allergies || [],
            healthGoals: demographics.health_goals || [],
            activityLevel: demographics.activity_level,
          }
        : null;

      const healthProfileDraft = loadHealthProfileDraft(user.id);

      if (healthProfileFromDatabase || healthProfileDraft) {
        setOnboardingData((prev) => ({
          ...prev,
          healthProfile: {
            ...prev.healthProfile,
            ...(healthProfileFromDatabase || {}),
            ...(healthProfileDraft || {}),
          },
        }));

        if (healthProfileDraft && !healthProfileFromDatabase) {
          setLoadWarning(
            'Recovered an unsynced health profile draft from this device. Continue onboarding to retry cloud save.'
          );
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setLoadWarning('Onboarding loaded in recovery mode. Progress details may be delayed, but you can continue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && loading) {
      const watchdog = window.setTimeout(() => {
        console.warn('Onboarding: Loading watchdog released spinner');
        setLoadWarning('Onboarding took too long to load. Recovery mode is active.');
        setLoading(false);
      }, ONBOARDING_LOAD_TIMEOUT_MS + 2000);

      return () => clearTimeout(watchdog);
    }
  }, [authLoading, loading]);

  const handleStepComplete = async (step: OnboardingStep) => {
    setSaving(true);
    try {
      const newCompletedSteps = Array.from(new Set([...completedSteps, step]));
      setCompletedSteps(newCompletedSteps);

      // Update onboarding status in database
      await supabase
        .from('onboarding_status')
        .update({
          completed_steps: newCompletedSteps,
          current_step: STEP_ORDER.indexOf(step) + 2,
          last_step_at: new Date().toISOString(),
          [`${step}_completed`]: true,
        })
        .eq('user_id', user?.id);

      // Move to next step
      const currentIndex = STEP_ORDER.indexOf(step);
      if (currentIndex < STEP_ORDER.length - 1) {
        setCurrentStep(STEP_ORDER[currentIndex + 1]);
      }
    } catch (error) {
      console.error('Error saving step progress:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      const skippedStepIndex = Math.max(STEP_ORDER.indexOf(currentStep), 0) + 1;

      // Mark onboarding as skipped
      await supabase
        .from('profiles')
        .update({
          onboarding_skipped: true,
          onboarding_skipped_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      await supabase
        .from('onboarding_status')
        .update({
          skipped_steps: [...(completedSteps.length > 0 ? [] : STEP_ORDER.slice(0, -1))],
          skip_reason: 'User chose to skip',
          current_step: skippedStepIndex,
          last_step_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id);

      navigate('/dashboard');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Mark onboarding as complete
      await supabase
        .from('onboarding_status')
        .update({
          onboarding_complete: true,
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id);

      await supabase
        .from('profiles')
        .update({
          has_completed_onboarding: true,
          onboarding_skipped: false,
        })
        .eq('id', user?.id);

      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateOnboardingData = (updates: Partial<OnboardingData>) => {
    setOnboardingData((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const totalSteps = STEP_ORDER.length - 1; // Exclude 'complete' from count

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_28%),radial-gradient(circle_at_80%_10%,_rgba(129,140,248,0.18),_transparent_24%),linear-gradient(180deg,_#050816_0%,_#070b16_48%,_#04070f_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px] opacity-20" />
      <div className="relative max-w-6xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        {currentStep !== 'complete' && (
          <OnboardingProgress
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
            completedSteps={completedSteps}
            stepLabels={STEP_ORDER.slice(0, -1)}
          />
        )}

        {/* Skip Button */}
        {currentStep !== 'complete' && currentStep !== 'welcome' && (
          <div className="flex justify-end mb-4">
            <button
              onClick={handleSkip}
              disabled={saving}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Step Content */}
        <div className="relative overflow-hidden rounded-[32px] border border-cyan-400/10 bg-slate-950/55 p-6 shadow-[0_0_0_1px_rgba(15,23,42,0.45),0_24px_120px_rgba(2,6,23,0.75)] backdrop-blur-2xl sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(168,85,247,0.08),_transparent_26%)]" />
          <div className="relative">
          {loadWarning && (
            <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              {loadWarning}
            </div>
          )}
          {currentStep === 'welcome' && (
            <WelcomeStep
              onNext={() => handleStepComplete('welcome')}
              onSkip={handleSkip}
              saving={saving}
            />
          )}

          {currentStep === 'meet_raphael' && (
            <MeetRaphaelStep
              onNext={() => handleStepComplete('meet_raphael')}
              onBack={handleBack}
              saving={saving}
            />
          )}

          {currentStep === 'health_profile' && (
            <HealthProfileStep
              data={onboardingData.healthProfile}
              onUpdate={(healthProfile) => updateOnboardingData({ healthProfile })}
              onNext={() => handleStepComplete('health_profile')}
              onBack={handleBack}
              saving={saving}
              userId={user?.id || ''}
            />
          )}

          {currentStep === 'health_connections' && (
            <HealthConnectionStep
              onNext={() => handleStepComplete('health_connections')}
              onBack={handleBack}
              saving={saving}
            />
          )}

          {currentStep === 'media_permissions' && (
            <MediaPermissionsStep
              data={onboardingData.mediaConsent}
              onUpdate={(mediaConsent) => updateOnboardingData({ mediaConsent })}
              onNext={() => handleStepComplete('media_permissions')}
              onBack={handleBack}
              saving={saving}
              userId={user?.id || ''}
            />
          )}

          {currentStep === 'first_engram' && (
            <FirstEngramStep
              data={{
                firstEngram: onboardingData.firstEngram,
                personalityQuiz: onboardingData.personalityQuiz,
                familySetup: onboardingData.familySetup,
              }}
              hasHealthProfile={
                Boolean(onboardingData.healthProfile.dateOfBirth) ||
                Boolean(onboardingData.healthProfile.gender) ||
                Boolean(onboardingData.healthProfile.weightKg) ||
                Boolean(onboardingData.healthProfile.heightCm) ||
                onboardingData.healthProfile.healthConditions.length > 0 ||
                onboardingData.healthProfile.allergies.length > 0 ||
                onboardingData.healthProfile.healthGoals.length > 0
              }
              onUpdate={(firstEngramData) =>
                updateOnboardingData({
                  firstEngram: firstEngramData.firstEngram,
                  personalityQuiz: firstEngramData.personalityQuiz,
                  familySetup: firstEngramData.familySetup,
                })
              }
              userId={user?.id || ''}
              userEmail={user?.email || ''}
              userName={
                user?.user_metadata?.full_name ||
                user?.user_metadata?.name ||
                user?.email?.split('@')[0] ||
                ''
              }
              onNext={() => handleStepComplete('first_engram')}
              onBack={handleBack}
              onSkip={() => {
                setCurrentStep('complete');
              }}
              saving={saving}
            />
          )}

          {currentStep === 'complete' && (
            <OnboardingComplete onFinish={handleComplete} saving={saving} />
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
