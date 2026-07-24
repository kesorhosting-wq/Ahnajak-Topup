import React, { useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Package, PartyPopper, User, Repeat, LogOut, LogIn } from 'lucide-react';
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
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed top-0 left-0 z-[110] h-full w-[280px] max-w-[85vw] bg-zinc-950 backdrop-blur-xl border-r border-zinc-800/40 shadow-2xl flex flex-col"
            style={{ maxHeight: '100dvh' }}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Profile Section */}
            <div className="shrink-0 px-4 pt-5 pb-3">
              <div
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: `${primaryColor}08`,
                  border: `1px solid ${primaryColor}12`,
                }}
              >
                {user ? (
                  <div className="flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
                          boxShadow: `0 0 0 3px ${primaryColor}25, 0 4px 16px ${primaryColor}40`,
                        }}
                      >
                        {(user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-zinc-100 truncate leading-tight">
                        {user.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5 leading-tight">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-full bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-100">Guest</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-tight">
                        Sign in to access your account.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-hidden px-3 py-2 space-y-0.5">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className="w-full flex items-center gap-3 pl-4 pr-3 h-[52px] rounded-xl text-left transition-all duration-200 active:scale-[0.98] hover:bg-white/[0.04]"
                    style={{
                      backgroundColor: isActive ? `${primaryColor}15` : 'transparent',
                    }}
                  >
                    <Icon
                      className="w-5 h-5 shrink-0 transition-all duration-200"
                      style={{
                        color: isActive ? primaryColor : '#a1a1aa',
                        strokeWidth: isActive ? 2.5 : 2,
                      }}
                    />
                    <span
                      className="text-sm transition-all duration-200 flex-1"
                      style={{
                        color: isActive ? primaryColor : '#e4e4e7',
                        fontWeight: isActive ? 700 : 500,
                      }}
                    >
                      {item.label}
                    </span>

                    {isActive && (
                      <div
                        className="w-1 h-6 rounded-full"
                        style={{ backgroundColor: primaryColor, boxShadow: `0 0 8px ${primaryColor}66` }}
                      />
                    )}
                  </button>
                );
              })}

              {user && isAdmin && (
                <button
                  onClick={() => handleNavClick('/admin')}
                  className="w-full flex items-center gap-3 pl-4 pr-3 h-[52px] rounded-xl text-left transition-all duration-200 active:scale-[0.98] hover:bg-white/[0.04]"
                  style={{
                    backgroundColor: location.pathname === '/admin' ? `${primaryColor}15` : 'transparent',
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
                  >
                    A
                  </div>
                  <span
                    className="text-sm flex-1 transition-all duration-200"
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

            {/* Bottom Footer */}
            <div className="shrink-0 px-3 pb-4 pt-3 border-t border-zinc-800/30">
              {user ? (
                <button
                  onClick={confirmSignOut}
                  className="w-full h-11 flex items-center justify-center gap-2.5 rounded-xl text-white font-semibold text-sm transition-all duration-200 active:scale-[0.97] hover:brightness-110"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    boxShadow: '0 4px 20px rgba(239, 68, 68, 0.35)',
                  }}
                >
                  <LogOut className="w-[18px] h-[18px]" strokeWidth={2.5} />
                  Sign Out
                </button>
              ) : (
                <Link
                  to="/auth"
                  onClick={onClose}
                  className="w-full h-11 flex items-center justify-center gap-2.5 rounded-xl text-white font-semibold text-sm transition-all duration-200 active:scale-[0.97] hover:brightness-110"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
                    boxShadow: `0 4px 20px ${primaryColor}55`,
                  }}
                >
                  <LogIn className="w-[18px] h-[18px]" strokeWidth={2.5} />
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
