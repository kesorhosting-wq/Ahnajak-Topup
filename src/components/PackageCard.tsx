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

  const gameTextStyle = {
    color: "#ffffff",
    fontWeight: 900,
    fontFamily: '"Nunito", "Arial Rounded MT Bold", sans-serif',
    textShadow: `
      -1.5px -1.5px 0 #794D00,
       1.5px -1.5px 0 #794D00,
      -1.5px  1.5px 0 #794D00,
       1.5px  1.5px 0 #794D00,
       0px    3px   3px rgba(0,0,0,0.5)
    `,
    lineHeight: "1.1",
  };

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative w-full overflow-hidden rounded-[14px] transition-transform duration-200 ease-out",
        "hover:-translate-y-1 active:scale-[0.98]",
        selected && "ring-2 ring-white ring-offset-2 ring-offset-[#D4A84B]",
      )}
    >
      <div
        className="relative flex items-center w-full rounded-[14px] shadow-md border border-[#FDE08B]/50 p-2 sm:p-2.5"
        style={{
          background: settings.packageBgImage
            ? `url(${settings.packageBgImage})`
            : "linear-gradient(135deg, #E6B93F 0%, #C99622 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: isMobile ? "110px" : "130px",
        }}
      >
        {/* Left Side: Image Box Container */}
        <div className="w-[35%] max-w-[100px] aspect-square flex-shrink-0 z-10 relative">
          <div className="absolute inset-0 bg-white/20 rounded-xl backdrop-blur-[2px] shadow-inner"></div>
          <div className="relative w-full h-full flex items-center justify-center p-2">
            {iconSrc && !iconError ? (
              <>
                {!iconLoaded && <div className="absolute inset-2 rounded-lg bg-white/20 animate-pulse" />}
                <img
                  src={iconSrc}
                  alt=""
                  className="w-full h-full object-contain drop-shadow-xl"
                  style={{ opacity: iconLoaded ? 1 : 0, transition: "opacity 200ms" }}
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
              <span className="text-3xl drop-shadow-md">💎</span>
            ) : null}
          </div>
        </div>

        {/* Right Side: Stacked Text Area */}
        <div className="flex-1 flex flex-col justify-center items-center pl-2 sm:pl-3 z-10 min-w-0">
          {/* Price */}
          <div style={gameTextStyle} className="text-[16px] sm:text-[20px] whitespace-nowrap mb-0.5 tracking-wide">
            {settings.packageCurrencySymbol || "$"}{" "}
            {pkg.price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>

          {/* Amount / Multiplier (Scaled down slightly) */}
          <div style={gameTextStyle} className="text-[28px] sm:text-[36px] leading-none my-0.5 tracking-wider">
            {/* Added " " prefix to match the "x1" in your second screenshot. 
                Remove the "x " if you only want the number! */}
            x {pkg.amount.toLocaleString()}
          </div>

          {/* Name */}
          <div
            style={gameTextStyle}
            className="text-[11px] sm:text-[14px] leading-tight text-center mt-0.5 px-1 whitespace-pre-wrap break-words w-full"
          >
            {pkg.name}
          </div>
        </div>

        {/* Special Ribbon Overlay */}
        {isSpecial && (
          <div className="absolute top-0 right-0 overflow-hidden w-[60px] h-[60px] rounded-tr-[14px] z-20 pointer-events-none">
            <div className="absolute top-[12px] right-[-20px] w-[200%] rotate-45 bg-[#FF4500] text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider py-[2px] text-center shadow-md border-y border-white/30">
              Special
            </div>
          </div>
        )}

        {/* Selected Checkmark */}
        {selected && (
          <div className="absolute top-1 left-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center z-20 border border-white shadow-sm">
            <span className="text-white text-xs font-bold">✓</span>
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
