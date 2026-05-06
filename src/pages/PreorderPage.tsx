import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import HeaderSpacer from '@/components/HeaderSpacer';
import Footer from '@/components/Footer';
import { useSite } from '@/contexts/SiteContext';
import { useFavicon } from '@/hooks/useFavicon';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, X, Clock, Gamepad2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PreorderGameWithInfo {
  id: string;
  game_id: string;
  game_name: string;
  game_image: string;
  game_slug: string;
  package_count: number;
  earliest_fulfill: string | null;
}

const PreorderGameCard: React.FC<{
  game: PreorderGameWithInfo;
  cardBgColor?: string;
  cardBorderColor?: string;
  index: number;
}> = ({ game, cardBgColor, cardBorderColor, index }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const frameColor = cardBorderColor || 'hsl(43 74% 49%)';
  const bgColor = cardBgColor || 'hsl(43 74% 70% / 0.15)';

  return (
    <div
      className="group block animate-fade-in"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
    >
      <div className="relative">
        <div
          className="relative rounded-2xl overflow-hidden backdrop-blur-sm transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-2xl"
          style={{
            background: `linear-gradient(145deg, ${bgColor}, hsl(var(--card) / 0.8))`,
            border: `1px solid ${frameColor}40`,
            boxShadow: `0 8px 32px hsl(43 74% 49% / 0.15), inset 0 1px 0 hsl(43 74% 80% / 0.1)`,
          }}
        >
          <div
            className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10"
            style={{ background: `linear-gradient(135deg, ${frameColor}40, transparent)` }}
          />

          {/* Pre-order badge */}
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-gold text-background text-[8px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              Pre-order
            </Badge>
          </div>

          <div className="relative aspect-square overflow-hidden">
            {!imageLoaded && <Skeleton className="absolute inset-0 w-full h-full" />}
            <img
              src={game.game_image}
              alt={game.game_name}
              loading={index < 4 ? 'eager' : 'lazy'}
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              className={cn(
                'w-full h-full object-cover transition-all duration-500 group-hover:scale-110',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-gold/0 via-gold/10 to-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </div>

          <div className="p-1.5 sm:p-4 space-y-1 sm:space-y-2">
            <h3 className="font-khmer text-[10px] sm:text-base font-bold text-foreground line-clamp-1 text-center">
              {game.game_name}
            </h3>
            <Link to={`/preorder/${game.game_slug}`} className="block">
              <Button
                className="w-full gap-1 sm:gap-2 bg-gradient-to-r from-gold to-gold-dark hover:from-gold-dark hover:to-gold text-background font-semibold transition-all duration-300 shadow-lg hover:shadow-gold/30 text-[9px] sm:text-sm h-7 sm:h-9"
                size="sm"
              >
                <Gamepad2 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="font-khmer">Pre-order</span>
              </Button>
            </Link>
          </div>
        </div>

        <div
          className="absolute -top-0.5 -left-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-tl-xl opacity-80 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110"
          style={{ background: `linear-gradient(135deg, ${frameColor}, transparent)` }}
        />
        <div
          className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-tr-xl opacity-80 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110"
          style={{ background: `linear-gradient(225deg, ${frameColor}, transparent)` }}
        />
      </div>
    </div>
  );
};

const PreorderPage: React.FC = () => {
  const { settings, games } = useSite();
  const [preorderGames, setPreorderGames] = useState<PreorderGameWithInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useFavicon(settings.siteIcon);

  useEffect(() => {
    loadPreorderGames();
  }, [games]);

  const loadPreorderGames = async () => {
    try {
      const { data: pgData, error: pgError } = await supabase
        .from('preorder_games')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (pgError) throw pgError;

      const { data: pkgData } = await supabase
        .from('preorder_packages')
        .select('game_id, scheduled_fulfill_at');

      const enriched: PreorderGameWithInfo[] = (pgData || []).map((pg: any) => {
        const game = games.find(g => g.id === pg.game_id);
        const gamePkgs = (pkgData || []).filter((p: any) => p.game_id === pg.game_id);
        const fulfillDates = gamePkgs
          .map((p: any) => p.scheduled_fulfill_at)
          .filter(Boolean)
          .sort();

        return {
          id: pg.id,
          game_id: pg.game_id,
          game_name: game?.name || 'Unknown',
          game_image: game?.image || '',
          game_slug: game?.slug || '',
          package_count: gamePkgs.length,
          earliest_fulfill: fulfillDates[0] || null,
        };
      });

      setPreorderGames(enriched);
    } catch (error) {
      console.error('Error loading preorder games:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGames = useMemo(() => {
    if (!searchQuery.trim()) return preorderGames;
    const q = searchQuery.toLowerCase();
    return preorderGames.filter(g => g.game_name.toLowerCase().includes(q));
  }, [preorderGames, searchQuery]);

  return (
    <>
      <Helmet>
        <title>Pre-order Games - {settings.browserTitle || settings.siteName}</title>
        <meta name="description" content="Pre-order your favorite game top-ups. Reserve now and get delivered on schedule." />
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
        {settings.backgroundImage && <div className="fixed inset-0 bg-background/80 -z-10" />}
        <Header />
        <HeaderSpacer />

        <section className="container mx-auto px-2 sm:px-4 py-4 sm:py-12 flex-1">
          <div className="text-center mb-6 sm:mb-10">
            <h1 className="font-khmer text-xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
              🎮 Pre-order Games
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              Reserve your top-up now, delivered on schedule
            </p>
            <div className="w-24 sm:w-32 h-1 mx-auto bg-gradient-to-r from-transparent via-gold to-transparent rounded-full mb-6" />

            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search pre-order games..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
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

          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6 max-w-6xl mx-auto">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-12 sm:py-16 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm sm:text-base">
                {searchQuery ? `No pre-order games found for "${searchQuery}"` : 'No pre-order games available yet.'}
              </p>
              {searchQuery && (
                <Button variant="outline" className="mt-4" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6 max-w-6xl mx-auto">
              {filteredGames.map((game, index) => (
                <PreorderGameCard
                  key={game.id}
                  game={game}
                  cardBgColor={settings.gameCardBgColor}
                  cardBorderColor={settings.gameCardBorderColor}
                  index={index}
                />
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

export default PreorderPage;
