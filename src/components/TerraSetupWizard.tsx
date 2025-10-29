import { useState } from 'react';
import { Check, X, AlertCircle, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ValidationResult {
  valid: boolean;
  message: string;
  details?: string;
}

export default function TerraSetupWizard() {
  const [step, setStep] = useState<'credentials' | 'webhook' | 'test' | 'complete'>('credentials');
  const [apiKey, setApiKey] = useState('');
  const [devId, setDevId] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const webhookUrl = `${supabaseUrl}/functions/v1/terra-webhook`;
  const baseUrl = window.location.origin;
  const successRedirect = `${baseUrl}/terra/return`;
  const failureRedirect = `${baseUrl}/health/devices`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const validateCredentials = async () => {
    setValidating(true);
    setValidation(null);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/terra-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'validate_credentials',
          api_key: apiKey,
          dev_id: devId,
          webhook_secret: webhookSecret,
        }),
      });

      const result = await response.json();

      if (response.ok && result.valid) {
        setValidation({
          valid: true,
          message: 'Credentials validated successfully!',
          details: result.details,
        });
        setTimeout(() => setStep('webhook'), 1500);
      } else {
        setValidation({
          valid: false,
          message: result.error || 'Invalid credentials',
          details: result.details,
        });
      }
    } catch (error) {
      setValidation({
        valid: false,
        message: 'Failed to validate credentials',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setValidating(false);
    }
  };

  const testWebhook = async () => {
    setValidating(true);
    setValidation(null);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/terra-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'test_webhook',
          webhook_secret: webhookSecret,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setValidation({
          valid: true,
          message: 'Webhook test successful!',
          details: result.details,
        });
        setTimeout(() => setStep('test'), 1500);
      } else {
        setValidation({
          valid: false,
          message: result.error || 'Webhook test failed',
          details: result.details,
        });
      }
    } catch (error) {
      setValidation({
        valid: false,
        message: 'Failed to test webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setValidating(false);
    }
  };

  const runIntegrationTest = async () => {
    setValidating(true);
    setValidation(null);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/terra-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'full_integration_test',
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setValidation({
          valid: true,
          message: 'Integration test passed!',
          details: result.details,
        });
        setTimeout(() => setStep('complete'), 1500);
      } else {
        setValidation({
          valid: false,
          message: result.error || 'Integration test failed',
          details: result.details,
        });
      }
    } catch (error) {
      setValidation({
        valid: false,
        message: 'Failed to run integration test',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Terra API Setup Wizard</h1>
          <p className="text-gray-400">Configure your Terra integration step by step</p>
        </div>

        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            <StepIndicator number={1} label="Credentials" active={step === 'credentials'} completed={step !== 'credentials'} />
            <div className="w-16 h-1 bg-gray-700" />
            <StepIndicator number={2} label="Webhook" active={step === 'webhook'} completed={step === 'test' || step === 'complete'} />
            <div className="w-16 h-1 bg-gray-700" />
            <StepIndicator number={3} label="Test" active={step === 'test'} completed={step === 'complete'} />
            <div className="w-16 h-1 bg-gray-700" />
            <StepIndicator number={4} label="Complete" active={step === 'complete'} completed={false} />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-8">
          {step === 'credentials' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Step 1: API Credentials</h2>
                <p className="text-gray-400 mb-6">
                  Get your credentials from{' '}
                  <a
                    href="https://dashboard.tryterra.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                  >
                    Terra Dashboard <ExternalLink className="w-4 h-4" />
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Developer ID
                </label>
                <input
                  type="text"
                  value={devId}
                  onChange={(e) => setDevId(e.target.value)}
                  placeholder="your-dev-id"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="your-api-key"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Webhook Secret
                </label>
                <input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="your-webhook-secret"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {validation && (
                <div
                  className={`p-4 rounded-lg border ${
                    validation.valid
                      ? 'bg-green-900/20 border-green-600 text-green-400'
                      : 'bg-red-900/20 border-red-600 text-red-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {validation.valid ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    <span className="font-medium">{validation.message}</span>
                  </div>
                  {validation.details && (
                    <p className="text-sm opacity-80 ml-7">{validation.details}</p>
                  )}
                </div>
              )}

              <button
                onClick={validateCredentials}
                disabled={!apiKey || !devId || !webhookSecret || validating}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {validating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Validate & Continue'
                )}
              </button>
            </div>
          )}

          {step === 'webhook' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Step 2: Configure Webhook</h2>
                <p className="text-gray-400 mb-6">
                  Add these URLs to your Terra Dashboard settings
                </p>
              </div>

              <div className="space-y-4">
                <CopyableField
                  label="Webhook URL"
                  value={webhookUrl}
                  copied={copied === 'webhook'}
                  onCopy={() => copyToClipboard(webhookUrl, 'webhook')}
                />

                <CopyableField
                  label="Success Redirect URL"
                  value={successRedirect}
                  copied={copied === 'success'}
                  onCopy={() => copyToClipboard(successRedirect, 'success')}
                />

                <CopyableField
                  label="Failure Redirect URL"
                  value={failureRedirect}
                  copied={copied === 'failure'}
                  onCopy={() => copyToClipboard(failureRedirect, 'failure')}
                />
              </div>

              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-300">
                    <p className="font-medium mb-1">Configuration Steps:</p>
                    <ol className="list-decimal list-inside space-y-1 opacity-80">
                      <li>Open Terra Dashboard → Settings → Webhooks</li>
                      <li>Add the Webhook URL above</li>
                      <li>Enable all event types</li>
                      <li>Go to Settings → OAuth</li>
                      <li>Add both redirect URLs</li>
                      <li>Save all changes</li>
                    </ol>
                  </div>
                </div>
              </div>

              {validation && (
                <div
                  className={`p-4 rounded-lg border ${
                    validation.valid
                      ? 'bg-green-900/20 border-green-600 text-green-400'
                      : 'bg-red-900/20 border-red-600 text-red-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {validation.valid ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    <span className="font-medium">{validation.message}</span>
                  </div>
                  {validation.details && (
                    <p className="text-sm opacity-80 ml-7">{validation.details}</p>
                  )}
                </div>
              )}

              <button
                onClick={testWebhook}
                disabled={validating}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {validating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Webhook & Continue'
                )}
              </button>
            </div>
          )}

          {step === 'test' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Step 3: Integration Test</h2>
                <p className="text-gray-400 mb-6">
                  Run a complete integration test to verify everything works
                </p>
              </div>

              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 space-y-4">
                <TestCheck label="Widget session creation" />
                <TestCheck label="Webhook signature verification" />
                <TestCheck label="Data normalization pipeline" />
                <TestCheck label="Database connectivity" />
                <TestCheck label="Edge function deployment" />
              </div>

              {validation && (
                <div
                  className={`p-4 rounded-lg border ${
                    validation.valid
                      ? 'bg-green-900/20 border-green-600 text-green-400'
                      : 'bg-red-900/20 border-red-600 text-red-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {validation.valid ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    <span className="font-medium">{validation.message}</span>
                  </div>
                  {validation.details && (
                    <p className="text-sm opacity-80 ml-7">{validation.details}</p>
                  )}
                </div>
              )}

              <button
                onClick={runIntegrationTest}
                disabled={validating}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {validating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  'Run Integration Test'
                )}
              </button>
            </div>
          )}

          {step === 'complete' && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-white" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Setup Complete!</h2>
                <p className="text-gray-400">
                  Your Terra integration is ready to use
                </p>
              </div>

              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-left">
                <h3 className="font-medium text-white mb-4">Next Steps:</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-400 mt-0.5" />
                    <span>Connect your first device from the Devices page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-400 mt-0.5" />
                    <span>View real-time metrics in the Health Dashboard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-400 mt-0.5" />
                    <span>Set up alerts for important health events</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-400 mt-0.5" />
                    <span>Explore AI-powered insights</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => window.location.href = '/health/devices'}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700"
                >
                  Go to Devices
                </button>
                <button
                  onClick={() => window.location.href = '/health'}
                  className="flex-1 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600"
                >
                  View Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ number, label, active, completed }: { number: number; label: string; active: boolean; completed: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold mb-2 transition-colors ${
          completed
            ? 'bg-green-600 text-white'
            : active
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-400'
        }`}
      >
        {completed ? <Check className="w-6 h-6" /> : number}
      </div>
      <span className={`text-sm ${active ? 'text-white font-medium' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}

function CopyableField({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          readOnly
          className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-sm"
        />
        <button
          onClick={onCopy}
          className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function TestCheck({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-gray-500" />
      </div>
      <span className="text-gray-300">{label}</span>
    </div>
  );
}
