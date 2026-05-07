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

  const iconSrc = resolveIconUrl(pkg.icon || gameDefaultIcon || settings.packageIconUrl, settings.iconCdnBaseUrl);

  const cardHeight = isMobile ? 170 : 255;

  const priceFont = isMobile ? 42 : 78;
  const amountFont = isMobile ? 78 : 150;
  const nameFont = isMobile ? 33 : 58;

  const iconBox = isMobile ? 112 : 185;
  const iconSize = isMobile ? 95 : 155;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative w-full overflow-hidden rounded-[14px] transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 active:scale-[0.98]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300/80",
        selected && "ring-4 ring-yellow-300 ring-offset-2 ring-offset-background",
      )}
    >
      <div
        className="relative overflow-hidden rounded-[14px] shadow-md transition-shadow duration-200 group-hover:shadow-xl"
        style={{
          height: `${cardHeight}px`,
          background: settings.packageBgImage
            ? `url(${settings.packageBgImage})`
            : "linear-gradient(180deg, #d6a11c 0%, #c88b10 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          border: settings.packageBorderWidth
            ? `${settings.packageBorderWidth}px solid ${settings.packageBorderColor || "#f1c75b"}`
            : "1px solid rgba(255, 215, 90, 0.55)",
          contain: "layout paint",
        }}
      >
        {/* Pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                45deg,
                rgba(255,255,255,0.10) 0px,
                rgba(255,255,255,0.10) 2px,
                transparent 2px,
                transparent 34px
              )
            `,
          }}
        />

        {/* Gold glow */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/15" />

        {/* Left soft icon panel */}
        <div
          className="absolute left-[3%] top-1/2 -translate-y-1/2 rounded-[20px] bg-white/15 backdrop-blur-[1px]"
          style={{
            width: isMobile ? "42%" : "43%",
            height: "82%",
          }}
        />

        {/* Icon */}
        <div
          className="absolute left-[7%] top-1/2 z-10 flex -translate-y-1/2 items-center justify-center"
          style={{
            width: `${iconBox}px`,
            height: `${iconBox}px`,
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
                width={iconSize}
                height={iconSize}
                className="object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,.35)]"
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
          ) : (
            <span className="text-6xl drop-shadow-lg">💎</span>
          )}
        </div>

        {/* Text content */}
        <div className="absolute inset-y-0 right-[4%] z-10 flex flex-col items-end justify-center leading-none">
          {/* Price */}
          <div
            className="whitespace-nowrap text-white"
            style={{
              fontSize: `${priceFont}px`,
              fontWeight: 900,
              lineHeight: 0.85,
              letterSpacing: "-0.05em",
              textShadow: "5px 6px 0 rgba(72, 52, 0, 0.65)",
            }}
          >
            {settings.packageCurrencySymbol || "$"}
            {pkg.price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>

          {/* Amount */}
          <div
            className="whitespace-nowrap text-white"
            style={{
              fontSize: `${amountFont}px`,
              fontWeight: 900,
              lineHeight: 0.72,
              letterSpacing: "-0.08em",
              textShadow: "8px 10px 0 rgba(72, 52, 0, 0.62)",
              marginTop: isMobile ? "4px" : "10px",
            }}
          >
            {pkg.amount.toLocaleString()}
          </div>

          {/* Name */}
          <div
            className="whitespace-nowrap text-white"
            style={{
              fontSize: `${nameFont}px`,
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              textShadow: "5px 6px 0 rgba(72, 52, 0, 0.62)",
              marginTop: isMobile ? "8px" : "16px",
            }}
          >
            {pkg.name}
          </div>

          {pkg.quantity != null && pkg.quantity > 0 && (
            <div
              className="mt-2 rounded-full bg-black/25 px-3 py-1 text-xs font-bold text-white"
              style={{
                textShadow: "0 1px 2px rgba(0,0,0,.6)",
              }}
            >
              ×{pkg.quantity} available
            </div>
          )}
        </div>

        {/* Selected tick */}
        {selected && (
          <div className="absolute right-2 top-2 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-yellow-600 shadow-lg">
            ✓
          </div>
        )}

        {/* Label */}
        {pkg.label && (
          <div
            className="absolute left-0 top-0 z-30 inline-flex items-center gap-1 rounded-br-lg px-2 py-[3px] shadow-md"
            style={{ backgroundColor: pkg.labelBgColor || "#dc2626" }}
          >
            {pkg.labelIcon && (
              <img
                src={resolveIconUrl(pkg.labelIcon, settings.iconCdnBaseUrl)}
                alt=""
                className="h-3 w-3 object-contain"
                loading="lazy"
                decoding="async"
              />
            )}
            <span
              className="truncate text-[9px] font-extrabold uppercase tracking-wider"
              style={{ color: pkg.labelTextColor || "#ffffff" }}
            >
              {pkg.label}
            </span>
          </div>
        )}

        {/* Special ribbon */}
        {isSpecial && (
          <div className="pointer-events-none absolute -right-px -top-px z-30 h-16 w-16 overflow-hidden">
            <div className="absolute right-[-34px] top-[14px] rotate-45 bg-gradient-to-r from-red-600 to-orange-500 px-8 py-[2px] text-[9px] font-extrabold uppercase tracking-wider text-white shadow-md">
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
