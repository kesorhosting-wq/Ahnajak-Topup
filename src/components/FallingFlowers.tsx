import React, { useEffect, useState, useCallback } from 'react';
import { useSite } from '@/contexts/SiteContext';
import { useLocation } from 'react-router-dom';

const FLOWER_IMAGES = [
  '/images/flower1.png',
  '/images/flower2.png',
  '/images/flower3.png',
  '/images/flower4.png',
  '/images/flower5.png',
];

interface Petal {
  id: number;
  image: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
  swayAmount: number;
  rotation: number;
  opacity: number;
}

let petalId = 0;

const FallingFlowers: React.FC = () => {
  const location = useLocation();
  const { settings } = useSite();
  const intensity = Math.max(0, Math.min(100, settings.fallingIntensity ?? 30));
  const speed = Math.max(0.2, Math.min(3, settings.fallingSpeed ?? 1));
  const [petals, setPetals] = useState<Petal[]>([]);

  const createPetal = useCallback((): Petal => {
    return {
      id: petalId++,
      image: FLOWER_IMAGES[Math.floor(Math.random() * FLOWER_IMAGES.length)],
      left: Math.random() * 100,
      size: 20 + Math.random() * 30,
      duration: (6 + Math.random() * 8) / speed,
      delay: 0,
      swayAmount: 30 + Math.random() * 60,
      rotation: Math.random() * 360,
      opacity: 1,
    };
  }, [speed]);

  useEffect(() => {
    if (location.pathname !== '/' || intensity <= 0) {
      setPetals([]);
      return;
    }

    // initial = up to 25 petals scaled by intensity
    const initialCount = Math.max(1, Math.round((intensity / 100) * 25));
    const initial: Petal[] = [];
    for (let i = 0; i < initialCount; i++) {
      initial.push({ ...createPetal(), delay: Math.random() * 6 });
    }
    setPetals(initial);

    // spawn interval: 100% intensity = ~400ms, 0% = ~3000ms
    const intervalMs = Math.round(3000 - (intensity / 100) * 2600);
    const maxAlive = Math.max(4, Math.round((intensity / 100) * 60));

    const interval = setInterval(() => {
      setPetals(prev => {
        const filtered = prev.length > maxAlive ? prev.slice(-Math.floor(maxAlive * 0.8)) : prev;
        return [...filtered, createPetal()];
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [createPetal, intensity, location.pathname]);

  if (location.pathname !== '/') {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {petals.map(petal => (
        <div
          key={petal.id}
          className="absolute"
          style={{
            left: `${petal.left}%`,
            top: '-60px',
            width: petal.size,
            height: petal.size,
            opacity: petal.opacity,
            animation: `flowerFall ${petal.duration}s linear ${petal.delay}s forwards, flowerSway ${petal.duration / 2}s ease-in-out ${petal.delay}s infinite alternate`,
            transform: `rotate(${petal.rotation}deg)`,
            ['--sway' as string]: `${petal.swayAmount}px`,
          }}
        >
          <img
            src={petal.image}
            alt=""
            className="w-full h-full object-contain"
            style={{
              animation: `flowerSpin ${(3 + Math.random() * 4) / speed}s linear infinite`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default FallingFlowers;
