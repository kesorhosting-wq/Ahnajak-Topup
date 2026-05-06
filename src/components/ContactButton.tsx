import React from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useSite } from '@/contexts/SiteContext';
import { cn } from '@/lib/utils';

const ContactButton: React.FC = () => {
  const { pathname } = useLocation();
  const { settings } = useSite();

  if (pathname.startsWith('/admin')) return null;

  const url = settings.footerTelegramUrl;
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact us on Telegram"
      className={cn(
        'fixed bottom-4 left-4 z-[60] flex items-center gap-2 rounded-full px-4 py-3',
        'bg-[#229ED9] text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95',
        'transition-all duration-200'
      )}
    >
      <MessageCircle className="w-5 h-5" />
      <span className="text-sm font-semibold hidden sm:inline">Contact us</span>
    </a>
  );
};

export default ContactButton;
