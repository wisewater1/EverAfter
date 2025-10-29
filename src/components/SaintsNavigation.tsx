import React, { useState } from 'react';
import { Heart, Shield, Users, Sparkles, Lock, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Saint {
  id: string;
  name: string;
  role: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
  available: boolean;
  route?: string;
}

export default function SaintsNavigation() {
  const navigate = useNavigate();
  const [hoveredSaint, setHoveredSaint] = useState<string | null>(null);

  const saints: Saint[] = [
    {
      id: 'michael',
      name: 'St. Michael',
      role: 'Protection',
      icon: Shield,
      color: 'blue',
      gradient: 'from-blue-500 to-sky-600',
      available: false,
    },
    {
      id: 'joseph',
      name: 'St. Joseph',
      role: 'Family',
      icon: Users,
      color: 'amber',
      gradient: 'from-amber-500 to-orange-600',
      available: false,
    },
    {
      id: 'raphael',
      name: 'St. Raphael',
      role: 'Health & Healing',
      icon: Heart,
      color: 'emerald',
      gradient: 'from-emerald-500 to-teal-600',
      available: true,
      route: '/health-dashboard',
    },
    {
      id: 'gabriel',
      name: 'St. Gabriel',
      role: 'Communication',
      icon: Sparkles,
      color: 'purple',
      gradient: 'from-purple-500 to-violet-600',
      available: false,
    },
    {
      id: 'anthony',
      name: 'St. Anthony',
      role: 'Guidance',
      icon: Calendar,
      color: 'rose',
      gradient: 'from-rose-500 to-pink-600',
      available: false,
    },
  ];

  const handleSaintClick = (saint: Saint) => {
    if (saint.available && saint.route) {
      navigate(saint.route);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
      {/* Backdrop blur with gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-950/0 backdrop-blur-2xl" />

      {/* Saints Container */}
      <div className="relative px-3 pb-6 pt-6 sm:px-4 sm:pt-8">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wider mb-1">
              Your Saints
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500">
              AI-powered companions for your journey
            </p>
          </div>

          {/* Saints Grid with space for labels */}
          <div className="grid grid-cols-5 gap-2.5 sm:gap-3 md:gap-4 mb-14 sm:mb-16">
            {saints.map((saint, index) => {
              const Icon = saint.icon;
              const isCenter = index === 2; // St. Raphael
              const isHovered = hoveredSaint === saint.id;

              return (
                <button
                  key={saint.id}
                  onClick={() => handleSaintClick(saint)}
                  onMouseEnter={() => setHoveredSaint(saint.id)}
                  onMouseLeave={() => setHoveredSaint(null)}
                  disabled={!saint.available}
                  className={`group relative transition-all duration-500 ease-out ${
                    isCenter ? 'scale-105 sm:scale-110' : 'scale-100'
                  } ${
                    saint.available
                      ? 'cursor-pointer'
                      : 'cursor-not-allowed opacity-50'
                  }`}
                  style={{
                    transform: isCenter
                      ? 'translateY(-8px)'
                      : 'translateY(0)',
                  }}
                >
                  {/* Card Container */}
                  <div
                    className={`relative rounded-2xl transition-all duration-500 ease-out ${
                      saint.available
                        ? 'hover:scale-105 active:scale-95'
                        : ''
                    }`}
                  >
                    {/* Glow Effect */}
                    {saint.available && (
                      <div
                        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${saint.gradient} opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500 -z-10`}
                      />
                    )}

                    {/* Main Card */}
                    <div
                      className={`relative aspect-square rounded-2xl border-2 transition-all duration-500 ${
                        saint.available
                          ? `bg-gradient-to-br ${saint.gradient} border-white/20 shadow-lg shadow-${saint.color}-500/20`
                          : 'bg-slate-800/50 border-slate-700/50'
                      } overflow-hidden`}
                    >
                      {/* Animated Background Pattern */}
                      {saint.available && (
                        <div className="absolute inset-0 opacity-10">
                          <div
                            className={`absolute inset-0 bg-gradient-to-tr from-white/0 via-white/50 to-white/0 group-hover:animate-pulse`}
                          />
                        </div>
                      )}

                      {/* Icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon
                          className={`transition-all duration-500 ${
                            isCenter ? 'w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12' : 'w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9'
                          } ${
                            saint.available
                              ? 'text-white drop-shadow-lg group-hover:scale-110'
                              : 'text-slate-600'
                          }`}
                        />
                      </div>

                      {/* Lock Overlay */}
                      {!saint.available && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                          <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
                        </div>
                      )}

                      {/* Active Indicator for St. Raphael */}
                      {saint.available && isCenter && (
                        <div className="absolute top-2 right-2">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50" />
                        </div>
                      )}

                      {/* Coming Soon Badge */}
                      {!saint.available && (
                        <div className="absolute bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm py-1">
                          <p className="text-[8px] sm:text-[9px] font-semibold text-slate-400 text-center uppercase tracking-wider">
                            Coming Soon
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Name Label - Always visible at bottom */}
                    <div className="absolute -bottom-12 sm:-bottom-14 left-1/2 -translate-x-1/2 w-full px-0.5">
                      <div className="text-center">
                        <p
                          className={`font-semibold leading-tight whitespace-nowrap transition-all duration-300 ${
                            isCenter ? 'text-[11px] sm:text-xs md:text-sm' : 'text-[9px] sm:text-[10px] md:text-xs'
                          } ${
                            saint.available
                              ? 'text-white'
                              : 'text-slate-400'
                          }`}
                        >
                          {saint.name}
                        </p>
                        <p
                          className={`leading-tight mt-0.5 whitespace-nowrap transition-all duration-300 ${
                            isCenter ? 'text-[9px] sm:text-[10px]' : 'text-[8px] sm:text-[9px]'
                          } ${
                            saint.available
                              ? 'text-emerald-400 font-medium'
                              : 'text-slate-600'
                          }`}
                        >
                          {saint.role}
                        </p>
                      </div>
                    </div>

                    {/* Ripple Effect on Click */}
                    {saint.available && (
                      <div className="absolute inset-0 rounded-2xl overflow-hidden">
                        <div className="absolute inset-0 bg-white/0 group-active:bg-white/20 transition-colors duration-150" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Instruction Text for Mobile */}
          <div className="text-center mt-2 sm:mt-4">
            <p className="text-[10px] sm:text-xs text-slate-500">
              Tap <span className="text-emerald-400 font-medium">St. Raphael</span> to access health features
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
