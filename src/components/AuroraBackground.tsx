import React from "react";
import { cn } from "@/lib/utils";
import LiquidChrome from "./LiquidChrome";

/**
 * Khmer-themed Liquid Chrome animated background.
 * Warm gold/amber base for an Angkor-sunset feel.
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
      <LiquidChrome
        baseColor={[0.18, 0.11, 0.03]}
        speed={0.35}
        amplitude={0.45}
        frequencyX={3}
        frequencyY={2.4}
        interactive={false}
      />
      {/* Warm gold tint overlay */}
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(255,180,70,0.35), transparent 70%)",
        }}
      />
      {/* Vignette for legibility */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.45)_100%)]" />
    </div>
  );
};

export default AuroraBackground;
