import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import HeaderSpacer from '@/components/HeaderSpacer';
import HeroBanner from '@/components/HeroBanner';
import GameCard from '@/components/GameCard';
import Footer from '@/components/Footer';
import { useSite } from '@/contexts/SiteContext';
import { useFavicon } from '@/hooks/useFavicon';
import { Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const Index: React.FC = () => {
  const { settings, games, isLoading } = useSite();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Update favicon dynamically
  useFavicon(settings.siteIcon);

  // Filter games based on search query
  const filteredGames = useMemo(() => {
    if (!searchQuery.trim()) return games;
    const query = searchQuery.toLowerCase();
    return games.filter(game => 
      game.name.toLowerCase().includes(query)
    );
  }, [games, searchQuery]);

  return (
    <>
      <Helmet>
        <title>{settings.browserTitle || `${settings.siteName} - Game Topup Cambodia`}</title>
        <meta name="description" content="Top up your favorite games instantly. Mobile Legends, Free Fire, PUBG, and more. Fast, secure, and affordable." />
      </Helmet>
      
      <div 
        className="min-h-screen flex flex-col"
        style={{
          backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        {settings.backgroundImage && (
          <div className="fixed inset-0 bg-background/80 -z-10" />
        )}
        <Header />
        <HeaderSpacer />
        
        <HeroBanner 
          bannerImage={settings.bannerImage} 
          bannerImages={settings.bannerImages}
          bannerHeight={settings.bannerHeight} 
        />
        
        {/* Games Section */}
        <section className="container mx-auto px-2 sm:px-4 py-4 sm:py-12 flex-1">
          {/* Section Title */}
          <div className="text-center mb-6 sm:mb-10">
            <h2 className="font-khmer text-xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              {settings.heroText}
            </h2>
            <div className="w-24 sm:w-32 h-1 mx-auto bg-gradient-to-r from-transparent via-gold to-transparent rounded-full mb-6" />
            
            {/* Search Input */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 bg-card/50 border-gold/20 focus:border-gold/50 transition-colors"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Games Grid */}
          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6 max-w-6xl mx-auto">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-12 sm:py-16 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm sm:text-base">
                {searchQuery ? `No games found for "${searchQuery}"` : 'No games available yet. Add games from the admin panel.'}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6 max-w-6xl mx-auto">
              {filteredGames.map((game, index) => (
                <GameCard 
                  key={game.id} 
                  game={game}
                  cardBgColor={settings.gameCardBgColor}
                  cardBorderColor={settings.gameCardBorderColor}
                  cardFrameImage={settings.gameCardFrameImage}
                  cardBorderImage={settings.gameCardBorderImage}
                  priority={index < 4}
                  index={index}
                />
              ))}
            </div>
          )}
        </section>
        
        {/* Footer */}
        <Footer 
          backgroundColor={settings.footerBgColor}
          textColor={settings.footerTextColor}
          copyrightText={settings.footerText}
          socialIcons={{
            telegram: settings.footerTelegramIcon,
            tiktok: settings.footerTiktokIcon,
            facebook: settings.footerFacebookIcon
          }}
          socialUrls={{
            telegram: settings.footerTelegramUrl,
            tiktok: settings.footerTiktokUrl,
            facebook: settings.footerFacebookUrl
          }}
          paymentIcons={settings.footerPaymentIcons}
          paymentIconSize={settings.footerPaymentIconSize}
        />
      </div>
    </>
  );
};

export default Index;
