import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSite } from '@/contexts/SiteContext';
import { Home, PartyPopper, Gamepad2, Receipt, ShoppingCart } from 'lucide-react';

const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { settings } = useSite();
  const primaryColor = settings.primaryColor || '#D4A84B';
  const [centerUp, setCenterUp] = useState(false);

  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Event', icon: PartyPopper, path: '/events' },
    { label: 'Top Up', icon: ShoppingCart, path: '/', center: true },
    { label: 'Game', icon: Gamepad2, path: '/' },
    { label: 'Order', icon: Receipt, path: '/orders' },
  ];

  const handleCenterClick = () => {
    setCenterUp(true);
    setTimeout(() => setCenterUp(false), 600);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-3">
      <div className="pointer-events-auto relative">
        {/* Center Button */}
        <Link
          to="/"
          onClick={handleCenterClick}
          className="absolute left-1/2 -translate-x-1/2 z-10 w-[58px] h-[58px] rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all duration-300"
          style={{
            bottom: centerUp ? 'calc(100% + 4px)' : 'calc(100% - 40px)',
            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
            boxShadow: `0 6px 24px ${primaryColor}55`,
          }}
        >
          <ShoppingCart className="w-[26px] h-[26px] text-white" strokeWidth={2.5} />
        </Link>

        {/* Nav */}
        <nav
          className="relative rounded-t-[24px] rounded-b-[18px] bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xl shadow-[0_-4px_30px_rgba(0,0,0,0.08),0_4px_20px_rgba(0,0,0,0.04)]"
          style={{ height: '72px' }}
        >
          {/* Manually drawn borders (top has a notch gap at center) */}
          {/* Left top border */}
          <div className="absolute top-0 left-0 right-[calc(50%+29px)] h-px bg-zinc-200 dark:bg-zinc-700/50 pointer-events-none" />
          {/* Right top border */}
          <div className="absolute top-0 left-[calc(50%+29px)] right-0 h-px bg-zinc-200 dark:bg-zinc-700/50 pointer-events-none" />
          {/* Left border */}
          <div className="absolute top-0 left-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700/50 rounded-bl-[18px] pointer-events-none" />
          {/* Right border */}
          <div className="absolute top-0 right-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700/50 rounded-br-[18px] pointer-events-none" />
          {/* Bottom border */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-zinc-200 dark:bg-zinc-700/50 rounded-b-[18px] pointer-events-none" />

          {/* Notch dome – bridges the button into the nav */}
          <div
            className="absolute left-1/2 -translate-x-1/2 z-[1] w-[62px] h-[32px] pointer-events-none transition-all duration-300 bg-white/85 dark:bg-zinc-900/85 border-l border-r border-t border-zinc-200 dark:border-zinc-700/50 border-b-0"
            style={{
              top: centerUp ? '-22px' : '0px',
              borderRadius: '31px 31px 0 0',
            }}
          />

          <div className="flex items-center h-full">
            {navItems.map((item) => {
              if (item.center) {
                return <div key={item.label} className="flex-1" />;
              }

              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-200 active:scale-90"
                >
                  <div className="relative">
                    <Icon
                      className="w-[22px] h-[22px] transition-colors duration-200"
                      style={{ color: isActive ? primaryColor : '#9ca3af' }}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    {isActive && (
                      <div
                        className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                        style={{ backgroundColor: primaryColor }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[10px] font-semibold transition-colors duration-200"
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
