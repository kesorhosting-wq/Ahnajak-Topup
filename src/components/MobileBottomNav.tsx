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
        className="md:hidden fixed z-[60 bottom-[76px] left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform duration-200"
        style={{
          background: `linear-gradient(135deg, #ff6b9d, #ff3e6c)`,
          boxShadow: `0 6px 24px rgba(255, 62, 108, 0.45)`,
        }}
      >
        <ShoppingCart className="w-6 h-6 text-white" strokeWidth={2.5} />
      </Link>

      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-200/50 dark:border-zinc-800/50 shadow-[0_-4px_30px_rgba(0,0,0,0.08)]"
        style={{ height: '72px' }}
      >
        <div className="flex items-center justify-around h-full px-2">
          {navItems.map((item) => {
            if (item.center) return <div key={item.label} className="w-14" />;

            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                to={item.path}
                className="flex flex-col items-center justify-center gap-0.5 w-14 transition-all duration-200 active:scale-90"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200"
                  style={{
                    backgroundColor: isActive ? `${primaryColor}15` : 'transparent',
                  }}
                >
                  <Icon
                    className="w-5 h-5 transition-colors duration-200"
                    style={{ color: isActive ? primaryColor : '#9ca3af' }}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
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
    </>
  );
};

export default MobileBottomNav;
