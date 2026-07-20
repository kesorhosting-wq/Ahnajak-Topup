import { useState, useEffect } from 'react';
import { db } from '@/integrations/db/client';

export interface ZoneOption {
  value: string;
  label: string;
}

interface VerificationConfig {
  id: string;
  game_name: string;
  api_code: string;
  api_provider: string;
  requires_zone: boolean;
  default_zone: string | null;
  zone_options: ZoneOption[] | null;
  is_active: boolean;
}

interface UseGameVerificationConfigReturn {
  config: VerificationConfig | null;
  isLoading: boolean;
  requiresZone: boolean;
  defaultZone: string | null;
  zoneOptions: ZoneOption[] | null;
}

export const useGameVerificationConfig = (gameName: string | undefined): UseGameVerificationConfigReturn => {
  const [config, setConfig] = useState<VerificationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!gameName) {
      setConfig(null);
      setIsLoading(false);
      return;
    }

    const fetchConfig = async () => {
      setIsLoading(true);
      try {
        // Try exact match first
        const { data: exactMatches } = await db
          .from('game_verification_configs')
          .select('*')
          .eq('is_active', true)
          .ilike('game_name', gameName);

        let data = null;
        if (exactMatches && exactMatches.length > 0) {
          // Prioritize the one requiring zone or having zone options
          data = exactMatches.find(m => m.requires_zone) || exactMatches[0];
        }

        // If not found, try partial match
        if (!data) {
          const { data: partialMatches } = await db
            .from('game_verification_configs')
            .select('*')
            .eq('is_active', true)
            .ilike('game_name', `%${gameName}%`);
          
          if (partialMatches && partialMatches.length > 0) {
            data = partialMatches.find(m => m.requires_zone) || partialMatches[0];
          }
        }

        const configData = data ? {
          ...data,
          zone_options: Array.isArray(data.zone_options) ? data.zone_options as unknown as ZoneOption[] : null,
        } : null;
        setConfig(configData);
      } catch (error) {
        console.error('Failed to fetch verification config:', error);
        setConfig(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [gameName]);

  return {
    config,
    isLoading,
    requiresZone: config?.requires_zone ?? false,
    defaultZone: config?.default_zone ?? null,
    zoneOptions: config?.zone_options ?? null,
  };
};
