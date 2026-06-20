import React, { useState, useMemo, useEffect } from 'react';
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
  Sparkles, 
  Clock, 
  TrendingUp, 
  Smartphone, 
  Laptop, 
  Gamepad2, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Mock live activities for Khmer gamers
const mockActivities = [
  { name: "Mobile Legends 86 Diamonds", time: "1m ago", player: "Player ***42", game: "MLBB" },
  { name: "Free Fire 100 Diamonds", time: "3m ago", player: "Player ***09", game: "Free Fire" },
  { name: "Honor of Kings 100 Tokens", time: "5m ago", player: "Player ***87", game: "HOK" },
  { name: "Valorant 1250 Points", time: "6m ago", player: "Player ***51", game: "Valorant" },
  { name: "PUBG Mobile 60 UC", time: "8m ago", player: "Player ***73", game: "PUBG" },
  { name: "Mobile Legends Weekly Pass", time: "10m ago", player: "Player ***18", game: "MLBB" }
];

const Index: React.FC = () => {
  const { settings, games, isLoading } = useSite();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'popular' | 'mobile' | 'pc'>('all');
  const [activityIndex, setActivityIndex] = useState(0);
  const [animateActivity, setAnimateActivity] = useState(true);

  // Update favicon dynamically
  useFavicon(settings.siteIcon);

  // Live topup feed rotation effect
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimateActivity(false);
      setTimeout(() => {
        setActivityIndex((prev) => (prev + 1) % mockActivities.length);
        setAnimateActivity(true);
      }, 300); // match fade-out duration
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Filter games based on category and search query
  const filteredGames = useMemo(() => {
    let result = games;
    
    // Apply category filter
    if (selectedCategory === 'popular') {
      const popularIdentifiers = ['mobile-legends', 'free-fire', 'pubg', 'valorant', 'honor-of-kings', 'mlbb', 'ff'];
      result = result.filter(game => 
        popularIdentifiers.some(ident => game.slug.toLowerCase().includes(ident) || game.name.toLowerCase().includes(ident))
      );
    } else if (selectedCategory === 'mobile') {
      const pcIdentifiers = ['valorant', 'steam', 'pc'];
      result = result.filter(game => 
        !pcIdentifiers.some(ident => game.slug.toLowerCase().includes(ident) || game.name.toLowerCase().includes(ident))
      );
    } else if (selectedCategory === 'pc') {
      const pcIdentifiers = ['valorant', 'steam', 'pc'];
      result = result.filter(game => 
        pcIdentifiers.some(ident => game.slug.toLowerCase().includes(ident) || game.name.toLowerCase().includes(ident))
      );
    }

    // Apply search query filter
    if (!searchQuery.trim()) return result;
    const query = searchQuery.toLowerCase();
    return result.filter(game => 
      game.name.toLowerCase().includes(query)
    );
  }, [games, selectedCategory, searchQuery]);

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
        
        {/* Carousel Banner */}
        <HeroBanner 
          bannerImage={settings.bannerImage} 
          bannerImages={settings.bannerImages}
          bannerHeight={settings.bannerHeight} 
        />

        {/* Live Activity Ticker Section (Signature Feature) */}
        <div className="container mx-auto px-3 sm:px-4 mb-6">
          <div className="max-w-4xl mx-auto rounded-full bg-white/60 dark:bg-black/30 border border-gold/25 backdrop-blur-xl shadow-md px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 overflow-hidden">
            <div className="flex items-center gap-2 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-gold animate-pulse" />
                Live Topups
              </span>
            </div>
            
            <div className="h-px w-6 bg-gold/30 shrink-0 hidden sm:block" />

            {/* Scrolling Feed */}
            <div className="flex-1 min-w-0 flex items-center justify-center sm:justify-start">
              <p className={cn(
                "text-xs sm:text-sm font-semibold truncate transition-all duration-300 flex items-center gap-2",
                animateActivity ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
              )}>
                <span className="text-gold">{mockActivities[activityIndex].player}</span>
                <span className="text-muted-foreground">successfully filled</span>
                <span className="text-foreground font-bold underline decoration-gold/40 decoration-2">{mockActivities[activityIndex].name}</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold flex items-center gap-0.5 border border-emerald-500/20">
                  <CheckCircle className="w-2.5 h-2.5" /> FULFILLED
                </span>
              </p>
            </div>

            <div className="shrink-0 text-[10px] sm:text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-gold" />
              {mockActivities[activityIndex].time}
            </div>
          </div>
        </div>



        {/* Games Showcase Section */}
        <section className="container mx-auto px-3 sm:px-4 py-6 sm:py-10 flex-1">
          <div className="max-w-6xl mx-auto">
            
            {/* Header Content */}
            <div className="flex flex-col items-center justify-center text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gold/10 text-gold border border-gold/20 mb-3 animate-bounce">
                🔥 TOP RECHARGES IN CAMBODIA
              </div>
              <h2 className="font-display font-khmer text-2xl sm:text-4xl font-extrabold leading-tight text-foreground mb-4">
                {settings.heroText}
              </h2>
              <div className="w-24 sm:w-32 h-1 bg-gradient-to-r from-transparent via-gold to-transparent rounded-full mb-6" />
              
              {/* Search Bar & Categories Container */}
              <div className="w-full max-w-xl space-y-4">
                
                {/* Custom Search Input */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/80" />
                  <Input
                    type="text"
                    placeholder="ស្វែងរកហ្គេម... (Search games)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 pr-11 h-12 bg-white/70 dark:bg-black/30 border-gold/20 focus:border-gold rounded-full text-base shadow-sm focus:ring-1 focus:ring-gold transition-all"
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

                {/* Styled Toggle Tabs (Categories) */}
                <div className="flex items-center justify-center flex-wrap gap-1.5 sm:gap-2 p-1 rounded-full bg-white/60 dark:bg-black/20 border border-white/60 backdrop-blur-md max-w-md mx-auto">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={cn(
                      "px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5",
                      selectedCategory === 'all' 
                        ? "bg-gradient-to-r from-gold to-gold-dark text-background shadow-md scale-[1.03]" 
                        : "text-muted-foreground hover:text-foreground hover:bg-white/40"
                    )}
                  >
                    <Gamepad2 className="w-3.5 h-3.5" />
                    ទាំងអស់
                  </button>
                  <button
                    onClick={() => setSelectedCategory('popular')}
                    className={cn(
                      "px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5",
                      selectedCategory === 'popular' 
                        ? "bg-gradient-to-r from-gold to-gold-dark text-background shadow-md scale-[1.03]" 
                        : "text-muted-foreground hover:text-foreground hover:bg-white/40"
                    )}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    ពេញនិយម
                  </button>
                  <button
                    onClick={() => setSelectedCategory('mobile')}
                    className={cn(
                      "px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5",
                      selectedCategory === 'mobile' 
                        ? "bg-gradient-to-r from-gold to-gold-dark text-background shadow-md scale-[1.03]" 
                        : "text-muted-foreground hover:text-foreground hover:bg-white/40"
                    )}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    ទូរស័ព្ទ
                  </button>
                  <button
                    onClick={() => setSelectedCategory('pc')}
                    className={cn(
                      "px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5",
                      selectedCategory === 'pc' 
                        ? "bg-gradient-to-r from-gold to-gold-dark text-background shadow-md scale-[1.03]" 
                        : "text-muted-foreground hover:text-foreground hover:bg-white/40"
                    )}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    កុំព្យូទ័រ
                  </button>
                </div>
              </div>
            </div>
            
            {/* Games Grid & State Handling */}
            {isLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-[24px] bg-white/40 dark:bg-black/10 animate-pulse border border-white/20" />
                ))}
              </div>
            ) : filteredGames.length === 0 ? (
              <div className="text-center py-16 sm:py-24 animate-fade-in bg-white/50 dark:bg-black/10 border border-white/40 rounded-[28px] p-6 max-w-md mx-auto shadow-sm backdrop-blur-sm">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold/10 text-gold mb-4 border border-gold/20">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h3 className="font-khmer text-base sm:text-lg font-bold mb-2">រកមិនឃើញហ្គេមទេ</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  {searchQuery 
                    ? `មិនមានលទ្ធផលស្វែងរកសម្រាប់ "${searchQuery}" ឡើយ។` 
                    : 'មិនមានហ្គេមនៅក្នុងប្រភេទនេះឡើយនៅឡើយទេ។'}
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    className="mt-4 rounded-full border-gold text-gold hover:bg-gold hover:text-background"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6">
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
          </div>
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
