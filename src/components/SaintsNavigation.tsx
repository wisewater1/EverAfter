import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Shield, Users, Lock, Search, Wallet } from 'lucide-react';
import { getRouteGate, getRuntimeReadiness } from '../lib/runtime-readiness';

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
  const [blockedRoutes, setBlockedRoutes] = useState<Record<string, string>>({});

  const saints: Saint[] = [
    {
      id: 'michael',
      name: 'St. Michael',
      role: 'Protection & Security',
      icon: Shield,
      color: 'blue',
      gradient: 'from-blue-500 to-sky-600',
      available: true,
      route: '/security-dashboard',
    },
    {
      id: 'joseph',
      name: 'St. Joseph',
      role: 'Family coordination',
      icon: Users,
      color: 'amber',
      gradient: 'from-amber-500 to-orange-600',
      available: true,
      route: '/family-dashboard',
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
      role: 'Finance & Trusteeship',
      icon: Wallet,
      color: 'purple',
      gradient: 'from-purple-500 to-violet-600',
      available: true,
      route: '/finance-dashboard',
    },
    {
      id: 'anthony',
      name: 'St. Anthony',
      role: 'Guidance',
      icon: Search,
      color: 'rose',
      gradient: 'from-rose-500 to-pink-600',
      available: true,
      route: '/anthony-dashboard',
    },
  ];

  const handleSaintClick = (saint: Saint) => {
    if (saint.available && saint.route) {
      navigate(saint.route);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadRouteAvailability() {
      try {
        const readiness = await getRuntimeReadiness();
        if (cancelled) return;

        const nextBlockedRoutes: Record<string, string> = {};
        for (const saint of saints) {
          if (!saint.route) continue;
          const gate = getRouteGate(readiness, saint.route);
          if (gate?.blocking) {
            nextBlockedRoutes[saint.route] = gate.reason || 'Route dependencies are unavailable.';
          }
        }

        setBlockedRoutes(nextBlockedRoutes);
      } catch (error) {
        console.warn('Failed to load saint route readiness:', error);
      }
    }

    void loadRouteAvailability();
    return () => {
      cancelled = true;
    };
  }, []);

  const renderedSaints = saints.map((saint) => {
    if (!saint.route) return saint;
    return {
      ...saint,
      available: saint.available && !blockedRoutes[saint.route],
    };
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
      {/* Backdrop */}
      <div className="absolute inset-0 glass-strong" style={{ background: 'linear-gradient(180deg, transparent 0%, var(--glass-strong) 40%)' }} />

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

          {/* Saints Grid — each button is a flex-col card+name */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-4">
            {renderedSaints.map((saint, index) => {
              const Icon = saint.icon;
              const isCenter = index === 2; // St. Raphael

              return (
                <button
                  key={saint.id}
                  onClick={() => handleSaintClick(saint)}
                  disabled={!saint.available}
                  title={saint.route ? blockedRoutes[saint.route] || undefined : undefined}
                  className={`group flex flex-col items-center gap-1.5 transition-all duration-500 ease-out ${isCenter ? 'scale-105 sm:scale-110' : 'scale-100'
                    } ${saint.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                  style={{ transform: isCenter ? 'translateY(-8px)' : 'translateY(0)' }}
                >
                  {/* Card Square */}
                  <div className={`relative w-full aspect-square rounded-2xl transition-all duration-500 ease-out ${saint.available ? 'hover:scale-105 active:scale-95' : ''}`}>
                    {/* Glow */}
                    {saint.available && (
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${saint.gradient} opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500 -z-10`} />
                    )}

                    {/* Face */}
                    <div className={`glass-card relative w-full h-full rounded-2xl overflow-hidden transition-all duration-500 ${saint.available ? `bg-gradient-to-br ${saint.gradient} opacity-90` : 'opacity-50'}`}>
                      {saint.available && (
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/50 to-white/0 group-hover:animate-pulse" />
                        </div>
                      )}

                      {/* Icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icon className={`transition-all duration-500 ${isCenter ? 'w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12' : 'w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9'
                          } ${saint.available ? 'text-white drop-shadow-lg group-hover:scale-110' : 'text-slate-600'}`} />
                      </div>

                      {/* Lock */}
                      {!saint.available && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                          <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
                        </div>
                      )}

                      {/* Active dot */}
                      {saint.available && isCenter && (
                        <div className="absolute top-2 right-2">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50" />
                        </div>
                      )}

                      {/* Availability state */}
                      {!saint.available && (
                        <div className="absolute bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm py-1">
                          <p className="text-[8px] sm:text-[9px] font-semibold text-slate-400 text-center uppercase tracking-wider">
                            Unavailable
                          </p>
                        </div>
                      )}

                      {/* Ripple */}
                      {saint.available && (
                        <div className="absolute inset-0 rounded-2xl overflow-hidden">
                          <div className="absolute inset-0 bg-white/0 group-active:bg-white/20 transition-colors duration-150" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Name + Role — normal flow, always visible at every screen size */}
                  <div className="text-center w-full px-0.5">
                    <p className={`font-semibold leading-tight truncate ${isCenter ? 'text-[10px] sm:text-xs' : 'text-[9px] sm:text-[10px]'
                      } ${saint.available ? 'text-white' : 'text-slate-400'}`}>
                      {saint.name}
                    </p>
                    <p className={`leading-tight mt-0.5 truncate ${isCenter ? 'text-[8px] sm:text-[9px]' : 'text-[7px] sm:text-[8px]'
                      } ${saint.available ? 'text-emerald-400 font-medium' : 'text-slate-600'}`}>
                      {saint.role}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="text-center mt-2 sm:mt-4">
            <p className="text-[10px] sm:text-xs text-slate-500">
              Tap <span className="text-emerald-400 font-medium">St. Raphael Hub</span> or <span className="text-sky-400 font-medium">St. Michael</span> to access active features
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
