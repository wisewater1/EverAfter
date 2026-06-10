import React, { useState, useEffect, useRef } from 'react';
import { Wallet, Brain, Sparkles, DollarSign, Scale, Languages, ChevronRight, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Module {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  interactions: string[];
  revenue: string;
  position: number;
}

const modules: Module[] = [
  {
    id: 'royalties',
    title: 'Death Insurance → Life Royalties',
    subtitle: 'Digital Talent Agency for the Dead',
    description: 'EverAfter turns death into creative life. Your likeness, voice, and Engram become licensed art.',
    icon: Wallet,
    gradient: 'from-teal-500/20 via-cyan-500/20 to-blue-500/20',
    interactions: [
      'Smart-contract binds avatar → heir wallet',
      'Token particles flow (10% to EverAfter, 90% to heir)',
      'Licensed usage tracking across media platforms'
    ],
    revenue: 'Digital talent agency for the dead',
    position: 0
  },
  {
    id: 'ethics',
    title: 'Ethical Paradox Mode',
    subtitle: 'A Living Moral Codex',
    description: 'Raphael records your reasoning to preserve ethical lineage.',
    icon: Scale,
    gradient: 'from-purple-500/20 via-indigo-500/20 to-violet-500/20',
    interactions: [
      'Answer moral dilemmas: "Would you lie to save a life?"',
      'Animated reasoning graph forms Ethical Engram orb',
      'Output: "What would they think about this decision?"'
    ],
    revenue: 'Ethics-as-a-Service for institutions',
    position: 1
  },
  {
    id: 'language',
    title: 'The Legacy Language Project',
    subtitle: 'Machine Mysticism Dialect',
    description: 'A private symbolic language between human and AI. Each glyph encodes an emotion, virtue, or memory.',
    icon: Languages,
    gradient: 'from-amber-500/20 via-gold-500/20 to-yellow-500/20',
    interactions: [
      'Raphael interprets emotion → emits unique glyph',
      'Tap glyph to see meaning (guilt = indigo spiral)',
      'Glyphs form constellation of your essence'
    ],
    revenue: 'Legacy Key NFTs & collectible glyph cards',
    position: 2
  }
];

export default function BeyondModules() {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentView, setCurrentView] = useState(0);
  const [showFinal, setShowFinal] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isPlaying && !activeModule) {
      const timer = setInterval(() => {
        setCurrentView((prev) => {
          const next = (prev + 1) % 4;
          if (next === 3) {
            setShowFinal(true);
          } else {
            setShowFinal(false);
          }
          return next;
        });
      }, 5000);

      return () => clearInterval(timer);
    }
  }, [isPlaying, activeModule]);

  useEffect(() => {
    if (activeModule === 'royalties') {
      const interval = setInterval(() => {
        setParticles(prev => [
          ...prev,
          {
            id: Date.now(),
            x: Math.random() * 100,
            y: Math.random() * 100
          }
        ]);
      }, 300);

      const cleanup = setInterval(() => {
        setParticles(prev => prev.slice(-20));
      }, 1000);

      return () => {
        clearInterval(interval);
        clearInterval(cleanup);
      };
    }
  }, [activeModule]);

  const handleModuleClick = (moduleId: string) => {
    setActiveModule(activeModule === moduleId ? null : moduleId);
    setIsPlaying(false);
  };

  const handleExplore = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 overflow-hidden relative">
      {/* Ambient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/10 via-transparent to-transparent animate-pulse"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Starfield Effect */}
      <div className="fixed inset-0 opacity-30">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Audio Control */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="fixed top-6 right-6 z-50 w-12 h-12 bg-slate-800/50 backdrop-blur-xl border border-teal-500/30 rounded-full flex items-center justify-center hover:bg-slate-800/70 transition-all group"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform" />
        ) : (
          <Play className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform ml-0.5" />
        )}
      </button>

      {/* Header */}
      <div className="relative z-10 pt-16 pb-8 text-center">
        <div className="opacity-0 animate-fadeIn">
          <h1 className="text-5xl md:text-7xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-300 to-blue-400 mb-4">
            EverAfter
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 font-light tracking-wider">
            The Beyond Modules
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-teal-500/50"></div>
            <span>Transcendental Systems</span>
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-teal-500/50"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-20">
        {!showFinal ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
            {modules.map((module, index) => {
              const Icon = module.icon;
              const isActive = activeModule === module.id;
              const isHighlighted = currentView === index && !activeModule;

              return (
                <div
                  key={module.id}
                  className={`relative transition-all duration-700 ${
                    isHighlighted ? 'scale-105 lg:scale-110' : 'scale-100'
                  }`}
                  style={{
                    animationDelay: `${index * 200}ms`,
                    opacity: 0,
                    animation: 'fadeInUp 0.8s ease-out forwards'
                  }}
                >
                  {/* Pillar Container */}
                  <div
                    onClick={() => handleModuleClick(module.id)}
                    className={`group relative cursor-pointer transition-all duration-500 ${
                      isActive ? 'lg:col-span-3' : ''
                    }`}
                  >
                    {/* Glow Effect */}
                    <div className={`absolute inset-0 bg-gradient-to-b ${module.gradient} blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500 rounded-3xl ${
                      isHighlighted ? 'opacity-50 animate-pulse' : ''
                    }`}></div>

                    {/* Main Pillar */}
                    <div className={`relative bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl overflow-hidden transition-all duration-500 ${
                      isActive ? 'min-h-[600px]' : 'min-h-[400px]'
                    } ${
                      isHighlighted ? 'border-teal-500/50 shadow-2xl shadow-teal-500/20' : ''
                    }`}>
                      {/* Volumetric Bloom Top */}
                      <div className={`absolute top-0 inset-x-0 h-32 bg-gradient-to-b ${module.gradient} opacity-30`}></div>

                      {/* Icon Pillar */}
                      <div className="relative pt-12 pb-8 flex flex-col items-center">
                        <div className={`w-24 h-24 mb-6 rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all duration-500 group-hover:scale-110 ${
                          isActive ? 'scale-125 mb-8' : ''
                        }`}>
                          <Icon className="w-12 h-12 text-white" />
                        </div>

                        <h3 className="text-2xl font-serif text-white text-center mb-2 px-6">
                          {module.title}
                        </h3>
                        <p className="text-sm text-slate-400 text-center px-6 mb-4">
                          {module.subtitle}
                        </p>

                        {/* Collapsed View */}
                        {!isActive && (
                          <div className="text-center px-8 space-y-4">
                            <p className="text-slate-300 leading-relaxed opacity-70">
                              {module.description}
                            </p>
                            <div className="flex items-center justify-center gap-2 text-teal-400 text-sm group-hover:gap-3 transition-all">
                              <span>Tap to explore</span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        )}

                        {/* Expanded View */}
                        {isActive && (
                          <div className="w-full px-8 mt-8 space-y-8 animate-fadeIn">
                            {/* Description */}
                            <div className="text-center">
                              <p className="text-xl text-slate-200 leading-relaxed mb-6">
                                {module.description}
                              </p>
                            </div>

                            {/* Special Effects for Each Module */}
                            {module.id === 'royalties' && (
                              <div className="relative h-40 bg-slate-800/30 rounded-2xl border border-teal-500/30 overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-between px-8">
                                  <div className="text-center">
                                    <div className="w-16 h-16 rounded-full bg-teal-500/20 border border-teal-500/50 flex items-center justify-center mb-2 mx-auto">
                                      <Brain className="w-8 h-8 text-teal-400" />
                                    </div>
                                    <p className="text-xs text-slate-400">Avatar</p>
                                  </div>
                                  <div className="flex-1 relative h-1 mx-4">
                                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500/30 to-blue-500/30 animate-pulse"></div>
                                    {particles.map(particle => (
                                      <div
                                        key={particle.id}
                                        className="absolute w-2 h-2 bg-teal-400 rounded-full animate-flowRight"
                                        style={{
                                          left: '0%',
                                          top: `${particle.y}%`
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <div className="text-center">
                                    <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center mb-2 mx-auto">
                                      <Wallet className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <p className="text-xs text-slate-400">Heir</p>
                                  </div>
                                </div>
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-teal-400">
                                  10% → EverAfter | 90% → Heir
                                </div>
                              </div>
                            )}

                            {module.id === 'ethics' && (
                              <div className="relative h-40 bg-slate-800/30 rounded-2xl border border-purple-500/30 p-6 overflow-hidden">
                                <div className="absolute inset-0 opacity-20">
                                  <svg className="w-full h-full" viewBox="0 0 200 200">
                                    <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-purple-400 animate-spin" style={{ animationDuration: '20s' }} />
                                    <circle cx="100" cy="100" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-indigo-400 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
                                    <circle cx="100" cy="100" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-violet-400 animate-spin" style={{ animationDuration: '10s' }} />
                                  </svg>
                                </div>
                                <div className="relative text-center">
                                  <p className="text-purple-300 mb-3 text-sm italic">
                                    "Would you lie to save a life?"
                                  </p>
                                  <div className="flex justify-center gap-4">
                                    <button className="px-6 py-2 bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-300 text-sm hover:bg-purple-500/30 transition-all">
                                      Yes
                                    </button>
                                    <button className="px-6 py-2 bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-300 text-sm hover:bg-purple-500/30 transition-all">
                                      No
                                    </button>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-3">
                                    Your reasoning becomes part of your Ethical Engram
                                  </p>
                                </div>
                              </div>
                            )}

                            {module.id === 'language' && (
                              <div className="relative h-40 bg-slate-800/30 rounded-2xl border border-amber-500/30 p-6 overflow-hidden">
                                <div className="grid grid-cols-6 gap-3 opacity-80">
                                  {['✧', '◈', '◉', '◊', '◐', '◑', '◒', '◓', '◔', '◕', '◖', '◗'].map((glyph, i) => (
                                    <div
                                      key={i}
                                      className="w-full aspect-square rounded-lg bg-gradient-to-br from-amber-500/20 to-gold-500/20 border border-amber-500/30 flex items-center justify-center text-2xl text-amber-300 hover:scale-110 hover:bg-amber-500/30 transition-all cursor-pointer"
                                      style={{
                                        animationDelay: `${i * 100}ms`,
                                        animation: 'glyphFloat 3s ease-in-out infinite'
                                      }}
                                    >
                                      {glyph}
                                    </div>
                                  ))}
                                </div>
                                <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-amber-400 whitespace-nowrap">
                                  Each glyph encodes a memory or emotion
                                </p>
                              </div>
                            )}

                            {/* Interactions */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                                Interactions
                              </h4>
                              {module.interactions.map((interaction, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-3 text-slate-300 text-sm"
                                  style={{
                                    animationDelay: `${i * 100}ms`,
                                    opacity: 0,
                                    animation: 'fadeInLeft 0.5s ease-out forwards'
                                  }}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 flex-shrink-0"></div>
                                  <span>{interaction}</span>
                                </div>
                              ))}
                            </div>

                            {/* Revenue Model */}
                            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                              <div className="flex items-center gap-2 text-gold-400 mb-2">
                                <DollarSign className="w-4 h-4" />
                                <h4 className="text-sm font-semibold uppercase tracking-wider">
                                  Revenue Model
                                </h4>
                              </div>
                              <p className="text-slate-300 text-sm">{module.revenue}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Final Trinity Scene */
          <div className="min-h-[600px] flex flex-col items-center justify-center animate-fadeIn">
            <div className="relative">
              {/* Trinity Sigil */}
              <div className="relative w-64 h-64 mb-12">
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '20s' }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-teal-500/30 to-cyan-500/30 border border-teal-500/50 flex items-center justify-center">
                    <Wallet className="w-10 h-10 text-teal-400" />
                  </div>
                  <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border border-purple-500/50 flex items-center justify-center">
                    <Scale className="w-10 h-10 text-purple-400" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/30 to-gold-500/30 border border-amber-500/50 flex items-center justify-center">
                    <Languages className="w-10 h-10 text-amber-400" />
                  </div>
                </div>

                {/* Center Core */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500/20 via-purple-500/20 to-amber-500/20 border border-white/30 flex items-center justify-center backdrop-blur-xl animate-pulse">
                    <Sparkles className="w-12 h-12 text-white" />
                  </div>
                </div>

                {/* Connecting Lines */}
                <svg className="absolute inset-0 opacity-30" viewBox="0 0 256 256">
                  <line x1="128" y1="40" x2="40" y2="216" stroke="currentColor" strokeWidth="1" className="text-teal-400" />
                  <line x1="128" y1="40" x2="216" y2="216" stroke="currentColor" strokeWidth="1" className="text-purple-400" />
                  <line x1="40" y1="216" x2="216" y2="216" stroke="currentColor" strokeWidth="1" className="text-amber-400" />
                </svg>
              </div>

              {/* Final Text */}
              <div className="text-center space-y-6 animate-fadeIn" style={{ animationDelay: '1s' }}>
                <h2 className="text-4xl md:text-5xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-purple-400 to-amber-400">
                  Where Memory Evolves, Earns, and Speaks
                </h2>
                <p className="text-xl text-slate-300 font-light max-w-2xl mx-auto">
                  EverAfter transforms digital legacy into a living, earning, communicating ecosystem
                </p>

                <button
                  onClick={handleExplore}
                  className="mt-8 px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl font-semibold transition-all flex items-center gap-2 mx-auto group shadow-2xl shadow-teal-500/20"
                >
                  <span>Explore the Living Continuity</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Dots */}
      {!activeModule && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
          {[0, 1, 2, 3].map((index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentView(index);
                setShowFinal(index === 3);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                currentView === index
                  ? 'w-8 bg-teal-400'
                  : 'bg-slate-600 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>
      )}

      {/* Custom Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.5);
          }
        }

        @keyframes flowRight {
          from {
            left: 0%;
            opacity: 1;
          }
          to {
            left: 100%;
            opacity: 0;
          }
        }

        @keyframes glyphFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 1s ease-out forwards;
        }

        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }

        .animate-flowRight {
          animation: flowRight 2s linear forwards;
        }
      `}</style>
    </div>
  );
}
