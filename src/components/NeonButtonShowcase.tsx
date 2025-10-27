import React, { useState } from 'react';
import NeonButton from './NeonButton';
import { Play, Download, Save, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function NeonButtonShowcase() {
  const [loading, setLoading] = useState(false);

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">Neon Sparkle Buttons</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Production-ready minimalist buttons with elegant neon border effects and smooth sparkle animations
          </p>
        </div>

        <div className="space-y-16">
          {/* Variants Section */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-8">Color Variants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-800">
                <h3 className="text-white font-semibold mb-4">Primary</h3>
                <NeonButton variant="primary">Primary Button</NeonButton>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-800">
                <h3 className="text-white font-semibold mb-4">Secondary</h3>
                <NeonButton variant="secondary">Secondary Button</NeonButton>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-800">
                <h3 className="text-white font-semibold mb-4">Success</h3>
                <NeonButton variant="success">
                  <CheckCircle className="w-4 h-4" />
                  Success
                </NeonButton>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-800">
                <h3 className="text-white font-semibold mb-4">Warning</h3>
                <NeonButton variant="warning">
                  <AlertTriangle className="w-4 h-4" />
                  Warning
                </NeonButton>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-800">
                <h3 className="text-white font-semibold mb-4">Danger</h3>
                <NeonButton variant="danger">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </NeonButton>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-800">
                <h3 className="text-white font-semibold mb-4">Info</h3>
                <NeonButton variant="info">Info Button</NeonButton>
              </div>
            </div>
          </section>

          {/* Sizes Section */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-8">Size Variants</h2>
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-8 border border-slate-800">
              <div className="flex flex-wrap items-center gap-4">
                <NeonButton size="sm" variant="primary">Small</NeonButton>
                <NeonButton size="md" variant="primary">Medium</NeonButton>
                <NeonButton size="lg" variant="primary">Large</NeonButton>
              </div>
            </div>
          </section>

          {/* Sparkle Intensity Section */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-8">Sparkle Intensity</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-800">
                <h3 className="text-white font-semibold mb-4">Subtle</h3>
                <NeonButton sparkleIntensity="subtle" variant="primary">
                  Subtle Sparkle
                </NeonButton>
                <p className="text-gray-400 text-sm mt-3">Gentle, understated glow effect</p>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-800">
                <h3 className="text-white font-semibold mb-4">Normal</h3>
                <NeonButton sparkleIntensity="normal" variant="secondary">
                  Normal Sparkle
                </NeonButton>
                <p className="text-gray-400 text-sm mt-3">Balanced sparkle animation</p>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-800">
                <h3 className="text-white font-semibold mb-4">Intense</h3>
                <NeonButton sparkleIntensity="intense" variant="info">
                  Intense Sparkle
                </NeonButton>
                <p className="text-gray-400 text-sm mt-3">Dramatic, eye-catching effect</p>
              </div>
            </div>
          </section>

          {/* States Section */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-8">Interactive States</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-800">
                <h3 className="text-white font-semibold mb-4">Normal</h3>
                <NeonButton variant="primary">Click Me</NeonButton>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-800">
                <h3 className="text-white font-semibold mb-4">Loading</h3>
                <NeonButton variant="primary" loading={loading} onClick={handleLoadingDemo}>
                  {loading ? 'Loading...' : 'Load Data'}
                </NeonButton>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-800">
                <h3 className="text-white font-semibold mb-4">Disabled</h3>
                <NeonButton variant="primary" disabled>
                  Disabled
                </NeonButton>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-800">
                <h3 className="text-white font-semibold mb-4">With Icon</h3>
                <NeonButton variant="success">
                  <Play className="w-4 h-4" />
                  Play
                </NeonButton>
              </div>
            </div>
          </section>

          {/* Full Width Section */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-8">Full Width</h2>
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-800">
              <div className="space-y-4">
                <NeonButton variant="primary" fullWidth>
                  <Download className="w-4 h-4" />
                  Download Report
                </NeonButton>
                <NeonButton variant="success" fullWidth>
                  <Save className="w-4 h-4" />
                  Save Changes
                </NeonButton>
              </div>
            </div>
          </section>

          {/* Real-World Examples */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-8">Real-World Examples</h2>

            {/* CTA Banner */}
            <div className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-sm rounded-2xl p-12 border border-slate-700 mb-6">
              <div className="max-w-2xl mx-auto text-center">
                <h3 className="text-3xl font-bold text-white mb-4">
                  Ready to Get Started?
                </h3>
                <p className="text-gray-300 mb-8">
                  Join thousands of users who trust our platform for their health data management.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <NeonButton variant="primary" size="lg">
                    Start Free Trial
                  </NeonButton>
                  <NeonButton variant="secondary" size="lg">
                    View Demo
                  </NeonButton>
                </div>
              </div>
            </div>

            {/* Action Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-8 border border-slate-800">
                <h3 className="text-2xl font-bold text-white mb-3">Connect Your Devices</h3>
                <p className="text-gray-400 mb-6">
                  Sync data from Fitbit, Oura, Dexcom, and more health devices seamlessly.
                </p>
                <NeonButton variant="primary" fullWidth>
                  <Play className="w-4 h-4" />
                  Connect Now
                </NeonButton>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-8 border border-slate-800">
                <h3 className="text-2xl font-bold text-white mb-3">Premium Features</h3>
                <p className="text-gray-400 mb-6">
                  Unlock advanced analytics, AI insights, and unlimited storage.
                </p>
                <NeonButton variant="success" fullWidth sparkleIntensity="intense">
                  <CheckCircle className="w-4 h-4" />
                  Upgrade to Pro
                </NeonButton>
              </div>
            </div>
          </section>

          {/* Implementation Guide */}
          <section>
            <h2 className="text-3xl font-bold text-white mb-8">Implementation</h2>
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-8 border border-slate-800">
              <pre className="text-gray-300 overflow-x-auto">
                <code>{`import NeonButton from './components/NeonButton';

// Basic usage
<NeonButton variant="primary">
  Click Me
</NeonButton>

// With icon and loading state
<NeonButton
  variant="success"
  loading={isLoading}
  onClick={handleSubmit}
>
  <CheckCircle className="w-4 h-4" />
  Save
</NeonButton>

// Full width with intense sparkle
<NeonButton
  variant="primary"
  fullWidth
  sparkleIntensity="intense"
>
  Get Started
</NeonButton>`}</code>
              </pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
