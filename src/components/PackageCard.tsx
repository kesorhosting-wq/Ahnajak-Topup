import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Package } from "@/contexts/SiteContext";
import { useSite } from "@/contexts/SiteContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { resolveIconUrl } from "@/lib/icon-url";

interface PackageCardProps {
  pkg: Package;
  selected: boolean;
  onSelect: () => void;
  priority?: boolean;
  gameDefaultIcon?: string;
  isSpecial?: boolean;
}

const PackageCard: React.FC<PackageCardProps> = ({
  pkg,
  selected,
  onSelect,
  priority = false,
  gameDefaultIcon,
  isSpecial = false,
}) => {
  const { settings } = useSite();
  const isMobile = useIsMobile();
  const [iconLoaded, setIconLoaded] = useState(false);
  const [iconError, setIconError] = useState(false);

  // Increased icon size to match the prominent image style
  const iconSize = isMobile ? 80 : 100;
  const iconSrc = resolveIconUrl(pkg.icon || gameDefaultIcon || settings.packageIconUrl, settings.iconCdnBaseUrl);

  // CSS for the heavy "game style" text outline and shadow
  const getGameTextStyle = (fontSize: string) => ({
    color: "#ffffff",
    fontWeight: 900,
    fontSize: fontSize,
    fontFamily: '"Nunito", "Arial Rounded MT Bold", sans-serif', // Recommended to use a rounded font
    textShadow: `
      -2px -2px 0 #8B6508,
       2px -2px 0 #8B6508,
      -2px  2px 0 #8B6508,
       2px  2px 0 #8B6508,
       0px  4px 0 #5c4103,
       0px  6px 5px rgba(0,0,0,0.5)
    `,
    lineHeight: "1.1",
    letterSpacing: "1px",
  });

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl transition-all duration-200 ease-out",
        "hover:-translate-y-1 hover:shadow-xl active:scale-[0.98]",
        "focus focus-visible focus-visible/70",
        selected && "ring-4 ring-white ring-offset-2 ring-offset-yellow-500",
      )}
    >
      <div
        className="relative flex items-center rounded-2xl overflow-hidden shadow-lg border-2 border-[#FFE885] p-3 sm:p-4"
        style={{
          background: settings.packageBgImage
            ? `url(${settings.packageBgImage})`
            : "radial-gradient(circle at center, #FAD961 0%, #F76B1C 100%)", // Golden gradient fallback
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: isMobile ? "140px" : "160px",
        }}
      >
        {/* Left Side: Icon Container */}
        <div className="flex-shrink-0 z-10 mr-4">
          <div
            className="relative flex items-center justify-center rounded-2xl bg-white/20 shadow-inner"
            style={{
              width: `${iconSize + 24}px`,
              height: `${iconSize + 24}px`,
              backdropFilter: "blur(4px)",
            }}
          >
            {iconSrc && !iconError ? (
              <>
                {!iconLoaded && (
                  <div
                    className="absolute rounded-full bg-white/20 animate-pulse"
                    style={{ width: iconSize, height: iconSize }}
                    aria-hidden
                  />
                )}
                <img
                  src={iconSrc}
                  alt=""
                  className="object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
                  style={{
                    width: iconSize,
                    height: iconSize,
                    opacity: iconLoaded ? 1 : 0,
                    transition: "opacity 200ms",
                  }}
                  loading={priority ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={priority ? "high" : "low"}
                  onLoad={() => setIconLoaded(true)}
                  onError={() => {
                    setIconError(true);
                    setIconLoaded(true);
                  }}
                />
              </>
            ) : iconError ? (
              <span className="text-4xl sm:text-5xl drop-shadow-lg">💎</span>
            ) : null}
          </div>
        </div>

        {/* Right Side: Stacked Game Text */}
        <div className="flex-1 flex flex-col items-center justify-center z-10 w-full min-w-0">
          {/* Price (Top) */}
          <div style={getGameTextStyle(isMobile ? "1.5rem" : "2rem")} className="mb-1">
            {settings.packageCurrencySymbol || "$"}{" "}
            {pkg.price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>

          {/* Amount (Middle - Massive) */}
          <div style={getGameTextStyle(isMobile ? "4rem" : "5rem")} className="my-1 leading-none">
            {pkg.amount.toLocaleString()}
          </div>

          {/* Name (Bottom) */}
          <div style={getGameTextStyle(isMobile ? "1.25rem" : "1.75rem")} className="mt-1">
            {pkg.name}
          </div>
        </div>

        {/* Selected Checkmark Overlay */}
        {selected && (
          <div className="absolute top-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)] border-2 border-white">
            <span className="text-white text-lg font-bold">✓</span>
          </div>
        )}

        {/* Special Banner Overlay */}
        {isSpecial && (
          <div className="pointer-events-none absolute -top-px -right-px z-30 h-20 w-20 overflow-hidden">
            <div className="absolute top-[18px] right-[-40px] rotate-45 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] sm:text-xs font-extrabold uppercase tracking-wider px-10 py-1 shadow-lg border-y border-white/50">
              Special
            </div>
          </div>
        )}
      </div>
    </button>
  );
};

export default React.memo(
  PackageCard,
  (prev, next) =>
    prev.pkg === next.pkg &&
    prev.selected === next.selected &&
    prev.priority === next.priority &&
    prev.gameDefaultIcon === next.gameDefaultIcon &&
    prev.isSpecial === next.isSpecial,
);
