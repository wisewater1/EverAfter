import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  HelpCircle,
  Lightbulb,
  Phone,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Modal from './Modal';

interface TroubleshootingGuide {
  guide_id: string;
  device_type: string;
  device_name: string;
  issue_title: string;
  severity: string;
  guide_content: {
    overview: string;
    estimated_time: string;
    difficulty: string;
    prerequisites: string[];
  };
  success_rate: number;
  steps: TroubleshootingStep[];
}

interface TroubleshootingStep {
  step_number: number;
  title: string;
  description: string;
  type: string;
  action_required: string;
  expected_result: string;
  tips: string[];
  warning?: string;
  success_rate: number;
}

interface TroubleshootingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  deviceType: string;
  deviceName: string;
  deviceConnectionId?: string;
}

export default function TroubleshootingWizard({
  isOpen,
  onClose,
  deviceType,
  deviceName,
  deviceConnectionId
}: TroubleshootingWizardProps) {
  const [guides, setGuides] = useState<TroubleshootingGuide[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<TroubleshootingGuide | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepResults, setStepResults] = useState<Record<number, 'success' | 'failure' | 'skipped'>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [view, setView] = useState<'guides' | 'wizard' | 'diagnostics'>('guides');

  useEffect(() => {
    if (isOpen) {
      loadTroubleshootingGuides();
      if (deviceConnectionId) {
        createSession();
      }
    }
  }, [isOpen, deviceType]);

  const loadTroubleshootingGuides = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_troubleshooting_guide', {
          p_device_type: deviceType
        });

      if (error) throw error;
      setGuides(data || []);
    } catch (error) {
      console.error('Error loading guides:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('troubleshooting_sessions')
        .insert({
          user_id: user.id,
          device_connection_id: deviceConnectionId,
          device_type: deviceType,
          session_status: 'in_progress'
        })
        .select()
        .single();

      if (error) throw error;
      setSessionId(data.id);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const runAutomatedDiagnostics = async () => {
    if (!deviceConnectionId) return;

    setRunningDiagnostics(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .rpc('run_device_diagnostics', {
          p_user_id: user.id,
          p_device_connection_id: deviceConnectionId,
          p_session_id: sessionId
        });

      if (error) throw error;
      setDiagnosticResults(data);
      setView('diagnostics');
    } catch (error) {
      console.error('Error running diagnostics:', error);
    } finally {
      setRunningDiagnostics(false);
    }
  };

  const startGuide = (guide: TroubleshootingGuide) => {
    setSelectedGuide(guide);
    setCurrentStep(0);
    setStepResults({});
    setView('wizard');

    if (sessionId) {
      supabase
        .from('troubleshooting_sessions')
        .update({ guide_id: guide.guide_id })
        .eq('id', sessionId)
        .then();
    }
  };

  const recordStepResult = async (result: 'success' | 'failure' | 'skipped') => {
    setStepResults(prev => ({ ...prev, [currentStep]: result }));

    if (sessionId && selectedGuide) {
      const step = selectedGuide.steps[currentStep];
      await supabase.rpc('log_troubleshooting_attempt', {
        p_session_id: sessionId,
        p_step_id: step.step_number.toString(),
        p_action: step.title,
        p_result: result
      });
    }
  };

  const nextStep = async (result: 'success' | 'failure' | 'skipped') => {
    await recordStepResult(result);
    if (selectedGuide && currentStep < selectedGuide.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeSession = async (status: 'resolved' | 'unresolved') => {
    if (sessionId) {
      await supabase
        .from('troubleshooting_sessions')
        .update({
          session_status: 'completed',
          completed_at: new Date().toISOString(),
          resolution_status: status
        })
        .eq('id', sessionId);
    }
    onClose();
  };

  const renderGuidesList = () => (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">Troubleshooting Guides</h3>
          <p className="text-sm text-gray-400 mt-1">
            Select an issue that matches your problem
          </p>
        </div>
        {deviceConnectionId && (
          <button
            onClick={runAutomatedDiagnostics}
            disabled={runningDiagnostics}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center gap-2 min-h-[44px] disabled:opacity-50"
          >
            {runningDiagnostics ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Run Diagnostics
              </>
            )}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : guides.length === 0 ? (
        <div className="text-center py-12">
          <HelpCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No troubleshooting guides available for this device</p>
        </div>
      ) : (
        <div className="space-y-3">
          {guides.map((guide) => (
            <button
              key={guide.guide_id}
              onClick={() => startGuide(guide)}
              className="w-full bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl p-4 text-left transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle
                      className={`w-5 h-5 ${
                        guide.severity === 'high'
                          ? 'text-red-400'
                          : guide.severity === 'medium'
                          ? 'text-yellow-400'
                          : 'text-blue-400'
                      }`}
                    />
                    <h4 className="text-white font-medium">{guide.issue_title}</h4>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{guide.guide_content.overview}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {guide.success_rate}% success rate
                    </span>
                    <span>⏱️ {guide.guide_content.estimated_time}</span>
                    <span>📊 {guide.guide_content.difficulty}</span>
                    <span>{guide.steps?.length || 0} steps</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors flex-shrink-0 ml-4" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderWizard = () => {
    if (!selectedGuide) return null;

    const step = selectedGuide.steps[currentStep];
    const isLastStep = currentStep === selectedGuide.steps.length - 1;
    const progress = ((currentStep + 1) / selectedGuide.steps.length) * 100;

    return (
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-gray-700">
          <button
            onClick={() => setView('guides')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to guides
          </button>
          <h3 className="text-xl font-semibold text-white mb-2">{selectedGuide.issue_title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>
              Step {currentStep + 1} of {selectedGuide.steps.length}
            </span>
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">{currentStep + 1}</span>
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-white mb-2">{step.title}</h4>
                <p className="text-gray-300 leading-relaxed">{step.description}</p>
              </div>
            </div>

            {step.action_required && (
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-blue-300 mb-2">Action Required:</p>
                <p className="text-blue-200">{step.action_required}</p>
              </div>
            )}

            {step.expected_result && (
              <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-green-300 mb-2">Expected Result:</p>
                <p className="text-green-200">{step.expected_result}</p>
              </div>
            )}

            {step.warning && (
              <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4 mb-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-300 mb-1">Warning:</p>
                  <p className="text-yellow-200">{step.warning}</p>
                </div>
              </div>
            )}

            {step.tips && step.tips.length > 0 && (
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-purple-400" />
                  <p className="text-sm font-medium text-purple-300">Helpful Tips:</p>
                </div>
                <ul className="space-y-2">
                  {step.tips.map((tip, index) => (
                    <li key={index} className="text-sm text-purple-200 flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 bg-gray-900/50">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={previousStep}
              disabled={currentStep === 0}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => nextStep('skipped')}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all min-h-[44px]"
              >
                Skip
              </button>
              <button
                onClick={() => nextStep('failure')}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all flex items-center gap-2 min-h-[44px]"
              >
                <XCircle className="w-4 h-4" />
                Didn't Work
              </button>
              <button
                onClick={() =>
                  isLastStep ? completeSession('resolved') : nextStep('success')
                }
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all flex items-center gap-2 min-h-[44px]"
              >
                <CheckCircle className="w-4 h-4" />
                {isLastStep ? 'Complete' : 'Worked!'}
              </button>
            </div>
          </div>

          {isLastStep && (
            <button
              onClick={() => completeSession('unresolved')}
              className="w-full mt-3 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Phone className="w-4 h-4" />
              Still Having Issues - Contact Support
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderDiagnostics = () => {
    if (!diagnosticResults) return null;

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Diagnostic Results</h3>
          <button
            onClick={() => setView('guides')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className={`p-4 rounded-lg border ${
            diagnosticResults.overall_status === 'healthy'
              ? 'bg-green-900/20 border-green-500/30'
              : diagnosticResults.overall_status === 'warnings'
              ? 'bg-yellow-900/20 border-yellow-500/30'
              : 'bg-red-900/20 border-red-500/30'
          }`}
        >
          <p className="text-white font-medium mb-2">Overall Status</p>
          <p className="text-gray-300 capitalize">{diagnosticResults.overall_status}</p>
        </div>

        <div className="space-y-3">
          {diagnosticResults.tests?.map((test: any, index: number) => (
            <div
              key={index}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {test.result === 'pass' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : test.result === 'fail' ? (
                    <XCircle className="w-5 h-5 text-red-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  )}
                  <h4 className="text-white font-medium">{test.test_name}</h4>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    test.result === 'pass'
                      ? 'bg-green-500/20 text-green-300'
                      : test.result === 'fail'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-yellow-500/20 text-yellow-300'
                  }`}
                >
                  {test.result}
                </span>
              </div>
              {test.details && (
                <pre className="text-xs text-gray-400 mt-2 overflow-x-auto">
                  {JSON.stringify(test.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => setView('guides')}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all min-h-[44px]"
        >
          View Troubleshooting Guides
        </button>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={view === 'guides' ? `${deviceName} Troubleshooting` : undefined}
      size="xl"
      showCloseButton={view === 'guides'}
      className="h-[80vh]"
    >
      {view === 'guides' && renderGuidesList()}
      {view === 'wizard' && renderWizard()}
      {view === 'diagnostics' && renderDiagnostics()}
    </Modal>
  );
}
