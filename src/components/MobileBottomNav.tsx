import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSite } from '@/contexts/SiteContext';
import { Home, PartyPopper, Gamepad2, Repeat, ShoppingCart } from 'lucide-react';

const NAV_H = 72;
const BTN_S = 52;
const RAISE = 18;

const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { settings } = useSite();
  const primaryColor = settings.primaryColor || '#D4A84B';

  if (location.pathname.startsWith('/topup/') || location.pathname === '/checkout') return null;

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'event', label: 'Event', icon: PartyPopper, path: '/events' },
    { id: 'topup', label: 'Top Up', icon: ShoppingCart, path: '/orders', center: true },
    { id: 'game', label: 'Game', icon: Gamepad2, path: '/games' },
    { id: 'exchange', label: 'Exchange', icon: Repeat, path: '/exchange' },
  ];

  // Helper function to safely derive tab state from current path
  const getActiveTabFromPath = (path: string): string => {
    if (path === '/events') return 'event';
    if (path === '/orders') return 'topup';
    if (path === '/games') return 'game';
    if (path === '/exchange') return 'exchange';
    if (path === '/') return 'home';
    return 'home';
  };

  const [activeTab, setActiveTab] = useState(() => getActiveTabFromPath(location.pathname));

  // Sync tab state dynamically when user navigates
  useEffect(() => {
    setActiveTab(getActiveTabFromPath(location.pathname));
  }, [location.pathname]);

  const isTopUpActive = activeTab === 'topup';

  const baseBottom = (NAV_H - BTN_S) / 2;
  const btnBottom = isTopUpActive ? baseBottom + RAISE : baseBottom;
  const btnScale = isTopUpActive ? 1.08 : 1;

  const notchH = isTopUpActive ? 36 : 0;
  const notchTop = isTopUpActive ? -RAISE + 4 : (NAV_H - BTN_S) / 2;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-3 pb-2">
      <div className="pointer-events-auto relative">
        {/* Notch Background for Active Pop Up */}
        <div
          className="absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none transition-all duration-300 ease-out bg-white/90 dark:bg-zinc-900/90 border-l border-r border-t border-zinc-200 dark:border-zinc-700/50"
          style={{
            width: BTN_S + 14,
            height: `${notchH}px`,
            top: `${notchTop}px`,
            borderRadius: `${(BTN_S + 14) / 2}px ${(BTN_S + 14) / 2}px 0 0`,
            opacity: isTopUpActive ? 1 : 0,
          }}
        />

        {/* Center Floating Button (Navigates to /orders) */}
        <Link
          to="/orders"
          onClick={() => setActiveTab('topup')}
          className="absolute left-1/2 z-20 flex items-center justify-center transition-all duration-300 ease-out rounded-full active:scale-90"
          style={{
            width: BTN_S,
            height: BTN_S,
            bottom: `${btnBottom}px`,
            transform: `translateX(-50%) scale(${btnScale})`,
            background: isTopUpActive
              ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`
              : `linear-gradient(135deg, ${primaryColor}40, ${primaryColor}20)`,
            boxShadow: isTopUpActive
              ? `0 8px 24px ${primaryColor}66`
              : `0 2px 8px rgba(0,0,0,0.1)`,
            border: isTopUpActive ? 'none' : `1px solid ${primaryColor}30`,
          }}
        >
          <ShoppingCart
            className="w-5 h-5 transition-colors duration-300"
            style={{ color: isTopUpActive ? '#ffffff' : primaryColor }}
            strokeWidth={isTopUpActive ? 2.5 : 2}
          />
        </Link>

        {/* Main Bar Navigation */}
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
                    transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
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
                        style={{
                          backgroundColor: primaryColor,
                          boxShadow: `0 0 6px ${primaryColor}`,
                        }}
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