import React, { useEffect } from 'react';
import { Heart, Activity, TrendingUp, Users, Shield, Sparkles } from 'lucide-react';
import { attachEdgeReactive } from '../lib/edge-reactive';

export default function DarkGlassPanelShowcase() {
  useEffect(() => {
    const cleanup = attachEdgeReactive('.ea-panel');
    return cleanup;
  }, []);

  return (
    <div className="min-h-screen p-6 sm:p-8 space-y-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Dark Glass Panels
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Translucent panels with edge-reactive highlights that respond to cursor movement
          </p>
        </div>

        {/* Panel Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Default Panel */}
          <div className="ea-panel">
            <div className="relative z-10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Heart className="w-6 h-6 text-teal-400" />
                <h3 className="text-lg font-semibold text-white">Health Monitor</h3>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Track your vitals and health metrics in real-time with edge-reactive highlights.
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <span className="text-emerald-400 font-medium">Active</span>
              </div>
            </div>
          </div>

          {/* Gold Variant */}
          <div className="ea-panel" data-variant="gold">
            <div className="relative z-10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">Premium Features</h3>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Unlock advanced capabilities with gold-tinted edge highlights.
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Level</span>
                <span className="text-amber-400 font-medium">Premium</span>
              </div>
            </div>
          </div>

          {/* Emerald Variant */}
          <div className="ea-panel" data-variant="emerald">
            <div className="relative z-10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-semibold text-white">Activity Tracker</h3>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Monitor daily activities with emerald edge-reactive glow.
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Today</span>
                <span className="text-emerald-400 font-medium">8,432 steps</span>
              </div>
            </div>
          </div>

          {/* Stats Panel */}
          <div className="ea-panel">
            <div className="relative z-10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">Analytics</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Heart Rate</span>
                  <span className="text-white font-medium">72 bpm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Sleep Score</span>
                  <span className="text-white font-medium">85%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Active Hours</span>
                  <span className="text-white font-medium">6.5 hrs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Team Panel */}
          <div className="ea-panel" data-variant="gold">
            <div className="relative z-10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-6 h-6 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">Family Hub</h3>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Connect with family members and share health insights.
              </p>
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-[var(--glass-strong)]"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Security Panel */}
          <div className="ea-panel" data-variant="emerald">
            <div className="relative z-10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-semibold text-white">Security</h3>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Your data is encrypted and protected with advanced security.
              </p>
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Secure Connection</span>
              </div>
            </div>
          </div>
        </div>

        {/* Button Examples */}
        <div className="mt-12 space-y-6">
          <h2 className="text-2xl font-bold text-white text-center mb-6">
            Glass Buttons
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="ea-btn">
              Default Button
            </button>
            <button className="ea-btn flex items-center gap-2">
              <Heart className="w-4 h-4" />
              With Icon
            </button>
            <button className="ea-btn" disabled>
              Disabled
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="ea-panel mt-12">
          <div className="relative z-10 p-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              Edge-Reactive Highlights
            </h2>
            <p className="text-slate-400 mb-4">
              Move your cursor over the panels to see the edge-reactive glow effect. The highlight follows your cursor position, creating an immersive interactive experience.
            </p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-1">•</span>
                <span>Default panels have cyan/teal highlights</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                <span>Gold variant panels have warm amber highlights</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>Emerald variant panels have green highlights</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
