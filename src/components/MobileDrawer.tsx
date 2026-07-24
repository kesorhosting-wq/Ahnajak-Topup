import React, { useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Package, PartyPopper, User, Repeat, LogOut, LogIn, X } from 'lucide-react';
import { useSite } from '@/contexts/SiteContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

const MobileDrawer: React.FC<MobileDrawerProps> = ({ open, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSite();
  const { user, isAdmin, signOut } = useAuth();
  const primaryColor = settings.primaryColor || '#D4A84B';

  const menuItems = [
    { id: '/', label: 'Home', icon: Home },
    { id: '/orders', label: 'Orders', icon: Package },
    { id: '/events', label: 'Events', icon: PartyPopper },
    { id: '/profile', label: 'Profile', icon: User },
    { id: '/exchange', label: 'Exchange', icon: Repeat },
  ];

  const handleSignOut = useCallback(async () => {
    await signOut();
    toast({ title: 'Signed out successfully' });
    onClose();
  }, [signOut, onClose]);

  const confirmSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      handleSignOut();
    }
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleNavClick = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 left-0 z-[110] h-[100dvh] w-[280px] max-w-[85vw] bg-zinc-950/95 backdrop-blur-2xl border-r border-zinc-800/60 shadow-2xl flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Header: Profile Card + Close Button */}
            <div className="shrink-0 p-4 pb-2">
              <div
                className="relative rounded-2xl p-3.5 flex items-center justify-between"
                style={{
                  backgroundColor: `${primaryColor}0D`,
                  border: `1px solid ${primaryColor}20`,
                }}
              >
                {user ? (
                  <div className="flex items-center gap-3 min-w-0 pr-8">
                    <div className="relative shrink-0">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold shadow-md"
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
                          boxShadow: `0 0 0 2px ${primaryColor}30`,
                        }}
                      >
                        {(user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-zinc-100 truncate leading-tight">
                        {user.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5 leading-tight">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 pr-8">
                    <div className="w-12 h-12 rounded-full bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-100">Guest</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Welcome!</p>
                    </div>
                  </div>
                )}

                {/* Close Button (X) */}
                <button
                  onClick={onClose}
                  aria-label="Close menu"
                  className="absolute top-3 right-3 p-1.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 active:scale-90 text-zinc-400 hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Nav Menu Items (Scrollable Middle Area) */}
            <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className="w-full flex items-center gap-3.5 px-3.5 h-12 rounded-xl text-left transition-all duration-150 active:scale-[0.98] hover:bg-white/[0.05]"
                    style={{
                      backgroundColor: isActive ? `${primaryColor}1A` : 'transparent',
                    }}
                  >
                    <Icon
                      className="w-5 h-5 shrink-0 transition-colors"
                      style={{
                        color: isActive ? primaryColor : '#a1a1aa',
                        strokeWidth: isActive ? 2.5 : 2,
                      }}
                    />
                    <span
                      className="text-sm flex-1"
                      style={{
                        color: isActive ? primaryColor : '#e4e4e7',
                        fontWeight: isActive ? 700 : 500,
                      }}
                    >
                      {item.label}
                    </span>

                    {isActive && (
                      <div
                        className="w-1.5 h-5 rounded-full"
                        style={{
                          backgroundColor: primaryColor,
                          boxShadow: `0 0 10px ${primaryColor}88`,
                        }}
                      />
                    )}
                  </button>
                );
              })}

              {/* Admin Link */}
              {user && isAdmin && (
                <button
                  onClick={() => handleNavClick('/admin')}
                  className="w-full flex items-center gap-3.5 px-3.5 h-12 rounded-xl text-left transition-all duration-150 active:scale-[0.98] hover:bg-white/[0.05]"
                  style={{
                    backgroundColor: location.pathname === '/admin' ? `${primaryColor}1A` : 'transparent',
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
                  >
                    A
                  </div>
                  <span
                    className="text-sm flex-1"
                    style={{
                      color: location.pathname === '/admin' ? primaryColor : '#e4e4e7',
                      fontWeight: location.pathname === '/admin' ? 700 : 500,
                    }}
                  >
                    Admin
                  </span>
                </button>
              )}
            </nav>

            {/* Footer Section */}
            <div className="shrink-0 p-3.5 border-t border-zinc-800/50 bg-zinc-950/50">
              {user ? (
                <button
                  onClick={confirmSignOut}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl text-white font-semibold text-sm transition-all active:scale-[0.97] bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/25"
                >
                  <LogOut className="w-4 h-4" strokeWidth={2.5} />
                  Sign Out
                </button>
              ) : (
                <Link
                  to="/auth"
                  onClick={onClose}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl text-white font-semibold text-sm transition-all active:scale-[0.97] hover:opacity-95"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                    boxShadow: `0 4px 16px ${primaryColor}40`,
                  }}
                >
                  <LogIn className="w-4 h-4" strokeWidth={2.5} />
                  Sign In
                </Link>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileDrawer;