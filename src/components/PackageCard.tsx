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
        className="relative flex flex-col items-center justify-between w-full rounded-[12px] shadow-md border border-[#FDE08B]/50 p-1.5 sm:p-2"
        style={{
          background: settings.packageBgImage
            ? `url(${settings.packageBgImage})`
            : "linear-gradient(135deg, #E6B93F 0%, #C99622 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: isMobile ? "130px" : "150px",
        }}
      >
        {/* Top: Icon */}
        <div className="w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] flex-shrink-0 z-10 relative">
          <div className="absolute inset-0 bg-white/20 rounded-lg backdrop-blur-[2px] shadow-inner"></div>
          <div className="relative w-full h-full flex items-center justify-center p-1">
            {iconSrc && !iconError ? (
              <>
                {!iconLoaded && <div className="absolute inset-1 rounded-md bg-white/20 animate-pulse" />}
                <img
                  src={iconSrc}
                  alt=""
                  className="w-full h-full object-contain drop-shadow-lg"
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
              <span className="text-2xl drop-shadow-md">💎</span>
            ) : null}
          </div>
        </div>

        {/* Middle: Amount + Name */}
        <div className="flex-1 flex flex-col justify-center items-center z-10 min-w-0 w-full px-0.5 py-1">
          <div style={gameTextStyle} className="text-[16px] sm:text-[20px] leading-none tracking-wide">
            {pkg.amount.toLocaleString()}
          </div>
          <div
            style={gameTextStyle}
            className="text-[9px] sm:text-[10px] leading-tight text-center mt-0.5 px-0.5 line-clamp-2 break-words w-full"
          >
            {pkg.name}
          </div>
        </div>

        {/* Bottom: Price pill */}
        <div className="z-10 w-full flex justify-center">
          <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FFD96A] to-[#F5A623] text-black text-[10px] sm:text-[12px] font-extrabold shadow whitespace-nowrap">
            {settings.packageCurrencySymbol || "$"}{" "}
            {pkg.price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
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
