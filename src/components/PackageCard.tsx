import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Package } from '@/contexts/SiteContext';
import { useSite } from '@/contexts/SiteContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';

interface PackageCardProps {
  pkg: Package;
  selected: boolean;
  onSelect: () => void;
  priority?: boolean;
  gameDefaultIcon?: string;
}

const imageCache = new Map<string, boolean>();

const preloadImage = (src: string): Promise<boolean> => {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { imageCache.set(src, true); resolve(true); };
    img.onerror = () => { imageCache.set(src, false); resolve(false); };
    img.src = src;
  });
};

const PackageCard: React.FC<PackageCardProps> = ({ pkg, selected, onSelect, priority = false, gameDefaultIcon }) => {
  const { settings } = useSite();
  const isMobile = useIsMobile();
  const [iconLoaded, setIconLoaded] = useState(false);
  const [iconError, setIconError] = useState(false);
  const [isVisible, setIsVisible] = useState(priority);
  const cardRef = useRef<HTMLButtonElement>(null);

  const iconSize = isMobile
    ? (settings.packageIconSizeMobile || 56)
    : (settings.packageIconSizeDesktop || 44);

  const iconSrc = pkg.icon || gameDefaultIcon || settings.packageIconUrl;

  useEffect(() => {
    if (priority || !cardRef.current) { setIsVisible(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { rootMargin: '100px', threshold: 0 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [priority]);

  useEffect(() => {
    if (!isVisible || !iconSrc) { if (!iconSrc) setIconLoaded(true); return; }
    if (imageCache.has(iconSrc)) {
      setIconLoaded(true);
      setIconError(!imageCache.get(iconSrc));
    } else {
      preloadImage(iconSrc).then((success) => { setIconLoaded(true); setIconError(!success); });
    }
  }, [iconSrc, isVisible]);

  const cardHeight = Math.min(
    settings.packageHeight || 78,
    isMobile ? 72 : (settings.packageHeight || 78)
  );

  return (
    <button
      ref={cardRef}
      onClick={onSelect}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl transition-all duration-300 ease-out",
        "hover:-translate-y-0.5 hover:scale-[1.015] active:scale-[0.98]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/70",
        selected && "ring-2 ring-gold ring-offset-2 ring-offset-background animate-scale-in"
      )}
      style={{ animation: 'fade-in 0.35s ease-out' }}
    >
      {/* Outer card */}
      <div
        className={cn(
          "relative flex items-center rounded-xl overflow-hidden",
          "shadow-md group-hover:shadow-xl group-hover:shadow-gold/20 transition-all duration-300"
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
        }}
      >
        {/* Subtle inner highlight */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/20" />

        {/* Animated shimmer sweep on hover */}
        <div
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[400%] transition-all duration-[1100ms] ease-out"
        />

        {/* Icon */}
        <div className="flex items-center pl-2.5 sm:pl-3 z-10">
          <div
            className={cn(
              "relative flex items-center justify-center rounded-lg",
              "bg-white/5 backdrop-blur-sm ring-1 ring-white/10",
              "transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-3deg]"
            )}
            style={{ width: `${iconSize + 8}px`, height: `${iconSize + 8}px` }}
          >
            {!isVisible || !iconLoaded ? (
              <Skeleton className="rounded-md" style={{ width: iconSize, height: iconSize }} />
            ) : iconSrc && !iconError ? (
              <img
                src={iconSrc}
                alt=""
                className="object-contain drop-shadow-[0_2px_6px_rgba(212,168,75,0.35)]"
                style={{ width: iconSize, height: iconSize }}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
              />
            ) : (
              <span className="text-2xl sm:text-3xl">💎</span>
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
            className={cn(
              "whitespace-nowrap text-xs sm:text-sm rounded-full px-2.5 py-1",
              "bg-gradient-to-r from-gold/90 to-amber-500/90 text-black",
              "shadow-[0_2px_10px_rgba(212,168,75,0.45)]",
              "transition-transform duration-300 group-hover:scale-105"
            )}
            style={{
              color: settings.packagePriceColor || undefined,
              fontWeight: settings.packagePriceWeight || 800,
            }}
          >
            {settings.packageCurrencySymbol || '$'}
            {pkg.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Selection check */}
        {selected && (
          <div className="absolute top-1 right-1 w-5 h-5 sm:w-6 sm:h-6 bg-gold rounded-full flex items-center justify-center z-20 shadow-lg animate-scale-in">
            <span className="text-primary-foreground text-[11px] sm:text-xs font-bold">✓</span>
          </div>
        )}

        {/* Label */}
        {pkg.label && (
          <div
            className="absolute top-0 left-0 z-20 inline-flex items-center gap-1 px-2 py-[3px] rounded-br-lg shadow-md"
            style={{ backgroundColor: pkg.labelBgColor || '#dc2626' }}
          >
            {pkg.labelIcon && (
              <img src={pkg.labelIcon} alt="" className="w-3 h-3 object-contain" loading="lazy" />
            )}
            <span
              className="text-[8px] sm:text-[10px] font-extrabold uppercase tracking-wider truncate"
              style={{ color: pkg.labelTextColor || '#ffffff' }}
            >
              {pkg.label}
            </span>
          </div>
        )}

        {/* Selected pulsing ring overlay */}
        {selected && (
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-gold/60 animate-pulse" />
        )}
      </div>
    </button>
  );
};

export default PackageCard;
