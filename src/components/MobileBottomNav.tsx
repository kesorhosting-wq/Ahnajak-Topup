import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSite } from '@/contexts/SiteContext';
import { Home, PartyPopper, Gamepad2, Repeat, ShoppingCart } from 'lucide-react';

const NAV_H = 72;
const BTN_S = 56;
const OVERLAP = 32;
const RAISE = 16;

const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { settings } = useSite();
  const primaryColor = settings.primaryColor || '#D4A84B';

  if (location.pathname.startsWith('/topup/') || location.pathname === '/checkout') return null;

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'event', label: 'Event', icon: PartyPopper, path: '/events' },
    { id: 'order', label: 'Order', icon: ShoppingCart, path: '/orders', center: true },
    { id: 'game', label: 'Game', icon: Gamepad2, path: '/' },
    { id: 'exchange', label: 'Exchange', icon: Repeat, path: '/exchange' },
  ];

  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname === '/events') return 'event';
    if (location.pathname === '/exchange') return 'exchange';
    if (location.pathname === '/orders') return 'order';
    return 'home';
  });

  const isCenterActive = activeTab === 'order';

  const btnBottom = isCenterActive
    ? NAV_H - OVERLAP + RAISE
    : NAV_H - OVERLAP;

  const btnScale = isCenterActive ? 1.05 : 1;

  const notchH = OVERLAP;
  const notchTop = isCenterActive ? -RAISE : 0;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-3 pb-2">
      <div className="pointer-events-auto relative">
        {/* Center Button */}
        <Link
          to="/orders"
          onClick={() => setActiveTab('order')}
          className="absolute left-1/2 z-20 flex items-center justify-center active:scale-95 transition-all duration-300 rounded-full"
          style={{
            width: BTN_S,
            height: BTN_S,
            bottom: btnBottom,
            transform: `translateX(-50%) scale(${btnScale})`,
            background: isCenterActive
              ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`
              : `linear-gradient(135deg, ${primaryColor}cc, ${primaryColor}99)`,
            boxShadow: isCenterActive
              ? `0 8px 28px ${primaryColor}66`
              : `0 4px 16px ${primaryColor}33`,
          }}
        >
          <ShoppingCart className="w-6 h-6 text-white" strokeWidth={2.5} />
        </Link>

        {/* Notch Dome */}
        <div
          className="absolute left-1/2 z-10 pointer-events-none transition-all duration-300 bg-white/90 dark:bg-zinc-900/90 border-l border-r border-t border-zinc-200 dark:border-zinc-700/50"
          style={{
            width: BTN_S + 12,
            height: notchH,
            top: notchTop,
            transform: 'translateX(-50%)',
            borderRadius: `${(BTN_S + 12) / 2}px ${(BTN_S + 12) / 2}px 0 0`,
          }}
        />

        {/* Main Navbar */}
        <nav
          className="relative rounded-[22px] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-700/50 shadow-[0_-4px_30px_rgba(0,0,0,0.08),0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden"
          style={{ height: NAV_H }}
        >
          <div className="flex items-center h-full">
            {navItems.map((item) => {
              if (item.center) return <div key={item.id} className="flex-1" />;

              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setActiveTab(item.id)}
                  className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-300 active:scale-90"
                  style={{
                    transform: isActive
                      ? 'translateY(-2px) scale(1.02)'
                      : 'translateY(0) scale(1)',
                  }}
                >
                  <div className="relative">
                    <Icon
                      className="w-[22px] h-[22px] transition-all duration-300"
                      style={{ color: isActive ? primaryColor : '#9ca3af' }}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    {isActive && (
                      <div
                        className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full transition-all duration-300"
                        style={{ backgroundColor: primaryColor }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[10px] font-semibold transition-all duration-300"
                    style={{ color: isActive ? primaryColor : '#9ca3af' }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default MobileBottomNav;
