import React, { useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/Header';
import HeaderSpacer from '@/components/HeaderSpacer';
import HeroBanner from '@/components/HeroBanner';
import GameCard from '@/components/GameCard';
import FeaturedGameCard from '@/components/FeaturedGameCard';
import Footer from '@/components/Footer';
import { useSite } from '@/contexts/SiteContext';
import { useFavicon } from '@/hooks/useFavicon';
import {
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const Index: React.FC = () => {
  const { settings, games, isLoading } = useSite();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const isKesor = settings.siteName?.toLowerCase().includes('kesor');
  const primaryColor = settings.primaryColor || (isKesor ? '#D4A84B' : '#E53E3E');

  const featuredRef = useRef<HTMLDivElement>(null);

  const scrollFeatured = (dir: 'left' | 'right') => {
    if (!featuredRef.current) return;
    const scrollAmount = featuredRef.current.clientWidth * 0.8;
    featuredRef.current.scrollBy({
      left: dir === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  useFavicon(settings.siteIcon);

  const featuredGames = useMemo(() => {
    let result = games.filter(game => game.tags?.includes('featured'));
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(game =>
        (game.name || '').toLowerCase().includes(query)
      );
    }
    return result;
  }, [games, searchQuery]);

  const filteredGames = useMemo(() => {
    let result = games;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(game =>
        (game.name || '').toLowerCase().includes(query)
      );
    }
    return result;
  }, [games, searchQuery]);

  return (
    <>
      <Helmet>
        <title>{settings.browserTitle || `${settings.siteName} - Game Topup Cambodia`}</title>
        <meta name="description" content="Top up your favorite games instantly. Mobile Legends, Free Fire, PUBG, and more. Fast, secure, and affordable." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-transparent text-foreground relative">
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

        <HeroBanner
          bannerImage={settings.bannerImage}
          bannerImages={settings.bannerImages}
          bannerHeight={settings.bannerHeight}
        />

        <section className="w-[90%] mx-auto py-8 sm:py-12 flex-1">
          {/* Featured Games Section */}
          {!isLoading && featuredGames.length > 0 && (
            <div className="mb-10">
              {/* Section header with scroll buttons */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" style={{ color: primaryColor }} />
                  {settings.featuredGamesTitle || 'Featured Games'}
                </h3>
                <div className="hidden sm:flex items-center gap-1.5">
                  <button
                    onClick={() => scrollFeatured('left')}
                    className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="w-4 h-4 text-zinc-500" />
                  </button>
                  <button
                    onClick={() => scrollFeatured('right')}
                    className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    aria-label="Next"
                  >
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
              </div>

              {/* Desktop grid (4 cols) */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {featuredGames.map((game, index) => (
                  <FeaturedGameCard
                    key={`featured-${game.id}`}
                    game={game}
                    index={index}
                  />
                ))}
              </div>

              {/* Tablet grid (2 cols) */}
              <div className="hidden sm:grid md:hidden grid-cols-2 gap-4">
                {featuredGames.map((game, index) => (
                  <FeaturedGameCard
                    key={`featured-${game.id}`}
                    game={game}
                    index={index}
                  />
                ))}
              </div>

              {/* Mobile horizontal carousel */}
              <div className="sm:hidden relative">
                <div
                  ref={featuredRef}
                  className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-2 px-2 [&::-webkit-scrollbar]:hidden"
                >
                  {featuredGames.map((game, index) => (
                    <div key={`featured-mob-${game.id}`} className="snap-start shrink-0 w-[85vw] max-w-sm">
                      <FeaturedGameCard game={game} index={index} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-6 text-center">
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
              ជ្រើសរើសទំនិញ
            </h2>
            <div 
              className="w-16 h-1 rounded-full mx-auto"
              style={{ backgroundColor: primaryColor }}
            />
          </div>

          {/* All Games */}
          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse border border-zinc-100 dark:border-zinc-900" />
              ))}
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-16 sm:py-24">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mb-4">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold mb-2 text-zinc-950 dark:text-zinc-50">រកមិនឃើញហ្គេមទេ</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">
                {searchQuery
                  ? `មិនមានលទ្ធផលស្វែងរកសម្រាប់ "${searchQuery}" ឡើយ។`
                  : 'មិនមានហ្គេមឡើយនៅឡើយទេ។'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
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
