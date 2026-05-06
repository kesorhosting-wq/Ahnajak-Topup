import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSite } from '@/contexts/SiteContext';
import { resolveIconUrl } from '@/lib/icon-url';
import { cn } from '@/lib/utils';

const TelegramGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.24 3.64 11.95c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.14-3.05-1.99 1.93c-.23.23-.42.42-.83.42z" />
  </svg>
);

const ContactButton: React.FC = () => {
  const { pathname } = useLocation();
  const { settings } = useSite();

  if (pathname.startsWith('/admin')) return null;

  const url = settings.footerTelegramUrl;
  if (!url) return null;

  const customIcon = resolveIconUrl(settings.contactButtonIcon, settings.iconCdnBaseUrl);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact us"
      className={cn(
        'fixed bottom-4 right-4 z-[60] flex items-center justify-center',
        'animate-contact-jump',
        'hover:scale-110 active:scale-95 transition-transform duration-200',
        'w-14 h-14 rounded-full overflow-hidden shadow-lg hover:shadow-xl',
        !customIcon && 'bg-[#229ED9] text-white'
      )}
    >
      {customIcon ? (
        <img
          src={customIcon}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <TelegramGlyph className="w-7 h-7" />
      )}
    </a>
  );
};

export default ContactButton;
