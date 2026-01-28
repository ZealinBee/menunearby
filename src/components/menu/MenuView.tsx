'use client';

import { useEffect } from 'react';
import { useMenuScrape } from '@/hooks/useMenuScrape';
import { MenuSection } from './MenuSection';
import { RawMenuFormatter } from './RawMenuFormatter';

interface MenuViewProps {
  placeId: string;
  websiteUrl: string | undefined;
}

function MenuSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Section header skeleton */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-[1px] w-8 bg-primary-lighter" />
        <div className="h-7 bg-primary-lighter w-32" />
        <div className="flex-1 h-[1px] bg-primary-lighter" />
      </div>

      {/* Menu items skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="py-4 border-b border-primary-lighter/30">
            <div className="flex items-baseline gap-2">
              <div className="h-5 bg-primary-lighter w-48" />
              <div className="flex-1 border-b border-dotted border-primary-lighter/50 mb-1.5" />
              <div className="h-5 bg-primary-lighter w-16" />
            </div>
            <div className="h-4 bg-primary-lighter/50 w-3/4 mt-2" />
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
      <div className="bg-primary-light border border-primary-lighter p-8">
        <div className="text-center py-8">
          <div className="w-12 h-[1px] bg-accent mx-auto mb-4" />
          <p className="text-cream/60 italic">No website available for this restaurant.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-primary-light border border-primary-lighter">
        {/* Header */}
        <div className="border-b border-primary-lighter p-6 text-center">
          <p className="text-label text-accent tracking-widest">Menu</p>
        </div>

        {/* Loading content */}
        <div className="p-8">
          <MenuSkeleton />
          <p className="text-cream/40 text-sm mt-6 text-center italic">
            Fetching menu from restaurant website...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-primary-light border border-primary-lighter">
        <div className="border-b border-primary-lighter p-6 text-center">
          <p className="text-label text-accent tracking-widest">Menu</p>
        </div>

        <div className="p-8">
          <div className="text-center py-8">
            <div className="w-12 h-[1px] bg-primary-lighter mx-auto mb-4" />
            <p className="text-cream/60 mb-6 italic">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => fetchMenu()}
                className="btn btn-primary"
              >
                Try Again
              </button>
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
              >
                Visit Website
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!menu) {
    return null;
  }

  return (
    <div className="bg-primary-light border border-primary-lighter">
      {/* Decorative header */}
      <div className="border-b border-primary-lighter p-6 text-center">
        <p className="text-label text-accent tracking-widest">Menu</p>
      </div>

      {/* Menu Content */}
      <div className="p-8">
        {menu.sections.length > 0 ? (
          <div>
            {menu.sections.map((section, index) => (
              <MenuSection key={`${section.title}-${index}`} section={section} />
            ))}
          </div>
        ) : menu.rawText ? (
          <RawMenuFormatter text={menu.rawText} />
        ) : null}
      </div>

      {/* Footer with source info */}
      <div className="border-t border-primary-lighter px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-cream/40">
            {cached && (
              <span className="border border-primary-lighter px-2 py-0.5">
                Cached
              </span>
            )}
            <span>
              Updated {new Date(menu.scrapedAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={refetch}
              className="text-xs text-label text-cream/60 hover:text-accent transition-colors"
            >
              Refresh
            </button>
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-label text-cream/60 hover:text-accent transition-colors"
              >
                View Source
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
