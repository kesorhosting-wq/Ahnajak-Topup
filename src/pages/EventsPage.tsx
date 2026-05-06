import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import HeaderSpacer from '@/components/HeaderSpacer';
import Footer from '@/components/Footer';
import { useSite } from '@/contexts/SiteContext';
import { useFavicon } from '@/hooks/useFavicon';
import { Calendar, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Event {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  content: string | null;
  is_active: boolean;
  created_at: string;
}

const EventsPage: React.FC = () => {
  const { settings } = useSite();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useFavicon(settings.siteIcon);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    
    setEvents((data as Event[]) || []);
    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>ព្រឹត្តិការណ៍ - {settings.siteName}</title>
        <meta name="description" content="Latest events and promotions" />
      </Helmet>

      <div
        className="min-h-screen flex flex-col"
        style={{
          backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        {settings.backgroundImage && (
          <div className="fixed inset-0 bg-background/80 -z-10" />
        )}
        <Header />
        <HeaderSpacer />

        <section className="container mx-auto px-3 sm:px-4 py-6 sm:py-12 flex-1">
          <div className="text-center mb-8">
            <h1 className="font-khmer text-2xl sm:text-3xl font-bold text-foreground flex items-center justify-center gap-2">
              <Calendar className="w-7 h-7 text-gold" />
              ព្រឹត្តិការណ៍
            </h1>
            <div className="w-24 h-1 mx-auto bg-gradient-to-r from-transparent via-gold to-transparent rounded-full mt-4" />
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-gold" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">មិនមានព្រឹត្តិការណ៍នៅពេលនេះ</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {events.map((event) => (
                <Card key={event.id} className="overflow-hidden border-gold/20">
                  {event.image && (
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-auto object-contain"
                    />
                  )}
                  <CardContent className="p-4 sm:p-6">
                    <h2 className="font-khmer text-lg sm:text-xl font-bold mb-2">{event.title}</h2>
                    {event.description && (
                      <p className="text-muted-foreground text-sm mb-3">{event.description}</p>
                    )}
                    {event.content && (
                      <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                        {event.content}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-4">
                      {new Date(event.created_at).toLocaleDateString('km-KH')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <Footer
          backgroundColor={settings.footerBgColor}
          textColor={settings.footerTextColor}
          copyrightText={settings.footerText}
          socialIcons={{
            telegram: settings.footerTelegramIcon,
            tiktok: settings.footerTiktokIcon,
            facebook: settings.footerFacebookIcon,
          }}
          socialUrls={{
            telegram: settings.footerTelegramUrl,
            tiktok: settings.footerTiktokUrl,
            facebook: settings.footerFacebookUrl,
          }}
          paymentIcons={settings.footerPaymentIcons}
          paymentIconSize={settings.footerPaymentIconSize}
        />
      </div>
    </>
  );
};

export default EventsPage;
