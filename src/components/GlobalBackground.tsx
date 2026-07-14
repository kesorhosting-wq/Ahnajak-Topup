import React from 'react';
import { useSite } from '@/contexts/SiteContext';

const GlobalBackground: React.FC = () => {
  const { settings } = useSite();
  const bgType = settings.bgType || 'color';
  const bgColor = settings.backgroundColor || '#000000';
  const primaryColor = settings.primaryColor || '#0ea5e9';
  const accentColor = settings.accentColor || '#0284c7';
  const bgImageUrl = settings.bgImageUrl || '';
  const bgVideoUrl = settings.bgVideoUrl || '';

  return (
    <div className="fixed inset-0 w-full h-full z-[-9999] pointer-events-none overflow-hidden">
      {/* 1. Base solid background color */}
      <div 
        className="absolute inset-0 w-full h-full transition-colors duration-500" 
        style={{ backgroundColor: bgType === 'color' ? bgColor : '#000000' }} 
      />

      {/* 2. Gradient background */}
      {bgType === 'gradient' && (
        <div 
          className="absolute inset-0 w-full h-full transition-all duration-500"
          style={{ 
            background: `linear-gradient(135deg, ${bgColor} 0%, ${primaryColor}60 50%, ${accentColor}40 100%)` 
          }}
        />
      )}

      {/* 3. Image background */}
      {bgType === 'image' && bgImageUrl && (
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat transition-all duration-500"
          style={{ backgroundImage: `url(${bgImageUrl})` }}
        />
      )}

      {/* 4. Video background */}
      {bgType === 'video' && bgVideoUrl && (
        <video 
          src={bgVideoUrl}
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute inset-0 w-full h-full object-cover transition-all duration-500"
        />
      )}

      {/* 5. Premium Dark Overlay (protects text readability and enforces dark theme consistency across all pages) */}
      <div className="absolute inset-0 w-full h-full bg-zinc-950/85 z-10 transition-all duration-500" />
    </div>
  );
};

export default GlobalBackground;
