import React, { useState, useEffect } from 'react';
import { Droplets, Dumbbell, Moon, Brain, Heart, Apple, Wind, Sun, Sparkles, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

interface HealthTip {
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  bgColor: string;
  category: 'hydration' | 'exercise' | 'sleep' | 'mental' | 'nutrition' | 'wellness';
}

const healthTips: HealthTip[] = [
  {
    title: 'Stay Hydrated',
    description: 'Drink at least 8 glasses of water daily for optimal health.',
    icon: Droplets,
    gradient: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-900/20 border-blue-500/20',
    category: 'hydration',
  },
  {
    title: 'Regular Exercise',
    description: 'Aim for 150 minutes of moderate activity per week.',
    icon: Dumbbell,
    gradient: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-900/20 border-orange-500/20',
    category: 'exercise',
  },
  {
    title: 'Quality Sleep',
    description: 'Get 7-9 hours of sleep each night for recovery.',
    icon: Moon,
    gradient: 'from-indigo-500 to-purple-500',
    bgColor: 'bg-indigo-900/20 border-indigo-500/20',
    category: 'sleep',
  },
  {
    title: 'Stress Management',
    description: 'Practice mindfulness and take breaks throughout the day.',
    icon: Brain,
    gradient: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-900/20 border-pink-500/20',
    category: 'mental',
  },
  {
    title: 'Heart Health',
    description: 'Monitor your heart rate and maintain cardiovascular fitness.',
    icon: Heart,
    gradient: 'from-red-500 to-pink-500',
    bgColor: 'bg-red-900/20 border-red-500/20',
    category: 'wellness',
  },
  {
    title: 'Balanced Nutrition',
    description: 'Include fruits, vegetables, and whole grains in every meal.',
    icon: Apple,
    gradient: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-900/20 border-green-500/20',
    category: 'nutrition',
  },
  {
    title: 'Deep Breathing',
    description: 'Practice breathing exercises to reduce stress and anxiety.',
    icon: Wind,
    gradient: 'from-teal-500 to-cyan-500',
    bgColor: 'bg-teal-900/20 border-teal-500/20',
    category: 'mental',
  },
  {
    title: 'Morning Sunlight',
    description: 'Get 10-15 minutes of sunlight to regulate circadian rhythm.',
    icon: Sun,
    gradient: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-900/20 border-yellow-500/20',
    category: 'wellness',
  },
  {
    title: 'Consistent Routine',
    description: 'Maintain regular sleep and meal schedules for better health.',
    icon: Sparkles,
    gradient: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-900/20 border-purple-500/20',
    category: 'wellness',
  },
  {
    title: 'Active Movement',
    description: 'Take short walks every hour to boost circulation and energy.',
    icon: Zap,
    gradient: 'from-amber-500 to-yellow-500',
    bgColor: 'bg-amber-900/20 border-amber-500/20',
    category: 'exercise',
  },
];

export default function HealthTips() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const visibleTips = 4;
  const maxIndex = healthTips.length - visibleTips;

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setDirection('next');
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, maxIndex]);

  const handleNext = () => {
    setDirection('next');
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setDirection('prev');
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const displayedTips = healthTips.slice(currentIndex, currentIndex + visibleTips);

  return (
    <div
      className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 relative overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Health Tips</h2>
              <p className="text-xs text-gray-400">Evidence-based wellness guidance</p>
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handlePrev}
              className="w-8 h-8 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white transition-all flex items-center justify-center"
              aria-label="Previous tip"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="w-8 h-8 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white transition-all flex items-center justify-center"
              aria-label="Next tip"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {displayedTips.map((tip, index) => {
            const Icon = tip.icon;
            return (
              <div
                key={`${tip.title}-${currentIndex}-${index}`}
                className={`p-3 ${tip.bgColor} rounded-xl border backdrop-blur-sm transition-all duration-500 ease-in-out hover:scale-[1.02] group/tip ${
                  direction === 'next' ? 'animate-slideInRight' : 'animate-slideInLeft'
                }`}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'both',
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 bg-gradient-to-br ${tip.gradient} rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg group-hover/tip:scale-110 transition-transform`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white mb-0.5">{tip.title}</h3>
                    <p className="text-xs text-gray-300 leading-relaxed">{tip.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-gray-700/30">
          {Array.from({ length: Math.ceil(healthTips.length / visibleTips) }).map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index * visibleTips > currentIndex ? 'next' : 'prev');
                setCurrentIndex(index * visibleTips);
              }}
              className={`h-1 rounded-full transition-all ${
                Math.floor(currentIndex / visibleTips) === index
                  ? 'w-6 bg-gradient-to-r from-emerald-500 to-teal-500'
                  : 'w-1.5 bg-gray-600 hover:bg-gray-500'
              }`}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>

        {!isPaused && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-gray-900/50 rounded-full text-xs text-gray-400">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span>Auto-rotating</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slideInRight {
          animation: slideInRight 0.5s ease-out;
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
