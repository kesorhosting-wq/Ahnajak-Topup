import React from "react";
import { cn } from "@/lib/utils";

/**
 * Khmer-themed animated background.
 * - Warm gold/cream gradient wash (Angkor sunset)
 * - Floating aurora blobs in temple-gold tones
 * - Slowly drifting Khmer kbach (ornamental) SVG pattern
 * - Pulsing lotus glow accents
 * Pure CSS/SVG, GPU-accelerated, respects prefers-reduced-motion.
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
      {/* Base warm gradient — cream to gold */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #fff7e3 0%, #fde8b5 35%, #f6cf76 70%, #e6b93f 100%)",
        }}
      />

      {/* Aurora blobs */}
      <div className="aurora-blob aurora-blob--1" />
      <div className="aurora-blob aurora-blob--2" />
      <div className="aurora-blob aurora-blob--3" />
      <div className="aurora-blob aurora-blob--4" />

      {/* Khmer kbach pattern — drifts diagonally */}
      <div
        className="absolute -inset-[20%] opacity-[0.10] animate-kbach-drift"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'>
              <g fill='none' stroke='%23794D00' stroke-width='1.4' stroke-linecap='round'>
                <!-- Lotus petal motif -->
                <path d='M80 20 C 60 50, 60 70, 80 90 C 100 70, 100 50, 80 20 Z'/>
                <path d='M80 140 C 60 110, 60 90, 80 70 C 100 90, 100 110, 80 140 Z'/>
                <path d='M20 80 C 50 60, 70 60, 90 80 C 70 100, 50 100, 20 80 Z'/>
                <path d='M140 80 C 110 60, 90 60, 70 80 C 90 100, 110 100, 140 80 Z'/>
                <!-- Center bloom -->
                <circle cx='80' cy='80' r='6'/>
                <circle cx='80' cy='80' r='14'/>
                <!-- Corner spirals (kbach) -->
                <path d='M10 10 q 14 0 14 14 q 0 -8 8 -8'/>
                <path d='M150 10 q -14 0 -14 14 q 0 -8 -8 -8'/>
                <path d='M10 150 q 14 0 14 -14 q 0 8 8 8'/>
                <path d='M150 150 q -14 0 -14 -14 q 0 8 -8 8'/>
              </g>
            </svg>`
          )}")`,
          backgroundSize: "160px 160px",
        }}
      />

      {/* Lotus glow accents — pulsing */}
      <div
        className="absolute top-[15%] left-[12%] w-40 h-40 rounded-full blur-3xl animate-lotus-pulse"
        style={{ background: "radial-gradient(circle, rgba(255,180,80,0.55), transparent 70%)" }}
      />
      <div
        className="absolute bottom-[18%] right-[10%] w-56 h-56 rounded-full blur-3xl animate-lotus-pulse"
        style={{
          background: "radial-gradient(circle, rgba(255,140,60,0.45), transparent 70%)",
          animationDelay: "1.5s",
        }}
      />
      <div
        className="absolute top-[55%] left-[60%] w-44 h-44 rounded-full blur-3xl animate-lotus-pulse"
        style={{
          background: "radial-gradient(circle, rgba(255,210,120,0.5), transparent 70%)",
          animationDelay: "3s",
        }}
      />

      {/* Soft vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(60,30,0,0.18)_100%)]" />
    </div>
  );
};

export default AuroraBackground;
