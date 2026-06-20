import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const WelcomeLoader: React.FC = () => {
  const [show, setShow] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Smooth progress calculation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        // Increment by a random chunk to feel organic
        const increment = Math.floor(Math.random() * 12) + 6;
        return Math.min(prev + increment, 100);
      });
    }, 120);

    // Start fading out after 1.8 seconds
    const fadeTimeout = setTimeout(() => {
      setIsFading(true);
    }, 1800);

    // Fully remove from DOM after the fade-out CSS animation completes (700ms)
    const removeTimeout = setTimeout(() => {
      setShow(false);
    }, 2500);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(fadeTimeout);
      clearTimeout(removeTimeout);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#0a0805]/40 backdrop-blur-3xl transition-all duration-700 ease-in-out",
        isFading ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
      )}
    >
      {/* Dynamic golden radial glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] md:w-[600px] md:h-[600px] rounded-full bg-[#E6B93F]/10 blur-[100px] -z-10 animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] md:w-[300px] md:h-[300px] rounded-full bg-[#E6B93F]/5 blur-[50px] -z-10" />

      {/* Loader Content */}
      <div className="flex flex-col items-center max-w-[90vw] md:max-w-[550px] px-6 text-center select-none">
        {/* Floating Logo Banner */}
        <div className="relative mb-8">
          <img
            src="/images/welcome-loader.png"
            alt="Welcome to KesorTopup"
            className="w-full max-h-[45vh] object-contain drop-shadow-[0_0_35px_rgba(230,185,63,0.3)]"
            style={{
              animation: 'float 3.5s ease-in-out infinite'
            }}
          />
        </div>

        {/* Progress Bar Container */}
        <div className="w-64 md:w-80 h-1.5 bg-[#E6B93F]/10 rounded-full overflow-hidden border border-[#E6B93F]/10 shadow-inner relative">
          <div
            className="h-full bg-gradient-to-r from-[#E6B93F]/60 via-[#E6B93F] to-[#E6B93F]/80 rounded-full transition-all duration-200 ease-out shadow-[0_0_8px_rgba(230,185,63,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Percentage Label */}
        <p className="mt-3 text-[10px] md:text-xs font-bold tracking-[0.25em] text-[#E6B93F]/70 uppercase animate-pulse font-mono">
          Loading {progress}%
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-12px) scale(1.02); }
        }
      `}</style>
    </div>
  );
};

export default WelcomeLoader;
