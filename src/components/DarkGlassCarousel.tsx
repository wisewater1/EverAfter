import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Activity, Heart, TrendingUp, Zap, Shield, Target } from 'lucide-react';

interface CarouselItem {
  id: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
}

interface DarkGlassCarouselProps {
  autoRotate?: boolean;
  interval?: number;
  items?: CarouselItem[];
}

export default function DarkGlassCarousel({
  autoRotate = true,
  interval = 4000,
  items: customItems
}: DarkGlassCarouselProps) {
  const defaultItems: CarouselItem[] = [
    {
      id: 1,
      icon: <Activity className="w-8 h-8" />,
      title: 'Real-Time Monitoring',
      description: 'Track your health metrics in real-time with advanced AI-powered insights and personalized recommendations.',
      accentColor: 'from-cyan-500 to-blue-500'
    },
    {
      id: 2,
      icon: <Heart className="w-8 h-8" />,
      title: 'Heart Health Tracking',
      description: 'Monitor cardiovascular health with precision sensors and get instant alerts for any irregularities.',
      accentColor: 'from-pink-500 to-rose-500'
    },
    {
      id: 3,
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Progress Analytics',
      description: 'Visualize your health journey with detailed analytics, trends, and predictive insights for better outcomes.',
      accentColor: 'from-emerald-500 to-teal-500'
    },
    {
      id: 4,
      icon: <Zap className="w-8 h-8" />,
      title: 'Instant Sync',
      description: 'Seamlessly sync data across all your devices with lightning-fast cloud integration and offline support.',
      accentColor: 'from-yellow-500 to-orange-500'
    },
    {
      id: 5,
      icon: <Shield className="w-8 h-8" />,
      title: 'Secure & Private',
      description: 'Your health data is protected with end-to-end encryption and complies with all privacy regulations.',
      accentColor: 'from-violet-500 to-purple-500'
    },
    {
      id: 6,
      icon: <Target className="w-8 h-8" />,
      title: 'Goal Achievement',
      description: 'Set personalized health goals and receive guidance to achieve them with AI-powered coaching.',
      accentColor: 'from-indigo-500 to-blue-500'
    }
  ];

  const items = customItems || defaultItems;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  // Auto-rotation logic
  useEffect(() => {
    if (!autoRotate || isHovered) return;

    const timer = setInterval(() => {
      handleNext();
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, autoRotate, isHovered, interval]);

  const handleNext = useCallback(() => {
    setDirection('next');
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const handlePrev = useCallback(() => {
    setDirection('prev');
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  const handleDotClick = useCallback((index: number) => {
    setDirection(index > currentIndex ? 'next' : 'prev');
    setCurrentIndex(index);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  const currentItem = items[currentIndex];

  return (
    <div
      className="relative w-full max-w-4xl mx-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-label="Feature carousel"
      aria-live="polite"
    >
      {/* Main Glass Container */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Glass Background with Gradient Border */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl" />

        {/* Animated Gradient Border Effect */}
        <div className="absolute inset-0 rounded-3xl opacity-50">
          <div className={`absolute inset-0 bg-gradient-to-r ${currentItem.accentColor} opacity-20 blur-xl animate-pulse`} />
        </div>

        {/* Content Container */}
        <div className="relative p-8 sm:p-12 min-h-[400px] flex flex-col justify-between">
          {/* Carousel Content */}
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            {/* Icon with Glass Effect */}
            <div
              key={`icon-${currentItem.id}`}
              className={`
                relative p-6 rounded-2xl
                bg-gradient-to-br from-slate-800/50 to-slate-900/50
                backdrop-blur-md border border-slate-600/30
                shadow-2xl
                transform transition-all duration-700 ease-out
                ${direction === 'next' ? 'animate-slideInRight' : 'animate-slideInLeft'}
              `}
            >
              <div className={`bg-gradient-to-br ${currentItem.accentColor} bg-clip-text text-transparent`}>
                {currentItem.icon}
              </div>

              {/* Glass Reflection Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl pointer-events-none" />
            </div>

            {/* Title */}
            <h3
              key={`title-${currentItem.id}`}
              className={`
                text-3xl sm:text-4xl font-bold text-white
                transform transition-all duration-700 ease-out
                ${direction === 'next' ? 'animate-slideInRight' : 'animate-slideInLeft'}
              `}
              style={{ animationDelay: '0.1s' }}
            >
              {currentItem.title}
            </h3>

            {/* Description */}
            <p
              key={`desc-${currentItem.id}`}
              className={`
                text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed
                transform transition-all duration-700 ease-out
                ${direction === 'next' ? 'animate-slideInRight' : 'animate-slideInLeft'}
              `}
              style={{ animationDelay: '0.2s' }}
            >
              {currentItem.description}
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="mt-8 flex items-center justify-between">
            {/* Previous Button */}
            <button
              onClick={handlePrev}
              className="group relative p-3 rounded-xl bg-slate-800/40 backdrop-blur-md border border-slate-600/30 hover:bg-slate-700/40 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              aria-label="Previous item"
            >
              <ChevronLeft className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 to-cyan-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Dot Indicators */}
            <div className="flex items-center gap-2" role="tablist" aria-label="Carousel navigation">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => handleDotClick(index)}
                  className={`
                    relative h-2 rounded-full transition-all duration-300
                    focus:outline-none focus:ring-2 focus:ring-cyan-500/50
                    ${index === currentIndex ? 'w-8 bg-gradient-to-r ' + currentItem.accentColor : 'w-2 bg-slate-600'}
                  `}
                  role="tab"
                  aria-selected={index === currentIndex}
                  aria-label={`Go to slide ${index + 1}`}
                >
                  {index === currentIndex && (
                    <div className="absolute inset-0 bg-white/30 rounded-full animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={handleNext}
              className="group relative p-3 rounded-xl bg-slate-800/40 backdrop-blur-md border border-slate-600/30 hover:bg-slate-700/40 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              aria-label="Next item"
            >
              <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
              <div className="absolute inset-0 bg-gradient-to-l from-cyan-500/0 to-cyan-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>

        {/* Hover Indicator */}
        {isHovered && autoRotate && (
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-slate-800/60 backdrop-blur-md border border-slate-600/30">
            <span className="text-xs text-slate-300">Paused</span>
          </div>
        )}
      </div>

      {/* Bottom Glass Reflection */}
      <div className="absolute -bottom-2 left-8 right-8 h-8 bg-gradient-to-b from-slate-800/20 to-transparent blur-xl rounded-full" />
    </div>
  );
}
