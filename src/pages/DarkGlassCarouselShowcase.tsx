import React from 'react';
import DarkGlassCarousel from '../components/DarkGlassCarousel';
import { Sparkles } from 'lucide-react';

export default function DarkGlassCarouselShowcase() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="pt-12 pb-8 px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-md border border-slate-600/30">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            Dark Glass Carousel
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            A premium glass morphism component with automatic rotation, smooth transitions, and elegant interactions
          </p>
        </header>

        {/* Main Carousel */}
        <main className="py-12 px-4 sm:px-6">
          <DarkGlassCarousel />
        </main>

        {/* Features Grid */}
        <section className="py-12 px-4 sm:px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12">
            Component Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature Card 1 */}
            <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-900/40 backdrop-blur-xl border border-slate-700/50 hover:border-cyan-500/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-white mb-2">Auto-Rotation</h3>
                <p className="text-slate-400 text-sm">
                  Automatic carousel rotation with configurable interval (default 4 seconds)
                </p>
              </div>
            </div>

            {/* Feature Card 2 */}
            <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-900/40 backdrop-blur-xl border border-slate-700/50 hover:border-purple-500/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-white mb-2">Pause on Hover</h3>
                <p className="text-slate-400 text-sm">
                  Smart pause detection when user hovers over the carousel
                </p>
              </div>
            </div>

            {/* Feature Card 3 */}
            <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-900/40 backdrop-blur-xl border border-slate-700/50 hover:border-blue-500/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-white mb-2">Smooth Transitions</h3>
                <p className="text-slate-400 text-sm">
                  Buttery smooth animations with cubic-bezier easing (0.7s duration)
                </p>
              </div>
            </div>

            {/* Feature Card 4 */}
            <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-900/40 backdrop-blur-xl border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-white mb-2">Keyboard Navigation</h3>
                <p className="text-slate-400 text-sm">
                  Full keyboard support with arrow keys for accessibility
                </p>
              </div>
            </div>

            {/* Feature Card 5 */}
            <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-900/40 backdrop-blur-xl border border-slate-700/50 hover:border-orange-500/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-white mb-2">Responsive Design</h3>
                <p className="text-slate-400 text-sm">
                  Fully responsive with mobile-first approach and touch support
                </p>
              </div>
            </div>

            {/* Feature Card 6 */}
            <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-900/40 backdrop-blur-xl border border-slate-700/50 hover:border-pink-500/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-white mb-2">Glass Morphism</h3>
                <p className="text-slate-400 text-sm">
                  Premium dark glass aesthetic with blur effects and gradients
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Usage Instructions */}
        <section className="py-12 px-4 sm:px-6 max-w-4xl mx-auto">
          <div className="relative p-8 rounded-2xl bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-900/40 backdrop-blur-xl border border-slate-700/50">
            <h2 className="text-2xl font-bold text-white mb-6">How to Use</h2>

            <div className="space-y-4 text-slate-300">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-sm font-semibold">
                  1
                </div>
                <div>
                  <p className="font-medium text-white mb-1">Import the Component</p>
                  <code className="text-sm text-cyan-400 bg-slate-900/50 px-3 py-1 rounded block overflow-x-auto">
                    import DarkGlassCarousel from './components/DarkGlassCarousel';
                  </code>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 text-sm font-semibold">
                  2
                </div>
                <div>
                  <p className="font-medium text-white mb-1">Add to Your Page</p>
                  <code className="text-sm text-purple-400 bg-slate-900/50 px-3 py-1 rounded block overflow-x-auto">
                    {'<DarkGlassCarousel autoRotate={true} interval={4000} />'}
                  </code>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-sm font-semibold">
                  3
                </div>
                <div>
                  <p className="font-medium text-white mb-1">Customize (Optional)</p>
                  <p className="text-sm text-slate-400">
                    Pass custom items array with your own content, icons, and accent colors
                  </p>
                </div>
              </div>
            </div>

            {/* Props Table */}
            <div className="mt-8 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left text-white font-semibold py-2 px-3">Prop</th>
                    <th className="text-left text-white font-semibold py-2 px-3">Type</th>
                    <th className="text-left text-white font-semibold py-2 px-3">Default</th>
                    <th className="text-left text-white font-semibold py-2 px-3">Description</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr className="border-b border-slate-700/30">
                    <td className="py-2 px-3 font-mono text-cyan-400">autoRotate</td>
                    <td className="py-2 px-3">boolean</td>
                    <td className="py-2 px-3">true</td>
                    <td className="py-2 px-3">Enable/disable auto-rotation</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="py-2 px-3 font-mono text-cyan-400">interval</td>
                    <td className="py-2 px-3">number</td>
                    <td className="py-2 px-3">4000</td>
                    <td className="py-2 px-3">Rotation interval in ms</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-mono text-cyan-400">items</td>
                    <td className="py-2 px-3">CarouselItem[]</td>
                    <td className="py-2 px-3">default items</td>
                    <td className="py-2 px-3">Custom carousel items</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Interaction Tips */}
        <section className="py-12 px-4 sm:px-6 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/40 backdrop-blur-md border border-slate-600/30 text-slate-300 text-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Try hovering, clicking the arrows, dots, or using keyboard arrow keys
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 text-center text-slate-500 text-sm">
          <p>Built with React, TypeScript, and Tailwind CSS</p>
        </footer>
      </div>
    </div>
  );
}
