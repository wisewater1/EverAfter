import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Shield, Users, Lock, Search, Wallet } from 'lucide-react';
import { getRouteGate, getRuntimeReadiness } from '../lib/runtime-readiness';

interface Saint {
  id: string;
  name: string;
  shortName: string;
  role: string;
  icon: React.ComponentType<{ className?: string }>;
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
      shortName: 'Michael',
      role: 'Security',
      icon: Shield,
      gradient: 'from-blue-500 to-sky-600',
      available: true,
      route: '/security-dashboard',
    },
    {
      id: 'joseph',
      name: 'St. Joseph',
      shortName: 'Joseph',
      role: 'Family',
      icon: Users,
      gradient: 'from-amber-500 to-orange-600',
      available: true,
      route: '/family-dashboard',
    },
    {
      id: 'raphael',
      name: 'St. Raphael',
      shortName: 'Raphael',
      role: 'Health',
      icon: Heart,
      gradient: 'from-emerald-500 to-teal-600',
      available: true,
      route: '/health-dashboard',
    },
    {
      id: 'gabriel',
      name: 'St. Gabriel',
      shortName: 'Gabriel',
      role: 'Finance',
      icon: Wallet,
      gradient: 'from-purple-500 to-violet-600',
      available: true,
      route: '/finance-dashboard',
    },
    {
      id: 'anthony',
      name: 'St. Anthony',
      shortName: 'Anthony',
      role: 'Guidance',
      icon: Search,
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
    <div className="fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      {/* Glass backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl border-t border-slate-800/50"
      />

      <div className="relative px-2 sm:px-4 pb-2 pt-2 sm:pb-3 sm:pt-3">
        <div className="max-w-lg mx-auto">
          {/* Saints icon row */}
          <div className="grid grid-cols-5 gap-1 sm:gap-2">
            {renderedSaints.map((saint, index) => {
              const Icon = saint.icon;
              const isCenter = index === 2;

              return (
                <button
                  key={saint.id}
                  onClick={() => handleSaintClick(saint)}
                  disabled={!saint.available}
                  title={saint.route ? blockedRoutes[saint.route] || saint.name : undefined}
                  className={`group flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all duration-200 active:scale-95 ${
                    saint.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                  }`}
                >
                  {/* Icon circle */}
                  <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    saint.available
                      ? `bg-gradient-to-br ${saint.gradient} shadow-md group-hover:scale-105 group-active:scale-95`
                      : 'bg-slate-800'
                  } ${isCenter ? 'ring-2 ring-emerald-400/30 ring-offset-1 ring-offset-slate-950' : ''}`}>
                    {saint.available ? (
                      <Icon className={`${isCenter ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-4.5 h-4.5 sm:w-5 sm:h-5'} text-white drop-shadow`} />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500" />
                    )}
                    {/* Active pulse for Raphael */}
                    {saint.available && isCenter && (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-sm shadow-emerald-400/50" />
                    )}
                  </div>

                  {/* Label */}
                  <span className={`text-[10px] sm:text-[11px] font-medium leading-tight truncate w-full text-center ${
                    saint.available ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {saint.shortName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
