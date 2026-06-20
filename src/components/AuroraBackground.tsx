import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useSite } from "@/contexts/SiteContext";
import LiquidChrome from "./LiquidChrome";

// Parse hex color string to normalized RGB array [0-1] for WebGL shader
const hexToRgb = (hex: string): [number, number, number] => {
  const defaultColor: [number, number, number] = [0.83, 0.66, 0.29]; // #D4A84B normalized
  if (!hex) return defaultColor;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return defaultColor;
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return [r, g, b];
};

/**
 * Premium 3D WebGL Background — Dynamic liquid chrome flowing canvas themed to the primary brand color.
 */
const AuroraBackground: React.FC<{ className?: string }> = ({ className }) => {
  const { settings } = useSite();
  const baseColor = useMemo(() => hexToRgb(settings.primaryColor), [settings.primaryColor]);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background",
        className
      )}
    >
      <LiquidChrome
        baseColor={baseColor}
        speed={0.12}
        amplitude={0.25}
        frequencyX={2.2}
        frequencyY={2.2}
        interactive={true}
      />
      {/* Dynamic gradient overlay to ensure UI elements stand out with high contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background/95 pointer-events-none" />
    </div>
  );
};

export default AuroraBackground;
