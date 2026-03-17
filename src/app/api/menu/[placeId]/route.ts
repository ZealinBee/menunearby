import { NextResponse } from 'next/server';
import type { MenuScrapeResponse } from '@/types/menu';
import { scrapeMenu } from '@/lib/menu-scraper';
import { placesCache, menuCacheKey } from '@/lib/cache';
import { CACHE_TTL } from '@/lib/constants';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ placeId: string }> }
) {
  try {
    const { placeId } = await params;
    const { searchParams } = new URL(request.url);
    const websiteUrl = searchParams.get('websiteUrl');
    const refresh = searchParams.get('refresh') === 'true';

    if (!placeId) {
      return NextResponse.json(
        {
          success: false,
          menu: null,
          sourceUrl: null,
          cached: false,
          error: 'Place ID is required',
          errorCode: 'NO_WEBSITE',
        } satisfies MenuScrapeResponse,
        { status: 400 }
      );
    }

    if (!websiteUrl) {
      return NextResponse.json(
        {
          success: false,
          menu: null,
          sourceUrl: null,
          cached: false,
          error: 'Website URL is required',
          errorCode: 'NO_WEBSITE',
        } satisfies MenuScrapeResponse,
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(websiteUrl);
    } catch {
      return NextResponse.json(
        {
          success: false,
          menu: null,
          sourceUrl: null,
          cached: false,
          error: 'Invalid website URL',
          errorCode: 'NO_WEBSITE',
        } satisfies MenuScrapeResponse,
        { status: 400 }
      );
    }

    // Check cache (unless refresh is requested)
    const cacheKey = menuCacheKey(placeId);
    if (!refresh) {
      const cached = placesCache.get<MenuScrapeResponse>(cacheKey);
      if (cached) {
        return NextResponse.json({
          ...cached.data,
          cached: true,
        });
      }
    }

    // Scrape and parse the menu (AI formatting is now built-in)
    const result = await scrapeMenu(websiteUrl);

    const response: MenuScrapeResponse = {
      success: result.success,
      menu: result.menu,
      sourceUrl: result.sourceUrl,
      cached: false,
      error: result.error,
      errorCode: result.error ? 'SCRAPE_FAILED' : undefined,
    };

    // Cache successful results
    if (result.success && result.menu) {
      placesCache.set(cacheKey, response, CACHE_TTL.MENU);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Menu scrape error:', error);
    return NextResponse.json(
      {
        success: false,
        menu: null,
        sourceUrl: null,
        cached: false,
        error: 'Internal server error',
        errorCode: 'SCRAPE_FAILED',
      } satisfies MenuScrapeResponse,
      { status: 500 }
    );
  }
}
