import React from "react";
import { cn } from "@/lib/utils";

/**
 * Khmer-themed Light Rays background (inspired by reactbits Light Rays).
 * Pure CSS — warm gold/amber rays sweeping from top, lotus glow accents,
 * subtle kbach pattern overlay. GPU-accelerated, respects reduced motion.
 */
const AuroraBackground: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className
      )}
    >
      {/* Deep warm base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #5a2a05 0%, #2a1100 55%, #120800 100%)",
        }}
      />

      {/* Light rays — multiple conic gradients fanning from top */}
      <div className="absolute inset-0 light-rays light-rays--a" />
      <div className="absolute inset-0 light-rays light-rays--b" />

      {/* Top warm glow source */}
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[120vw] h-[60vh] rounded-full blur-3xl animate-lotus-pulse"
        style={{
          background:
            "radial-gradient(ellipse, rgba(255,180,70,0.55), rgba(255,120,40,0.25) 40%, transparent 70%)",
        }}
      />

      {/* Side lotus glow accents */}
      <div
        className="absolute bottom-[12%] left-[8%] w-72 h-72 rounded-full blur-3xl animate-lotus-pulse"
        style={{
          background: "radial-gradient(circle, rgba(255,160,60,0.35), transparent 70%)",
          animationDelay: "1.5s",
        }}
      />
      <div
        className="absolute bottom-[18%] right-[6%] w-80 h-80 rounded-full blur-3xl animate-lotus-pulse"
        style={{
          background: "radial-gradient(circle, rgba(230,185,63,0.4), transparent 70%)",
          animationDelay: "3s",
        }}
      />

      {/* Khmer kbach ornament overlay */}
      <div
        className="absolute -inset-[20%] opacity-[0.06] animate-kbach-drift"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'>
              <g fill='none' stroke='%23FFD27A' stroke-width='1.2' stroke-linecap='round'>
                <path d='M80 20 C 60 50, 60 70, 80 90 C 100 70, 100 50, 80 20 Z'/>
                <path d='M80 140 C 60 110, 60 90, 80 70 C 100 90, 100 110, 80 140 Z'/>
                <path d='M20 80 C 50 60, 70 60, 90 80 C 70 100, 50 100, 20 80 Z'/>
                <path d='M140 80 C 110 60, 90 60, 70 80 C 90 100, 110 100, 140 80 Z'/>
                <circle cx='80' cy='80' r='6'/>
                <circle cx='80' cy='80' r='14'/>
              </g>
            </svg>`
          )}")`,
          backgroundSize: "160px 160px",
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
};

export default AuroraBackground;
