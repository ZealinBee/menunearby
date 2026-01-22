'use client';

import { useState, useCallback } from 'react';
import type { MenuContent, MenuScrapeResponse } from '@/types/menu';

interface UseMenuScrapeResult {
  menu: MenuContent | null;
  isLoading: boolean;
  error: string | null;
  sourceUrl: string | null;
  cached: boolean;
  fetchMenu: () => void;
  refetch: () => void;
}

export function useMenuScrape(
  placeId: string,
  websiteUrl: string | undefined
): UseMenuScrapeResult {
  const [menu, setMenu] = useState<MenuContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const fetchMenu = useCallback(
    async (refresh = false) => {
      if (!websiteUrl) {
        setError('No website available');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          websiteUrl,
          ...(refresh && { refresh: 'true' }),
        });

        const response = await fetch(`/api/menu/${placeId}?${params}`);
        const data: MenuScrapeResponse = await response.json();

        if (data.success && data.menu) {
          setMenu(data.menu);
          setSourceUrl(data.sourceUrl);
          setCached(data.cached);
          setError(null);
        } else {
          setMenu(null);
          setError(data.error || 'Could not find menu');
          setSourceUrl(data.sourceUrl);
        }
      } catch (err) {
        console.error('Menu fetch error:', err);
        setError('Failed to fetch menu');
        setMenu(null);
      } finally {
        setIsLoading(false);
      }
    },
    [placeId, websiteUrl]
  );

  const refetch = useCallback(() => {
    fetchMenu(true);
  }, [fetchMenu]);

  return {
    menu,
    isLoading,
    error,
    sourceUrl,
    cached,
    fetchMenu: () => fetchMenu(false),
    refetch,
  };
}
