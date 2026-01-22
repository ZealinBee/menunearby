'use client';

import { useEffect } from 'react';
import { useMenuScrape } from '@/hooks/useMenuScrape';
import { MenuSection } from './MenuSection';

interface MenuViewProps {
  placeId: string;
  websiteUrl: string | undefined;
}

function MenuSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-6 bg-primary-lighter w-32" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-primary-lighter w-3/4" />
              <div className="h-4 bg-primary-lighter w-1/2" />
            </div>
            <div className="h-5 bg-primary-lighter w-16 ml-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MenuView({ placeId, websiteUrl }: MenuViewProps) {
  const { menu, isLoading, error, sourceUrl, cached, fetchMenu, refetch } =
    useMenuScrape(placeId, websiteUrl);

  // Fetch menu on mount
  useEffect(() => {
    if (websiteUrl && !menu && !isLoading && !error) {
      fetchMenu();
    }
  }, [websiteUrl, menu, isLoading, error, fetchMenu]);

  if (!websiteUrl) {
    return (
      <div className="text-center py-12">
        <p className="text-cream/60">No website available for this restaurant.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-primary-light p-6">
        <MenuSkeleton />
        <p className="text-cream/60 text-sm mt-4">Fetching menu from website...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-primary-light p-6">
        <div className="text-center py-8">
          <p className="text-cream/60 mb-4">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => fetchMenu()}
              className="px-4 py-2 bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Try Again
            </button>
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-primary-lighter text-cream text-sm font-medium hover:bg-primary-lighter/80 transition-colors text-center"
            >
              Visit Website
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!menu) {
    return null;
  }

  return (
    <div className="bg-primary-light p-6">
      {/* Menu Content */}
      {menu.sections.length > 0 ? (
        <div className="space-y-6">
          {menu.sections.map((section, index) => (
            <MenuSection key={`${section.title}-${index}`} section={section} />
          ))}
        </div>
      ) : menu.rawText ? (
        <div className="prose prose-invert max-w-none">
          <pre className="whitespace-pre-wrap text-sm text-cream/80 font-sans">
            {menu.rawText}
          </pre>
        </div>
      ) : null}

      {/* Footer with source info */}
      <div className="mt-8 pt-4 border-t border-primary-lighter">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-cream/50">
          <div className="flex items-center gap-2">
            {cached && <span className="text-xs">(cached)</span>}
            <span>
              Last updated: {new Date(menu.scrapedAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refetch}
              className="text-accent hover:text-accent/80 transition-colors"
            >
              Refresh Menu
            </button>
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent/80 transition-colors"
              >
                View Original
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
