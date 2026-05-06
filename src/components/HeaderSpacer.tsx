import React from 'react';
import { useSite } from '@/contexts/SiteContext';
import { useIsMobile } from '@/hooks/use-mobile';

const HeaderSpacer: React.FC = () => {
  const isMobile = useIsMobile();
  const { settings } = useSite();

  const headerHeight = isMobile 
    ? (settings.headerHeightMobile || 56) 
    : (settings.headerHeightDesktop || 96);

  return <div style={{ height: `${headerHeight}px` }} />;
};

export default HeaderSpacer;
