import React from "react";
import { cn } from "@/lib/utils";

/**
 * Animated aurora background — theme-matched (gold / amber / cream).
 * Pure CSS, GPU-accelerated, respects prefers-reduced-motion.
 * Inspired by reactbits.dev animated backgrounds.
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
      {/* Base wash */}
      <div className="absolute inset-0 bg-gradient-cream" />

      {/* Aurora blobs */}
      <div className="aurora-blob aurora-blob--1" />
      <div className="aurora-blob aurora-blob--2" />
      <div className="aurora-blob aurora-blob--3" />
      <div className="aurora-blob aurora-blob--4" />

      {/* Soft grain / vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.35)_100%)]" />
    </div>
  );
};

export default AuroraBackground;
