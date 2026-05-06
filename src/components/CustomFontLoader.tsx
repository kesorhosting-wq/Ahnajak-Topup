import React, { useEffect } from 'react';
import { useSite } from '@/contexts/SiteContext';

/**
 * Component that dynamically loads custom fonts and applies them site-wide
 */
const CustomFontLoader: React.FC = () => {
  const { settings } = useSite();

  useEffect(() => {
    // Remove any existing custom font style
    const existingStyle = document.getElementById('custom-fonts-style');
    if (existingStyle) {
      existingStyle.remove();
    }

    const fontFaces: string[] = [];
    const fontVariables: string[] = [];

    // Add Khmer font if configured
    if (settings.customKhmerFont) {
      const format = settings.customKhmerFont.includes('.woff2') ? 'woff2' 
        : settings.customKhmerFont.includes('.woff') ? 'woff'
        : settings.customKhmerFont.includes('.ttf') ? 'truetype'
        : 'opentype';
      
      fontFaces.push(`
        @font-face {
          font-family: 'CustomKhmer';
          src: url('${settings.customKhmerFont}') format('${format}');
          font-weight: 100 900;
          font-style: normal;
          font-display: swap;
        }
      `);
      fontVariables.push(`--font-khmer: 'CustomKhmer', Battambang, 'Noto Sans', cursive;`);
    }

    // Add English font if configured
    if (settings.customEnglishFont) {
      const format = settings.customEnglishFont.includes('.woff2') ? 'woff2' 
        : settings.customEnglishFont.includes('.woff') ? 'woff'
        : settings.customEnglishFont.includes('.ttf') ? 'truetype'
        : 'opentype';
      
      fontFaces.push(`
        @font-face {
          font-family: 'CustomEnglish';
          src: url('${settings.customEnglishFont}') format('${format}');
          font-weight: 100 900;
          font-style: normal;
          font-display: swap;
        }
      `);
      fontVariables.push(`--font-english: 'CustomEnglish', 'Noto Sans', system-ui, sans-serif;`);
    }

    // Only inject styles if we have custom fonts
    if (fontFaces.length > 0) {
      const styleContent = `
        ${fontFaces.join('\n')}
        
        :root {
          ${fontVariables.join('\n          ')}
        }
        
        /* Apply custom fonts globally */
        ${settings.customEnglishFont ? `
        body, html {
          font-family: 'CustomEnglish', 'Noto Sans', Battambang, 'Noto Sans Symbols 2', system-ui, sans-serif !important;
        }
        ` : ''}
        
        ${settings.customKhmerFont ? `
        /* Khmer text - apply to Khmer unicode range */
        body, html {
          font-family: ${settings.customEnglishFont ? "'CustomEnglish', " : ''}'CustomKhmer', Battambang, 'Noto Sans', 'Noto Sans Symbols 2', system-ui, sans-serif !important;
        }
        
        .font-khmer {
          font-family: 'CustomKhmer', Battambang, 'Noto Sans', cursive !important;
        }
        ` : ''}
      `;

      const styleElement = document.createElement('style');
      styleElement.id = 'custom-fonts-style';
      styleElement.textContent = styleContent;
      document.head.appendChild(styleElement);
    }

    // Cleanup on unmount
    return () => {
      const styleToRemove = document.getElementById('custom-fonts-style');
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, [settings.customKhmerFont, settings.customEnglishFont]);

  return null; // This component doesn't render anything
};

export default CustomFontLoader;
