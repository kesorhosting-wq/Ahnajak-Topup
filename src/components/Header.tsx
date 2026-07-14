import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, Receipt, User, Menu, LogOut, Home, CalendarDays, ShoppingBag, Coins } from 'lucide-react';
import { useSite } from '@/contexts/SiteContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { resolveIconUrl } from '@/lib/icon-url';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header: React.FC = () => {
  const isMobile = useIsMobile();
  const { settings } = useSite();
  const { user, isAdmin, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out successfully' });
  };

  const headerHeight = isMobile 
    ? (settings.headerHeightMobile || 56) 
    : (settings.headerHeightDesktop || 80);

  const primaryColor = settings.primaryColor || (settings.siteName === 'KESOR TOPUP' ? '#D4A84B' : '#E53E3E');

  // Navigation items structure
  const navItems = [
    { to: '/', title: 'ទំព័រដើម', icon: Home },
    { to: '/events', title: 'ព្រឹត្តិការណ៍', icon: CalendarDays },
    { to: '/preorder', title: 'បញ្ជាទិញមុន', icon: ShoppingBag },
    { to: '/exchange', title: 'Point Exchange', icon: Coins },
  ];

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 flex items-center bg-zinc-950/20 backdrop-blur-md border-b border-zinc-800/30 transition-all duration-300"
      style={{
        height: `${headerHeight}px`,
        backgroundImage: settings.headerImage ? `url(${settings.headerImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Background overlay for readability when image is present */}
      {settings.headerImage && (
        <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-md" />
      )}
      
      {/* Dynamic top accent line */}
      <div 
        className="absolute top-0 left-0 right-0 h-[3px] opacity-90 transition-all duration-300" 
        style={{
          background: `linear-gradient(90deg, transparent 15%, ${primaryColor} 50%, transparent 85%)`
        }}
      />
      
      <div className="container mx-auto flex items-center justify-between relative z-10 w-full">
        {/* Brand/Logo - Left-aligned for a modern, standard structure */}
        <Link 
          to="/" 
          className="flex items-center gap-3 group transition-transform duration-200 active:scale-[0.98]"
        >
          {settings.logoUrl ? (
            <img 
              src={resolveIconUrl(settings.logoUrl)} 
              alt={settings.siteName}
              style={{ height: `${isMobile ? 80 : 110}px` }}
              className="object-contain transition-transform duration-300 group-hover:rotate-3"
            />
          ) : (
            <span 
              className="font-display text-xl sm:text-2xl font-black tracking-tight transition-colors duration-300"
              style={{ color: primaryColor }}
            >
              {settings.siteName}
            </span>
          )}
        </Link>

        {/* Desktop & Tablet Navigation */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="px-4 py-2 text-sm font-semibold rounded-full text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all duration-200 flex items-center gap-2"
              >
                <Icon className="w-4 h-4 opacity-70" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section - User Options */}
        <div className="flex items-center gap-2">
          {/* Desktop User Panel */}
          <div className="hidden sm:flex items-center gap-2">
            {user && (
              <Link 
                to="/orders" 
                className="p-2.5 rounded-full text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                title="ប្រវត្តិការបញ្ជាទិញ"
              >
                <Receipt className="w-5 h-5" />
              </Link>
            )}

            {user && isAdmin && (
              <Link 
                to="/admin" 
                className="p-2.5 rounded-full text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                title="Admin Panel"
              >
                <Settings className="w-5 h-5" />
              </Link>
            )}

            {user ? (
              <>
                <Link 
                  to="/profile" 
                  className="p-2.5 rounded-full text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                  title="គណនីរបស់ខ្ញុំ"
                >
                  <User className="w-5 h-5" />
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="p-2.5 rounded-full text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  title="ចាកចេញ"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <Link 
                to="/auth" 
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-white font-bold transition-all duration-300 hover:shadow-lg active:scale-95"
                style={{ backgroundColor: primaryColor }}
                title="ចូលគណនី"
              >
                <User className="w-4 h-4" />
                <span className="text-sm">ចូលគណនី</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Dropdown */}
          <div className="flex sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="p-2 rounded-full text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all active:scale-95 border border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50"
                  title="មឺនុយ"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-white/95 dark:bg-zinc-950/95 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xl backdrop-blur-md">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.to} asChild>
                      <Link to={item.to} className="flex items-center gap-2.5 cursor-pointer py-2.5 px-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
                        <Icon className="w-4.5 h-4.5 opacity-70" />
                        <span>{item.title}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                
                {user && (
                  <>
                    <DropdownMenuSeparator className="bg-zinc-200/60 dark:bg-zinc-800/60" />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2.5 cursor-pointer py-2.5 px-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
                        <User className="w-4.5 h-4.5 opacity-70" />
                        <span>គណនីរបស់ខ្ញុំ</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/orders" className="flex items-center gap-2.5 cursor-pointer py-2.5 px-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
                        <Receipt className="w-4.5 h-4.5 opacity-70" />
                        <span>ប្រវត្តិការបញ្ជាទិញ</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                
                {user && isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2.5 cursor-pointer py-2.5 px-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
                      <Settings className="w-4.5 h-4.5 opacity-70" />
                      <span>Admin Panel</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator className="bg-zinc-200/60 dark:bg-zinc-800/60" />
                
                {!user ? (
                  <DropdownMenuItem asChild>
                    <Link to="/auth" className="flex items-center gap-2.5 cursor-pointer py-2.5 px-3 rounded-xl text-white font-bold" style={{ backgroundColor: primaryColor }}>
                      <User className="w-4.5 h-4.5" />
                      <span>ចូលគណនី</span>
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="flex items-center gap-2.5 cursor-pointer py-2.5 px-3 rounded-xl text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-950/20"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                    <span>ចាកចេញពីគណនី</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;