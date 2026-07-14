import React from 'react';
import { useSite } from '@/contexts/SiteContext';
import { Zap, ShieldCheck, Sparkles } from 'lucide-react';
import { resolveIconUrl } from '@/lib/icon-url';

interface FooterProps {
  backgroundColor?: string;
  textColor?: string;
  copyrightText?: string;
  socialIcons?: { telegram?: string; tiktok?: string; facebook?: string };
  socialUrls?: { telegram?: string; tiktok?: string; facebook?: string };
  paymentIcons?: string[];
  paymentIconSize?: number;
}

const Footer: React.FC<FooterProps> = ({
  backgroundColor,
  textColor,
  copyrightText,
  socialIcons,
  socialUrls,
  paymentIcons,
  paymentIconSize = 32
}) => {
  const { settings, games } = useSite();
  const primaryColor = settings.primaryColor || (settings.siteName === 'KESOR TOPUP' ? '#D4A84B' : '#E53E3E');

  const valueProps = [
    {
      icon: Zap,
      title: '⚡ 30s Auto Delivery',
      desc: 'Diamonds delivered instantly to game account.',
    },
    {
      icon: ShieldCheck,
      title: '🛡️ Safe & Secure',
      desc: 'ABA Pay, KHQR & major Cambodia bank portals.',
    },
    {
      icon: Sparkles,
      title: '💎 Official Channels',
      desc: '100% legal game recharges & verified codes.',
    },
  ];

  const isKesor = settings.siteName === 'KESOR TOPUP';
  const bg = isKesor ? '#ffffff' : (backgroundColor || undefined);
  const textCol = isKesor ? '#18181b' : (textColor || undefined);

  return (
    <footer className="mt-auto border-t border-zinc-200/40 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md text-zinc-600 dark:text-zinc-400">
      {/* Main Footer Content */}
      <div 
        className="py-12 sm:py-16"
        style={{ 
          backgroundColor: settings.bgType === 'color' ? bg : 'transparent',
          color: textCol
        }}
      >
        <div className="container mx-auto px-4 sm:px-6">
          {/* Value Propositions Grid with beautiful card-based glassmorphism */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {valueProps.map((prop, idx) => {
              const Icon = prop.icon;
              return (
                <div 
                  key={idx}
                  className="rounded-2xl p-5 border border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-900/40 shadow-sm flex items-start gap-4 transition-all duration-300 hover:border-zinc-300/80 dark:hover:border-zinc-700/80 hover:shadow-md group"
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-zinc-50 dark:bg-zinc-900 group-hover:scale-105 transition-transform duration-300"
                    style={{ border: `1px solid ${primaryColor}15` }}
                  >
                    <Icon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" style={{ color: primaryColor }} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{prop.title}</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{prop.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="col-span-2 md:col-span-1 space-y-4">
              <div className="flex items-center gap-2">
                {(settings.footerLogoUrl || settings.logoUrl) && (
                  <img 
                    src={resolveIconUrl(settings.footerLogoUrl || settings.logoUrl)} 
                    alt="Logo" 
                    style={{ height: `${settings.footerLogoSize || 32}px` }}
                    className="w-auto object-contain" 
                  />
                )}
                <h3 className="font-display font-black text-lg tracking-tight text-zinc-900 dark:text-white uppercase">
                  {settings.siteName}
                </h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Fast, secure, and premium game top-up in Cambodia. 100% legal recharges.
              </p>
            </div>

            {/* Products Section */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Popular Games
              </h4>
              <ul className="space-y-2">
                {games.slice(0, 5).map(game => (
                  <li key={game.id}>
                    <span className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer uppercase font-medium">
                      {game.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Section */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Company
              </h4>
              <ul className="space-y-2">
                <li>
                  <span className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer uppercase font-medium">
                    About Us
                  </span>
                </li>
                <li>
                  <span className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer uppercase font-medium">
                    Terms & Privacy
                  </span>
                </li>
              </ul>
            </div>

            {/* Follow Us Section */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Connect With Us
              </h4>
              <div className="flex gap-3">
                {socialIcons?.telegram && (
                  <a 
                    href={socialUrls?.telegram || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm"
                  >
                    <img src={socialIcons.telegram} alt="Telegram" className="w-5 h-5 object-cover" />
                  </a>
                )}
                {socialIcons?.tiktok && (
                  <a 
                    href={socialUrls?.tiktok || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm"
                  >
                    <img src={socialIcons.tiktok} alt="TikTok" className="w-5 h-5 object-cover" />
                  </a>
                )}
                {socialIcons?.facebook && (
                  <a 
                    href={socialUrls?.facebook || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm"
                  >
                    <img src={socialIcons.facebook} alt="Facebook" className="w-5 h-5 object-cover" />
                  </a>
                )}
                {!socialIcons?.telegram && !socialIcons?.tiktok && !socialIcons?.facebook && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">No social profiles configured</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="py-6 border-t border-zinc-200/30 dark:border-zinc-800/30 bg-zinc-50/50 dark:bg-zinc-950/80 text-zinc-400 dark:text-zinc-500">
        <div className="container mx-auto px-4 sm:px-6 text-center space-y-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {copyrightText || `© 2026 Ahnajak Topup. All rights reserved.`} | <a href="https://t.me/lengsonmeng" target="_blank" rel="noopener noreferrer" className="hover:underline text-red-600 dark:text-red-400 transition-colors font-semibold">Developer</a>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">
              We Accept Secure Payments via
            </span>
            <div className="flex gap-2 items-center flex-wrap justify-center font-bold">
              {paymentIcons && paymentIcons.length > 0 ? (
                paymentIcons.map((icon, index) => (
                  <img 
                    key={index} 
                    src={resolveIconUrl(icon)} 
                    alt={`Payment gateway ${index + 1}`} 
                    style={{ height: `${paymentIconSize || 24}px` }}
                    className="w-auto object-contain brightness-95 opacity-80 hover:opacity-100 transition-opacity"
                  />
                ))
              ) : (
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">ABA Pay • KHQR</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
