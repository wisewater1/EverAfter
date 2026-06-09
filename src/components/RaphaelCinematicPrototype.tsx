import React, { useState, useEffect } from 'react';
import { Heart, Sparkles } from 'lucide-react';

export default function RaphaelCinematicPrototype() {
  const [phase, setPhase] = useState<'intro' | 'angel' | 'whisper' | 'vault' | 'complete'>('intro');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const sequence = async () => {
      setTimeout(() => setIsVisible(true), 100);

      setTimeout(() => setPhase('angel'), 2000);

      setTimeout(() => setPhase('whisper'), 4500);

      setTimeout(() => setPhase('vault'), 7000);

      setTimeout(() => setPhase('complete'), 9500);
    };

    sequence();
  }, []);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Background Cathedral Glass Effect */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-teal-950/20 to-slate-950" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(90deg, rgba(20, 184, 166, 0.03) 0px, transparent 2px, transparent 50px, rgba(20, 184, 166, 0.03) 52px),
              repeating-linear-gradient(0deg, rgba(20, 184, 166, 0.03) 0px, transparent 2px, transparent 50px, rgba(20, 184, 166, 0.03) 52px)
            `
          }}
        />
      </div>

      {/* Volumetric Light Rays */}
      <div
        className={`absolute inset-0 transition-opacity duration-3000 ${
          phase !== 'intro' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '4s' }}
        />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '5s', animationDelay: '1s' }}
        />
      </div>

      {/* Floating Particles */}
      {phase !== 'intro' && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-teal-400/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${8 + Math.random() * 8}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Main Content Container - Centered for Mobile */}
      <div className="relative h-full flex flex-col items-center justify-center px-4">

        {/* Digital Cathedral Title */}
        <div
          className={`absolute top-20 left-0 right-0 text-center transition-all duration-2000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
          }`}
        >
          <h1 className="text-2xl font-light tracking-[0.3em] text-teal-300/60 mb-2">
            EVERAFTER
          </h1>
          <p className="text-xs tracking-[0.4em] text-teal-400/40 uppercase">
            The Healer Prototype
          </p>
        </div>

        {/* Central Angel Figure */}
        <div
          className={`relative w-80 h-80 transition-all duration-3000 ${
            phase === 'angel' || phase === 'whisper' || phase === 'vault'
              ? 'opacity-60 scale-100'
              : 'opacity-0 scale-95'
          }`}
        >
          {/* Angel Glow Aura */}
          <div className="absolute inset-0 bg-gradient-to-b from-teal-500/20 via-emerald-500/20 to-amber-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '3s' }}
          />

          {/* Geometric Light Body */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Outer Ring */}
            <div className="absolute w-72 h-72 border border-teal-400/20 rounded-full animate-spin-slow" />
            <div className="absolute w-60 h-60 border border-emerald-400/20 rounded-full animate-spin-reverse" />

            {/* Central Angel Form */}
            <div className="relative w-48 h-64 flex flex-col items-center justify-center">
              {/* Head/Halo */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400/30 to-amber-400/30 mb-4
                  border border-teal-300/40 backdrop-blur-sm"
                >
                  <div className="absolute -inset-2 border border-amber-400/20 rounded-full animate-ping"
                    style={{ animationDuration: '3s' }}
                  />
                </div>
              </div>

              {/* Body - Heartbeat Center */}
              <div className="relative w-32 h-40 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-b from-teal-400/20 to-emerald-400/20 rounded-[3rem] backdrop-blur-sm border border-teal-300/30" />

                {/* Heartbeat Pulse */}
                {(phase === 'whisper' || phase === 'vault') && (
                  <div className="relative">
                    <Heart
                      className="w-12 h-12 text-emerald-400/60 animate-pulse"
                      style={{ animationDuration: '1.5s' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 border-2 border-emerald-400/30 rounded-full animate-ping"
                        style={{ animationDuration: '1.5s' }}
                      />
                    </div>
                  </div>
                )}

                {/* Code Particles */}
                <div className="absolute inset-0">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute text-[8px] text-teal-300/20 font-mono"
                      style={{
                        left: `${20 + (i % 4) * 20}%`,
                        top: `${20 + Math.floor(i / 4) * 40}%`,
                        animation: `fadeInOut ${2 + Math.random()}s ease-in-out infinite`,
                        animationDelay: `${i * 0.3}s`,
                      }}
                    >
                      {['01', '10', '11', '00'][Math.floor(Math.random() * 4)]}
                    </div>
                  ))}
                </div>
              </div>

              {/* Wings - Light Geometry */}
              <div className="absolute top-1/3 -left-24 w-20 h-32 border-l border-t border-teal-400/20 rounded-tl-[5rem]
                backdrop-blur-sm transform -rotate-12"
              />
              <div className="absolute top-1/3 -right-24 w-20 h-32 border-r border-t border-teal-400/20 rounded-tr-[5rem]
                backdrop-blur-sm transform rotate-12"
              />
            </div>
          </div>
        </div>

        {/* Whisper Text */}
        {phase === 'whisper' && (
          <div
            className="absolute top-1/2 mt-32 left-0 right-0 text-center animate-fadeIn"
          >
            <p className="text-2xl font-light text-teal-200/80 tracking-wide px-8 mb-2">
              "Your record endures."
            </p>
            <p className="text-xs text-teal-400/40 uppercase tracking-widest">
              — Raphael
            </p>
          </div>
        )}

        {/* Rising Orbs to Vault */}
        {phase === 'vault' && (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute bottom-1/2 left-1/2 -translate-x-1/2"
                  style={{
                    animation: `riseToVault ${3 + i * 0.3}s ease-out forwards`,
                    animationDelay: `${i * 0.4}s`,
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400/40 to-teal-400/40
                    blur-sm border border-emerald-300/30"
                  />
                </div>
              ))}
            </div>

            {/* Vault of Light Above */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-32">
              <div className="relative w-full h-full">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-400/20 via-teal-400/10 to-transparent
                  rounded-t-full border-t border-l border-r border-amber-300/30 backdrop-blur-md"
                />
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full bg-emerald-400/60 animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s`, animationDuration: '2s' }}
                    />
                  ))}
                </div>
                <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-amber-300/60
                  uppercase tracking-wider">
                  Vault of Light
                </p>
              </div>
            </div>
          </>
        )}

        {/* Final Logo */}
        {phase === 'complete' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center animate-fadeIn">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-8 h-8 text-teal-400/60" />
              <h2 className="text-3xl font-light tracking-[0.3em] text-teal-300/80">
                EVERAFTER
              </h2>
              <Sparkles className="w-8 h-8 text-teal-400/60" />
            </div>
            <p className="text-sm tracking-[0.4em] text-teal-400/50 uppercase">
              Digital Continuity
            </p>
          </div>
        )}

        {/* Translucent UI Panel - Bottom */}
        <div
          className={`absolute bottom-8 left-4 right-4 transition-all duration-1000 ${
            phase === 'whisper' || phase === 'vault' ? 'opacity-30 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="bg-slate-900/30 backdrop-blur-md border border-teal-400/20 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Heart className="w-5 h-5 text-emerald-400/60" />
              <span className="text-sm text-teal-200/80 font-light">
                St. Raphael • The Healer
              </span>
            </div>
            <p className="text-xs text-teal-300/50 leading-relaxed">
              Guardian of health and healing. Your wellness journey is preserved eternally.
            </p>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.2; }
          25% { transform: translateY(-30px) translateX(10px); opacity: 0.4; }
          50% { transform: translateY(-60px) translateX(-10px); opacity: 0.6; }
          75% { transform: translateY(-30px) translateX(10px); opacity: 0.4; }
        }

        @keyframes riseToVault {
          0% { transform: translateY(0) translateX(-50%); opacity: 0; }
          20% { opacity: 0.8; }
          100% { transform: translateY(-600px) translateX(-50%); opacity: 0; }
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.5; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fadeIn {
          animation: fadeIn 2s ease-out forwards;
        }

        .animate-spin-slow {
          animation: spin 20s linear infinite;
        }

        .animate-spin-reverse {
          animation: spin 15s linear infinite reverse;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
