import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { Game } from '@/contexts/SiteContext';
import { resolveIconUrl } from '@/lib/icon-url';

interface Props {
  game: Game;
  index: number;
}

const FeaturedGameCard: React.FC<Props> = ({ game, index }) => {
  const [favorited, setFavorited] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const subtitle = game.packages?.[0]?.name
    ? `${game.packages[0].name}`
    : 'Available Now';

  return (
    <div
      className="group animate-fade-in relative"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      <Link to={`/topup/${game.slug}`} className="block">
        <div className="relative h-[100px] bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden transition-all duration-250 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_16px_48px_-8px_rgba(255,77,166,0.25)] shadow-[0_4px_20px_-6px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.3)] group-hover:shadow-xl">
          {/* Pink gradient border (pseudo-element via background on parent) */}
          <div className="absolute inset-0 rounded-2xl p-[1.5px] pointer-events-none">
            <div className="w-full h-full rounded-2xl bg-gradient-to-r from-[#ff4da6] to-[#ff8ac5] opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          {/* White inner background */}
          <div className="absolute inset-[1.5px] rounded-2xl bg-white dark:bg-zinc-900" />

          {/* Content */}
          <div className="relative z-10 flex items-center h-full px-4 gap-4">
            {/* Thumbnail container */}
            <div className="relative shrink-0">
              {/* Favorite button */}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setFavorited(!favorited); }}
                className="absolute -top-1 -left-1 z-20 w-7 h-7 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] flex items-center justify-center transition-transform duration-200 hover:scale-110"
                aria-label="Favorite"
              >
                <Heart
                  className={`w-3.5 h-3.5 transition-colors duration-200 ${
                    favorited ? 'fill-[#ff4da6] text-[#ff4da6]' : 'text-[#ff4da6]'
                  }`}
                />
              </button>

              {/* Image */}
              <div className="w-[72px] h-[72px] rounded-[16px] overflow-hidden border-2 border-white dark:border-zinc-700 shadow-[0_2px_8px_rgba(0,0,0,0.06)] shrink-0 bg-zinc-100 dark:bg-zinc-800">
                {!imgLoaded && (
                  <div className="w-full h-full bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                )}
                <img
                  src={resolveIconUrl(game.image)}
                  alt={game.name}
                  loading={index < 4 ? 'eager' : 'lazy'}
                  onLoad={() => setImgLoaded(true)}
                  className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${
                    imgLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </div>
            </div>

            {/* Game info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50 truncate">
                {game.name}
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                {subtitle}
              </p>
            </div>

            {/* Action button */}
            <div className="shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff4da6] to-[#ff8ac5] flex items-center justify-center shadow-[0_4px_14px_-2px_rgba(255,77,166,0.35)] transition-all duration-250 group-hover:scale-110 group-hover:shadow-[0_6px_20px_-2px_rgba(255,77,166,0.5)]">
                <ShoppingCart className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default FeaturedGameCard;
