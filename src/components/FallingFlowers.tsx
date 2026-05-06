import React, { useEffect, useState, useCallback } from 'react';

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
  const [petals, setPetals] = useState<Petal[]>([]);

  const createPetal = useCallback((): Petal => {
    return {
      id: petalId++,
      image: FLOWER_IMAGES[Math.floor(Math.random() * FLOWER_IMAGES.length)],
      left: Math.random() * 100,
      size: 20 + Math.random() * 30,
      duration: 6 + Math.random() * 8,
      delay: 0,
      swayAmount: 30 + Math.random() * 60,
      rotation: Math.random() * 360,
      opacity: 1, // Full opacity, real image color
    };
  }, []);

  useEffect(() => {
    // Initial batch (lighter)
    const initial: Petal[] = [];
    for (let i = 0; i < 8; i++) {
      initial.push({ ...createPetal(), delay: Math.random() * 8 });
    }
    setPetals(initial);

    const interval = setInterval(() => {
      setPetals(prev => {
        const filtered = prev.length > 18 ? prev.slice(-15) : prev;
        return [...filtered, createPetal()];
      });
    }, 1600);

    return () => clearInterval(interval);
  }, [createPetal]);

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
              animation: `flowerSpin ${3 + Math.random() * 4}s linear infinite`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default FallingFlowers;
