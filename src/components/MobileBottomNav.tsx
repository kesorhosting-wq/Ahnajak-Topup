import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSite } from '@/contexts/SiteContext';
import { Home, PartyPopper, Gamepad2, Receipt, ShoppingCart } from 'lucide-react';

const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { settings } = useSite();
  const primaryColor = settings.primaryColor || '#D4A84B';

  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Event', icon: PartyPopper, path: '/events' },
    { label: 'Top Up', icon: ShoppingCart, path: '/', center: true },
    { label: 'Game', icon: Gamepad2, path: '/' },
    { label: 'Order', icon: Receipt, path: '/orders' },
  ];

  return (
    <>
      {/* Floating Center Button */}
      <Link
        to="/"
        className="md:hidden fixed z-[60] left-1/2 -translate-x-1/2 w-[58px] h-[58px] rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform duration-200"
        style={{
          bottom: '48px',
          background: `linear-gradient(135deg, #ff6b9d, #ff3e6c)`,
          boxShadow: `0 6px 24px rgba(255, 62, 108, 0.45)`,
        }}
      >
        <ShoppingCart className="w-[26px] h-[26px] text-white" strokeWidth={2.5} />
      </Link>

      {/* Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-3">
        <div className="pointer-events-auto">
          <nav
            className="rounded-t-[24px] rounded-b-[18px] bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xl border border-zinc-200 dark:border-zinc-700/50 shadow-[0_-4px_30px_rgba(0,0,0,0.08),0_4px_20px_rgba(0,0,0,0.04)]"
            style={{ height: '72px' }}
          >
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
    </>
  );
};

export default MobileBottomNav;
