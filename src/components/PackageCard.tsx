import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Package } from '@/contexts/SiteContext';
import { useSite } from '@/contexts/SiteContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { resolveIconUrl } from '@/lib/icon-url';

interface PackageCardProps {
  pkg: Package;
  selected: boolean;
  onSelect: () => void;
  priority?: boolean;
  gameDefaultIcon?: string;
  isSpecial?: boolean;
}

const PackageCard: React.FC<PackageCardProps> = ({ pkg, selected, onSelect, priority = false, gameDefaultIcon, isSpecial = false }) => {
  const { settings } = useSite();
  const isMobile = useIsMobile();
  const [iconLoaded, setIconLoaded] = useState(false);
  const [iconError, setIconError] = useState(false);

  const iconSize = isMobile
    ? (settings.packageIconSizeMobile || 64)
    : (settings.packageIconSizeDesktop || 60);

  const iconSrc = resolveIconUrl(
    pkg.icon || gameDefaultIcon || settings.packageIconUrl,
    settings.iconCdnBaseUrl
  );

  const cardHeight = isMobile
    ? Math.max(settings.packageHeight || 96, 92)
    : Math.max(settings.packageHeight || 110, 104);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 active:scale-[0.98]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/70",
        selected && "ring-2 ring-gold ring-offset-2 ring-offset-background"
      )}
    >
      <div
        className={cn(
          "relative flex items-center rounded-xl overflow-hidden shadow-md transition-shadow duration-200 group-hover:shadow-lg"
        )}
        style={{
          height: `${cardHeight}px`,
          background: settings.packageBgImage
            ? `url(${settings.packageBgImage})`
            : settings.packageBgColor
              ? settings.packageBgColor
              : 'linear-gradient(135deg, #2a2a2e 0%, #161618 55%, #2a2a2e 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: settings.packageBorderWidth
            ? `${settings.packageBorderWidth}px solid ${settings.packageBorderColor || '#D4A84B'}`
            : '1px solid hsl(var(--border) / 0.4)',
          contain: 'layout paint',
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/20" />

        {/* Icon */}
        <div className="flex items-center pl-2.5 sm:pl-3 z-10">
          <div
            className="relative flex items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10"
            style={{ width: `${iconSize + 8}px`, height: `${iconSize + 8}px` }}
          >
            {iconSrc && !iconError ? (
              <>
                {!iconLoaded && (
                  <div
                    className="absolute rounded-full bg-gradient-to-br from-white/10 to-white/[0.03] animate-pulse"
                    style={{ width: iconSize, height: iconSize }}
                    aria-hidden
                  />
                )}
                <img
                  src={iconSrc}
                  alt=""
                  width={iconSize}
                  height={iconSize}
                  className="object-contain"
                  style={{
                    width: iconSize,
                    height: iconSize,
                    opacity: iconLoaded ? 1 : 0,
                    transition: 'opacity 200ms',
                  }}
                  loading={priority ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={priority ? 'high' : 'low'}
                  onLoad={() => setIconLoaded(true)}
                  onError={() => { setIconError(true); setIconLoaded(true); }}
                />
              </>
            ) : iconError ? (
              <span className="text-2xl sm:text-3xl">💎</span>
            ) : (
              <div
                className="rounded-full bg-gradient-to-br from-white/10 to-white/[0.03] animate-pulse"
                style={{ width: iconSize, height: iconSize }}
                aria-hidden
              />
            )}
          </div>
        </div>

        {/* Center content */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-2 leading-tight z-10">
          <span
            className="truncate text-sm sm:text-base tracking-wide"
            style={{
              color: settings.packageTextColor || '#ffffff',
              fontWeight: settings.packageTextWeight || 700,
              textShadow: '0 1px 2px rgba(0,0,0,0.4)',
            }}
          >
            {pkg.amount.toLocaleString()}
          </span>
          <span
            className="truncate text-[10px] sm:text-xs opacity-80"
            style={{
              color: settings.packageTextColor || '#ffffff',
              fontWeight: settings.packageTextWeight || 500,
            }}
          >
            {pkg.name}
          </span>
          {pkg.quantity != null && pkg.quantity > 0 && (
            <span
              className="text-[9px] sm:text-[10px] opacity-60"
              style={{ color: settings.packageTextColor || '#ffffff' }}
            >
              ×{pkg.quantity} available
            </span>
          )}
        </div>

        {/* Price pill */}
        <div className="relative flex items-center justify-end pr-2.5 sm:pr-3 pl-3 z-10">
          <span
            className="whitespace-nowrap text-xs sm:text-sm rounded-full px-2.5 py-1 bg-gradient-to-r from-gold/90 to-amber-500/90 text-black shadow-[0_2px_10px_rgba(212,168,75,0.45)]"
            style={{
              color: settings.packagePriceColor || undefined,
              fontWeight: settings.packagePriceWeight || 800,
            }}
          >
            {settings.packageCurrencySymbol || '$'}
            {pkg.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {selected && (
          <div className="absolute top-1 right-1 w-5 h-5 sm:w-6 sm:h-6 bg-gold rounded-full flex items-center justify-center z-20 shadow-lg">
            <span className="text-primary-foreground text-[11px] sm:text-xs font-bold">✓</span>
          </div>
        )}

        {pkg.label && (
          <div
            className="absolute top-0 left-0 z-20 inline-flex items-center gap-1 px-2 py-[3px] rounded-br-lg shadow-md"
            style={{ backgroundColor: pkg.labelBgColor || '#dc2626' }}
          >
            {pkg.labelIcon && (
              <img src={pkg.labelIcon} alt="" className="w-3 h-3 object-contain" loading="lazy" decoding="async" />
            )}
            <span
              className="text-[8px] sm:text-[10px] font-extrabold uppercase tracking-wider truncate"
              style={{ color: pkg.labelTextColor || '#ffffff' }}
            >
              {pkg.label}
            </span>
          </div>
        )}

        {isSpecial && (
          <div className="pointer-events-none absolute -top-px -right-px z-30 h-16 w-16 overflow-hidden">
            <div className="absolute top-[14px] right-[-34px] rotate-45 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider px-8 py-[2px] shadow-md">
              Special
            </div>
          </div>
        )}
      </div>
    </button>
  );
};

export default React.memo(PackageCard, (prev, next) =>
  prev.pkg === next.pkg &&
  prev.selected === next.selected &&
  prev.priority === next.priority &&
  prev.gameDefaultIcon === next.gameDefaultIcon &&
  prev.isSpecial === next.isSpecial
);
