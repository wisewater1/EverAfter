/**
 * Edge Sparkle Button Showcase
 *
 * Demonstrates all variants and states of the EdgeSparkleButton component.
 */

import React from 'react';
import EdgeSparkleButton from './EdgeSparkleButton';
import { Heart, Star, Check, AlertTriangle, Info, Zap, Download, Upload, Send, Settings } from 'lucide-react';

export default function EdgeSparkleButtonShowcase() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">Edge Sparkle Button Showcase</h1>
          <p className="text-lg text-slate-400">
            Buttons with contrasting edge colors and elegant sparkle animations
          </p>
          <p className="text-sm text-slate-500">
            Hover over any button to see the sparkling edge effect
          </p>
        </div>

        {/* Color Variants */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white border-b border-slate-700 pb-2">
            Color Variants
          </h2>
          <div className="flex flex-wrap gap-4">
            <EdgeSparkleButton variant="primary" icon={<Zap />}>
              Primary
            </EdgeSparkleButton>
            <EdgeSparkleButton variant="secondary" icon={<Star />}>
              Secondary
            </EdgeSparkleButton>
            <EdgeSparkleButton variant="success" icon={<Check />}>
              Success
            </EdgeSparkleButton>
            <EdgeSparkleButton variant="warning" icon={<AlertTriangle />}>
              Warning
            </EdgeSparkleButton>
            <EdgeSparkleButton variant="danger" icon={<Heart />}>
              Danger
            </EdgeSparkleButton>
            <EdgeSparkleButton variant="info" icon={<Info />}>
              Info
            </EdgeSparkleButton>
          </div>
        </section>

        {/* Size Variants */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white border-b border-slate-700 pb-2">
            Size Variants
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <EdgeSparkleButton variant="primary" size="sm">
              Small Button
            </EdgeSparkleButton>
            <EdgeSparkleButton variant="primary" size="md">
              Medium Button
            </EdgeSparkleButton>
            <EdgeSparkleButton variant="primary" size="lg">
              Large Button
            </EdgeSparkleButton>
          </div>
        </section>

        {/* With Icons */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white border-b border-slate-700 pb-2">
            Buttons with Icons
          </h2>
          <div className="flex flex-wrap gap-4">
            <EdgeSparkleButton variant="primary" icon={<Download />}>
              Download
            </EdgeSparkleButton>
            <EdgeSparkleButton variant="success" icon={<Upload />}>
              Upload
            </EdgeSparkleButton>
            <EdgeSparkleButton variant="info" icon={<Send />}>
              Send Message
            </EdgeSparkleButton>
            <EdgeSparkleButton variant="secondary" icon={<Settings />}>
              Settings
            </EdgeSparkleButton>
          </div>
        </section>

        {/* States */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white border-b border-slate-700 pb-2">
            Button States
          </h2>
          <div className="flex flex-wrap gap-4">
            <EdgeSparkleButton variant="primary">
              Normal
            </EdgeSparkleButton>
            <EdgeSparkleButton variant="primary" disabled>
              Disabled
            </EdgeSparkleButton>
            <EdgeSparkleButton variant="primary" loading>
              Loading
            </EdgeSparkleButton>
          </div>
        </section>

        {/* Full Width */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white border-b border-slate-700 pb-2">
            Full Width Buttons
          </h2>
          <div className="space-y-3 max-w-md">
            <EdgeSparkleButton variant="primary" fullWidth icon={<Check />}>
              Full Width Primary
            </EdgeSparkleButton>
            <EdgeSparkleButton variant="success" fullWidth icon={<Heart />}>
              Full Width Success
            </EdgeSparkleButton>
            <EdgeSparkleButton variant="danger" fullWidth icon={<AlertTriangle />}>
              Full Width Danger
            </EdgeSparkleButton>
          </div>
        </section>

        {/* Interactive Demo */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white border-b border-slate-700 pb-2">
            Interactive Demo
          </h2>
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8">
            <div className="text-center space-y-6">
              <p className="text-slate-300">
                Click the button below to see it in action
              </p>
              <EdgeSparkleButton
                variant="primary"
                size="lg"
                icon={<Zap />}
                onClick={() => alert('Edge Sparkle Button clicked!')}
              >
                Click Me to See the Effect
              </EdgeSparkleButton>
            </div>
          </div>
        </section>

        {/* Comparison Grid */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white border-b border-slate-700 pb-2">
            Comparison Grid - All Variants
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {['primary', 'secondary', 'success', 'warning', 'danger', 'info'].map((variant) => (
              <div
                key={variant}
                className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-xl p-6 space-y-4"
              >
                <h3 className="text-lg font-semibold text-white capitalize">{variant}</h3>
                <div className="space-y-3">
                  <EdgeSparkleButton
                    variant={variant as any}
                    size="sm"
                    fullWidth
                  >
                    Small
                  </EdgeSparkleButton>
                  <EdgeSparkleButton
                    variant={variant as any}
                    size="md"
                    fullWidth
                  >
                    Medium
                  </EdgeSparkleButton>
                  <EdgeSparkleButton
                    variant={variant as any}
                    size="lg"
                    fullWidth
                  >
                    Large
                  </EdgeSparkleButton>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Technical Specifications */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white border-b border-slate-700 pb-2">
            Technical Specifications
          </h2>
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-xl p-6">
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Contrasting Edge:</strong> The button maintains its original background color
                  while the border uses a contrasting accent color
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Sparkle on Hover:</strong> When hovering, the edge border begins a continuous
                  sparkling animation that loops elegantly
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Smooth Transitions:</strong> All animations use CSS transitions with easing
                  functions for a polished feel
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Accessibility:</strong> Respects prefers-reduced-motion, includes focus states,
                  and maintains proper contrast ratios
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Performance:</strong> Uses GPU-accelerated animations and will-change hints
                  for optimal rendering
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Mobile Optimized:</strong> Touch targets meet accessibility guidelines (44px minimum)
                  and work perfectly on all devices
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Usage Example */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white border-b border-slate-700 pb-2">
            Usage Example
          </h2>
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-xl p-6">
            <pre className="text-sm text-slate-300 overflow-x-auto">
              <code>{`import EdgeSparkleButton from './components/EdgeSparkleButton';
import { Zap } from 'lucide-react';

function MyComponent() {
  return (
    <EdgeSparkleButton
      variant="primary"
      size="md"
      icon={<Zap />}
      onClick={() => console.log('Clicked!')}
    >
      Click Me
    </EdgeSparkleButton>
  );
}`}</code>
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
