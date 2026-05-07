import React from "react";
import { Package } from "@/contexts/SiteContext";
import { resolveIconUrl } from "@/lib/icon-url";
import { useSite } from "@/contexts/SiteContext";

interface PackageCardProps {
  pkg: Package;
  selected: boolean;
  onSelect: () => void;
  priority?: boolean;
  gameDefaultIcon?: string;
  isSpecial?: boolean;
}

const PackageCard: React.FC<PackageCardProps> = ({ pkg, selected, onSelect, priority = false, gameDefaultIcon }) => {
  const { settings } = useSite();

  const iconSrc = resolveIconUrl(pkg.icon || gameDefaultIcon || settings.packageIconUrl, settings.iconCdnBaseUrl);

  return (
    <button
      onClick={onSelect}
      className={`relative w-full overflow-hidden rounded-[18px] transition-all duration-200
        hover:scale-[1.02] active:scale-[0.98]
        ${selected ? "ring-4 ring-yellow-300" : ""}
      `}
    >
      <div
        className="relative aspect-[16/9] overflow-hidden rounded-[18px] border border-yellow-500/40"
        style={{
          backgroundImage: settings.packageBgImage
            ? `url(${settings.packageBgImage})`
            : `
              linear-gradient(rgba(205,143,18,.88), rgba(205,143,18,.88)),
              radial-gradient(circle at center, #f6c94e 0%, #b9780e 100%)
            `,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Khmer/gold pattern overlay */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.10) 0 2px, transparent 2px 34px)",
          }}
        />

        {/* soft image box */}
        <div className="absolute left-[3%] top-[8%] h-[84%] w-[44%] rounded-[22px] bg-white/20 backdrop-blur-[1px]" />

        {/* Icon */}
        <div className="absolute left-[8%] top-1/2 flex h-[58%] w-[34%] -translate-y-1/2 items-center justify-center">
          {iconSrc ? (
            <img
              src={iconSrc}
              alt={pkg.name}
              className="h-full w-full object-contain drop-shadow-[0_8px_8px_rgba(0,0,0,.35)]"
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={priority ? "high" : "low"}
            />
          ) : (
            <span className="text-7xl">💎</span>
          )}
        </div>

        {/* Price */}
        <div className="absolute right-[4%] top-[3%] text-[clamp(28px,7vw,92px)] font-black leading-none text-white drop-shadow-[6px_7px_0_rgba(74,53,0,.75)]">
          {settings.packageCurrencySymbol || "$"}
          {pkg.price.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>

        {/* Amount */}
        <div className="absolute right-[12%] top-[32%] text-[clamp(70px,15vw,210px)] font-black leading-none text-white drop-shadow-[10px_13px_0_rgba(74,53,0,.65)]">
          {pkg.amount.toLocaleString()}
        </div>

        {/* Name */}
        <div className="absolute bottom-[7%] right-[4%] text-[clamp(28px,6vw,80px)] font-black leading-none text-white drop-shadow-[6px_7px_0_rgba(74,53,0,.65)]">
          {pkg.name}
        </div>

        {/* Selected tick */}
        {selected && (
          <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-yellow-600 shadow-lg">
            ✓
          </div>
        )}

        {/* Label */}
        {pkg.label && (
          <div
            className="absolute left-0 top-0 rounded-br-xl px-3 py-1 text-xs font-black uppercase text-white"
            style={{ backgroundColor: pkg.labelBgColor || "#dc2626" }}
          >
            {pkg.label}
          </div>
        )}
      </div>
    </button>
  );
};

export default React.memo(PackageCard);
