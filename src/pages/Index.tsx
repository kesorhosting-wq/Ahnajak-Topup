import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import HeaderSpacer from '@/components/HeaderSpacer';
import HeroBanner from '@/components/HeroBanner';
import GameCard from '@/components/GameCard';
import Footer from '@/components/Footer';
import { useSite } from '@/contexts/SiteContext';
import { useFavicon } from '@/hooks/useFavicon';
import {
  Search,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Index: React.FC = () => {
  const { settings, games, isLoading } = useSite();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllGames, setShowAllGames] = useState(false);

  const isKesor = settings.siteName?.toLowerCase().includes('kesor');
  const primaryColor = settings.primaryColor || (isKesor ? '#D4A84B' : '#E53E3E');

  // Update favicon dynamically
  useFavicon(settings.siteIcon);

  const INITIAL_DISPLAY_COUNT = 24;

  // Filter games based on search query
  const filteredGames = useMemo(() => {
    let result = games;

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(game =>
        (game.name || '').toLowerCase().includes(query)
      );
    }

    return result;
  }, [games, searchQuery]);

  const visibleGames = useMemo(() => {
    if (searchQuery.trim() || showAllGames) return filteredGames;
    return filteredGames.slice(0, INITIAL_DISPLAY_COUNT);
  }, [filteredGames, searchQuery, showAllGames]);

  return (
    <>
      <Helmet>
        <title>{settings.browserTitle || `${settings.siteName} - Game Topup Cambodia`}</title>
        <meta name="description" content="Top up your favorite games instantly. Mobile Legends, Free Fire, PUBG, and more. Fast, secure, and affordable." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-transparent text-foreground relative">
        {/* Ambient Glow Lights for Premium Dark Theme */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-30">
          <div className="absolute top-[5%] left-[5%] w-[45vw] h-[45vw] rounded-full bg-gold/10 blur-[130px]" />
          <div className="absolute top-[35%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-500/5 blur-[160px]" />
          <div className="absolute bottom-[5%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-gold/5 blur-[140px]" />
        </div>
        {settings.backgroundImage && (
          <>
            <div 
              className="fixed inset-0 -z-20 pointer-events-none"
              style={{
                backgroundImage: `url(${settings.backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="fixed inset-0 bg-background/80 -z-10 pointer-events-none" />
          </>
        )}
        <Header />
        <HeaderSpacer />

        {/* Carousel Banner */}
        <HeroBanner
          bannerImage={settings.bannerImage}
          bannerImages={settings.bannerImages}
          bannerHeight={settings.bannerHeight}
        />



        {/* Games Showcase Section */}
        <section className="w-[85%] sm:w-[80%] mx-auto py-8 sm:py-12 flex-1">
          <div>
            {/* Header Content — left aligned */}
            <div className="mb-8 sm:mb-12">
              <div 
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-3 animate-pulse"
                style={{ 
                  backgroundColor: `${primaryColor}10`,
                  color: primaryColor,
                  borderColor: `${primaryColor}25`
                }}
              >
                🔥 TOP RECHARGES IN CAMBODIA
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-black leading-tight text-zinc-900 dark:text-zinc-50 mb-3">
                {settings.heroText}
              </h2>
              <div 
                className="w-16 h-1 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
            </div>

            {/* Search Bar */}
            <div className="mb-8 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="ស្វែងរកហ្គេម... (Search games)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowAllGames(false);
                  }}
                  className="pl-11 pr-11 h-12 bg-white/80 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 focus:border-red-500 rounded-xl text-base shadow-sm focus:ring-1 focus:ring-red-500 transition-all"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Combined Games Grid */}
            {isLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse border border-zinc-100 dark:border-zinc-900" />
                ))}
              </div>
            ) : filteredGames.length === 0 ? (
              <div className="text-center py-16 sm:py-24 animate-fade-in bg-white/70 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-6 max-w-md mx-auto shadow-sm backdrop-blur-sm">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mb-4">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-bold mb-2 text-zinc-950 dark:text-zinc-50">រកមិនឃើញហ្គេមទេ</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  {searchQuery
                    ? `មិនមានលទ្ធផលស្វែងរកសម្រាប់ "${searchQuery}" ឡើយ。`
                    : 'មិនមានហ្គេមឡើយនៅឡើយទេ។'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                  {visibleGames.map((game, index) => (
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

                {!searchQuery.trim() && filteredGames.length > INITIAL_DISPLAY_COUNT && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => setShowAllGames(!showAllGames)}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gold/30 text-sm font-medium text-gold hover:bg-gold/10 transition-all"
                    >
                      {showAllGames ? (
                        <>Show Less <ChevronUp className="w-4 h-4" /></>
                      ) : (
                        <>Show All ({filteredGames.length} games) <ChevronDown className="w-4 h-4" /></>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <Footer
          backgroundColor={settings.footerBgColor || undefined}
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
        />
      </div>
    </>
  );
};

export default Index;
