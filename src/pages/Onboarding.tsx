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
}

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    try {
      // Check if user has already completed onboarding
      const { data: profile } = await supabase
        .from('profiles')
        .select('has_completed_onboarding, onboarding_skipped')
        .eq('id', user?.id)
        .single();

      if (profile?.has_completed_onboarding || profile?.onboarding_skipped) {
        navigate('/dashboard');
        return;
      }

      // Get existing onboarding progress
      const { data: status } = await supabase
        .from('onboarding_status')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (status) {
        setCompletedSteps(status.completed_steps || []);
        // Resume from last incomplete step
        const lastCompleted = status.completed_steps?.[status.completed_steps.length - 1];
        if (lastCompleted) {
          const nextStepIndex = STEP_ORDER.indexOf(lastCompleted) + 1;
          if (nextStepIndex < STEP_ORDER.length) {
            setCurrentStep(STEP_ORDER[nextStepIndex]);
          }
        }
      } else {
        // Initialize onboarding for new user
        await supabase.from('onboarding_status').insert({
          user_id: user?.id,
          current_step: 1,
          completed_steps: [],
        });
      }

      // Load existing health demographics if any
      const { data: demographics } = await supabase
        .from('health_demographics')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (demographics) {
        setOnboardingData((prev) => ({
          ...prev,
          healthProfile: {
            dateOfBirth: demographics.date_of_birth,
            gender: demographics.gender,
            weightKg: demographics.weight_kg,
            heightCm: demographics.height_cm,
            healthConditions: demographics.health_conditions || [],
            allergies: demographics.allergies || [],
            healthGoals: demographics.health_goals || [],
            activityLevel: demographics.activity_level,
          },
        }));
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = async (step: OnboardingStep) => {
    setSaving(true);
    try {
      const newCompletedSteps = [...completedSteps, step];
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
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
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-6 sm:p-8">
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
  );
}
