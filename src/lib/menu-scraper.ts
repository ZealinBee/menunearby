// Menu scraper for extracting menu content from restaurant websites
// Uses AI to intelligently find menu pages and extract content from text and images

import Anthropic from '@anthropic-ai/sdk';
import { MenuContent } from '@/types/menu';

const anthropic = new Anthropic();

interface ScrapeResult {
  success: boolean;
  menu: MenuContent | null;
  sourceUrl: string | null;
  error?: string;
}

interface FetchResult {
  html: string;
  finalUrl: string;
}

interface MenuPageAnalysis {
  menuUrl: string | null;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface ExtractedImages {
  urls: string[];
  isLikelyMenuImage: boolean[];
}

/**
 * Main entry point for scraping a restaurant menu
 */
export async function scrapeMenu(websiteUrl: string): Promise<ScrapeResult> {
  try {
    const startTime = Date.now();
    console.log(`[Menu Scraper] Starting scrape for: ${websiteUrl}`);

    // Step 1: Fetch the main website
    const mainPage = await fetchPage(websiteUrl);
    console.log(`[Menu Scraper] Page fetch: ${Date.now() - startTime}ms`);
    if (!mainPage) {
      return {
        success: false,
        menu: null,
        sourceUrl: null,
        error: 'Could not reach restaurant website',
      };
    }

    // Step 2: Find ALL menu page URLs
    const allMenuLinks = findAllMenuLinks(mainPage.html, mainPage.finalUrl);
    console.log(`[Menu Scraper] Found ${allMenuLinks.length} menu links:`, allMenuLinks);

    // Step 3: Fetch all menu pages (including main page if no links found)
    const pagesToProcess: { html: string; url: string }[] = [];

    if (allMenuLinks.length === 0) {
      // No menu links found, process main page
      pagesToProcess.push({ html: mainPage.html, url: mainPage.finalUrl });
    } else {
      // Fetch up to 4 menu pages in parallel
      const menuPagesToFetch = allMenuLinks.slice(0, 4);
      const fetchPromises = menuPagesToFetch.map(async (url) => {
        console.log(`[Menu Scraper] Fetching menu page: ${url}`);
        const page = await fetchPage(url);
        return page ? { html: page.html, url: page.finalUrl } : null;
      });

      const results = await Promise.all(fetchPromises);
      for (const result of results) {
        if (result) {
          pagesToProcess.push(result);
        }
      }

      // If no menu pages loaded, fallback to main page
      if (pagesToProcess.length === 0) {
        pagesToProcess.push({ html: mainPage.html, url: mainPage.finalUrl });
      }
    }

    // Step 4: Extract text content from all menu pages
    let allTextContent = '';
    let menuSourceUrl = pagesToProcess[0]?.url || mainPage.finalUrl;

    for (const page of pagesToProcess) {
      const pageText = extractTextContent(page.html);
      if (pageText.length > 100) {
        allTextContent += `\n=== ${page.url} ===\n${pageText}\n`;
      }
    }

    const textContent = allTextContent || extractTextContent(mainPage.html);

    // Step 5: Check if text content looks like a menu (has prices OR is from a known menu URL)
    const isFromMenuUrl = pagesToProcess.some(p =>
      /ruokalista|menu|lounas|speisekarte|meny|carta/i.test(p.url)
    );
    const textHasMenuContent = hasMenuPrices(textContent) || (isFromMenuUrl && textContent.length > 100);
    console.log(`[Menu Scraper] Text content has prices: ${hasMenuPrices(textContent)}, from menu URL: ${isFromMenuUrl}, length: ${textContent.length}`);

    // Step 6: Only use vision if text doesn't look like a menu
    let imageMenuText = '';
    if (!textHasMenuContent || textContent.length < 200) {
      // Collect images from all menu pages
      const allImageUrls = new Set<string>();
      for (const page of pagesToProcess) {
        const images = extractMenuImages(page.html, page.url);
        images.urls.forEach((url) => allImageUrls.add(url));
      }

      const imageUrls = Array.from(allImageUrls);
      console.log(`[Menu Scraper] Text insufficient, found ${imageUrls.length} potential menu images across ${pagesToProcess.length} pages`);

      if (imageUrls.length > 0) {
        console.log(`[Menu Scraper] Processing menu images with AI vision...`);
        imageMenuText = await extractTextFromImages(imageUrls);
      }
    } else {
      console.log(`[Menu Scraper] Text content sufficient, skipping image processing`);
    }

    // Step 7: Validate we actually found menu content
    // Check if image extraction found "Not a menu image" (meaning no real menu)
    const imageHasMenu = imageMenuText &&
      !imageMenuText.includes('Not a menu image') &&
      imageMenuText.length > 100;

    // If neither text nor images have menu content, fail
    // But be more lenient if we're on a known menu URL
    if (!textHasMenuContent && !imageHasMenu) {
      // Last resort: if we're on a menu URL and have some text, trust it
      if (isFromMenuUrl && textContent.length > 100) {
        console.log(`[Menu Scraper] No prices found, but trusting menu URL content`);
      } else {
        console.log(`[Menu Scraper] No menu content found - text has no prices and images aren't menus`);
        return {
          success: false,
          menu: null,
          sourceUrl: menuSourceUrl,
          error: 'Could not find menu content on website',
        };
      }
    }

    // Combine text from HTML and images
    // Include text if it has prices, is from a menu URL, or we're trusting the URL
    const useTextContent = textHasMenuContent || (isFromMenuUrl && textContent.length > 100);
    const combinedText = combineMenuText(
      useTextContent ? textContent : '',
      imageHasMenu ? imageMenuText : ''
    );

    if (!combinedText || combinedText.length < 50) {
      return {
        success: false,
        menu: null,
        sourceUrl: menuSourceUrl,
        error: 'Could not find menu content on website',
      };
    }

    return {
      success: true,
      menu: {
        sections: [],
        rawText: combinedText.substring(0, 15000),
        scrapedAt: new Date().toISOString(),
      },
      sourceUrl: menuSourceUrl,
    };
  } catch (error) {
    console.error('[Menu Scraper] Error:', error);
    return {
      success: false,
      menu: null,
      sourceUrl: null,
      error: error instanceof Error ? error.message : 'Scraping failed',
    };
  }
}

/**
 * Find menu page URL - fast pattern matching first, AI as fallback
 */
async function findMenuPage(html: string, baseUrl: string): Promise<MenuPageAnalysis> {
  // Try fast pattern matching first (instant)
  const patternMatch = findMenuLinkFallback(html, baseUrl);
  if (patternMatch) {
    return {
      menuUrl: patternMatch,
      confidence: 'high',
      reasoning: 'Found via pattern matching',
    };
  }

  // No API key? Return null (menu might be on current page)
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      menuUrl: null,
      confidence: 'low',
      reasoning: 'No menu link found, checking current page',
    };
  }

  // Use AI as fallback (with fast Haiku model)
  return findMenuPageWithAI(html, baseUrl);
}

/**
 * Use AI to analyze HTML and find the menu page URL (fallback, uses Haiku for speed)
 */
async function findMenuPageWithAI(html: string, baseUrl: string): Promise<MenuPageAnalysis> {
  try {
    // Extract all links from the page for analysis
    const links = extractAllLinks(html, baseUrl);

    // Keep prompt minimal for speed - be strict about JSON-only output
    const prompt = `Find the menu page URL from these restaurant website links:
${links.slice(0, 30).map((l) => `${l.text}: ${l.url}`).join('\n')}

Respond with ONLY valid JSON, no other text: {"menuUrl": "URL or null", "reasoning": "brief"}`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    let responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Strip markdown code blocks if present
    responseText = responseText
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();

    // Try to extract JSON from the response if it contains extra text
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      menuUrl: result.menuUrl,
      confidence: 'medium',
      reasoning: result.reasoning || 'AI analysis',
    };
  } catch (error) {
    console.error('[Menu Scraper] AI menu finding error:', error);
    return {
      menuUrl: null,
      confidence: 'low',
      reasoning: 'AI fallback failed',
    };
  }
}

/**
 * Extract text from menu images using Claude Vision
 */
async function extractTextFromImages(imageUrls: string[]): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY || imageUrls.length === 0) {
    return '';
  }

  try {
    // Process up to 5 images to capture more menu content
    const imagesToProcess = imageUrls.slice(0, 5);
    const imageContents: Anthropic.ImageBlockParam[] = [];

    for (const url of imagesToProcess) {
      try {
        // Fetch the image and convert to base64
        const imageData = await fetchImageAsBase64(url);
        if (imageData) {
          imageContents.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: imageData.mediaType,
              data: imageData.base64,
            },
          });
        }
      } catch (err) {
        console.error(`[Menu Scraper] Failed to fetch image: ${url}`, err);
      }
    }

    if (imageContents.length === 0) {
      return '';
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            ...imageContents,
            {
              type: 'text',
              text: `These are images from a restaurant's menu page. Extract ALL text you can see from these menu images.

For each menu item, capture:
- Item name
- Price (keep original format with currency symbol)
- Description if visible
- Any dietary indicators (V, VG, GF, etc.)

Format the output as plain text with each item on its own line. Group items by section if sections are visible.
If an image is not a menu (e.g., a photo of food, restaurant interior), skip it and note "Not a menu image".

Extract the menu text:`,
            },
          ],
        },
      ],
    });

    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return responseText;
  } catch (error) {
    console.error('[Menu Scraper] Vision extraction error:', error);
    return '';
  }
}

/**
 * Fetch an image and convert to base64
 */
async function fetchImageAsBase64(
  url: string
): Promise<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout for images

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MenuNearby/1.0 (Restaurant Menu Aggregator)',
        Accept: 'image/*',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';

    if (contentType.includes('png')) {
      mediaType = 'image/png';
    } else if (contentType.includes('gif')) {
      mediaType = 'image/gif';
    } else if (contentType.includes('webp')) {
      mediaType = 'image/webp';
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Skip very small images (likely icons) or very large ones
    if (base64.length < 5000 || base64.length > 10000000) {
      return null;
    }

    return { base64, mediaType };
  } catch (error) {
    console.error('[Menu Scraper] Image fetch error:', error);
    return null;
  }
}

/**
 * Extract all links from HTML
 */
function extractAllLinks(html: string, baseUrl: string): { url: string; text: string }[] {
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const links: { url: string; text: string }[] = [];

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = resolveUrl(match[1], baseUrl);
    const text = match[2].replace(/<[^>]+>/g, '').trim();

    // Filter out obvious non-menu links
    if (
      url &&
      !url.includes('facebook.com') &&
      !url.includes('instagram.com') &&
      !url.includes('twitter.com') &&
      !url.includes('mailto:') &&
      !url.includes('tel:') &&
      text.length > 0 &&
      text.length < 100
    ) {
      links.push({ url, text });
    }
  }

  return links;
}

/**
 * Extract navigation HTML for better context
 */
function extractNavigationHtml(html: string): string {
  // Try to find nav elements
  const navMatch = html.match(/<nav[^>]*>[\s\S]*?<\/nav>/gi);
  if (navMatch) {
    return navMatch.join('\n');
  }

  // Try header
  const headerMatch = html.match(/<header[^>]*>[\s\S]*?<\/header>/gi);
  if (headerMatch) {
    return headerMatch.join('\n');
  }

  // Return first 2000 chars as fallback
  return html.substring(0, 2000);
}

/**
 * Extract images that might be menu images
 */
function extractMenuImages(html: string, baseUrl: string): ExtractedImages {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const urls: string[] = [];
  const isLikelyMenuImage: boolean[] = [];

  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[0];
    const url = resolveUrl(match[1], baseUrl);

    if (!url) continue;

    // Check if this looks like a menu image based on attributes
    const isMenu =
      /menu/i.test(src) ||
      /ruokalista/i.test(src) ||
      /speisekarte/i.test(src) ||
      /food-list/i.test(src) ||
      /price-list/i.test(src) ||
      /lounas/i.test(src);

    // Skip social media images, icons, logos
    const isSkippable =
      /logo/i.test(src) ||
      /icon/i.test(src) ||
      /avatar/i.test(src) ||
      /social/i.test(src) ||
      /facebook/i.test(src) ||
      /instagram/i.test(src) ||
      /twitter/i.test(src) ||
      /banner/i.test(url) ||
      url.includes('gravatar.com') ||
      url.includes('wp-content/plugins');

    if (!isSkippable) {
      urls.push(url);
      isLikelyMenuImage.push(isMenu);
    }
  }

  // Sort so likely menu images come first
  const sorted = urls
    .map((url, i) => ({ url, isMenu: isLikelyMenuImage[i] }))
    .sort((a, b) => (b.isMenu ? 1 : 0) - (a.isMenu ? 1 : 0));

  return {
    urls: sorted.map((s) => s.url),
    isLikelyMenuImage: sorted.map((s) => s.isMenu),
  };
}

/**
 * Extract clean text content from HTML
 */
function extractTextContent(html: string): string {
  // Remove script, style, nav, header, footer tags
  const cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');

  // Extract text content
  const textContent = cleanHtml
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n\s*\n/g, '\n')
    .trim();

  return textContent;
}

/**
 * Check if text contains menu prices
 */
function hasMenuPrices(text: string): boolean {
  const pricePatterns = [
    /\d+[.,]\d{2}\s*€/g, // 12.50 €
    /€\s*\d+[.,]\d{2}/g, // € 12.50
    /\d+\s*€/g, // 12 €
    /\$\s*\d+[.,]\d{2}/g, // $ 12.50
    /\d+[.,]\d{2}\s*\$/g, // 12.50 $
    /\d+[.,]\d{2}\s*EUR/gi, // 12.50 EUR
  ];

  let priceCount = 0;
  for (const pattern of pricePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      priceCount += matches.length;
    }
  }

  // Consider it menu-worthy if we find at least 3 prices
  return priceCount >= 3;
}

/**
 * Combine text from HTML and images, avoiding duplicates
 */
function combineMenuText(htmlText: string, imageText: string): string {
  if (!imageText) {
    return htmlText;
  }

  if (!htmlText) {
    return imageText;
  }

  // If image text is substantial, prioritize it (likely the actual menu)
  if (imageText.length > 500 && !imageText.includes('Not a menu image')) {
    return `=== Menu from Images ===\n${imageText}\n\n=== Additional Text from Page ===\n${htmlText.substring(0, 3000)}`;
  }

  return `${htmlText}\n\n=== Additional Content from Images ===\n${imageText}`;
}

/**
 * Check if a URL is a valid menu link (not an anchor, not same page)
 */
function isValidMenuLink(url: string, baseUrl: string): boolean {
  // Skip anchors and empty links
  if (url.endsWith('#') || url === '#' || url === baseUrl) {
    return false;
  }
  // Skip if it's just the base URL with an anchor
  if (url.startsWith(baseUrl) && url.includes('#')) {
    return false;
  }
  // Skip javascript: links
  if (url.startsWith('javascript:')) {
    return false;
  }
  return true;
}

/**
 * Find ALL menu-related links (returns multiple if found)
 */
function findAllMenuLinks(html: string, baseUrl: string): string[] {
  const MENU_URL_PATTERNS = [/\/menu(?:\/|$)/i, /\/food(?:\/|$)/i, /\/ruokalista/i, /\/lounas/i, /\/speisekarte/i, /\/meny(?:\/|$)/i, /\/carta/i, /\/a-la-carte/i, /\/lunch/i, /\/dinner/i, /\/buffet/i];

  const MENU_LINK_TEXT_PATTERNS = [/^menu$/i, /our menu/i, /food menu/i, /see menu/i, /view menu/i, /ruokalista/i, /a la carte/i, /lounas/i, /lunch/i, /dinner/i, /buffet/i];

  const links = extractAllLinks(html, baseUrl);
  const menuUrls = new Set<string>();

  // Check URL patterns
  for (const link of links) {
    if (!isValidMenuLink(link.url, baseUrl)) continue;
    for (const pattern of MENU_URL_PATTERNS) {
      if (pattern.test(link.url)) {
        menuUrls.add(link.url);
        break;
      }
    }
  }

  // Check link text
  for (const link of links) {
    if (!isValidMenuLink(link.url, baseUrl)) continue;
    for (const pattern of MENU_LINK_TEXT_PATTERNS) {
      if (pattern.test(link.text)) {
        menuUrls.add(link.url);
        break;
      }
    }
  }

  return Array.from(menuUrls);
}

/**
 * Fallback menu link finder using patterns (returns first match)
 */
function findMenuLinkFallback(html: string, baseUrl: string): string | null {
  const allLinks = findAllMenuLinks(html, baseUrl);
  return allLinks.length > 0 ? allLinks[0] : null;
}

/**
 * Fetch a page with proper headers and timeout
 */
async function fetchPage(url: string): Promise<FetchResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout for speed

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,fi;q=0.8',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.log(`[Menu Scraper] Page fetch failed: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return null;
    }

    const html = await response.text();
    return {
      html,
      finalUrl: response.url,
    };
  } catch (error) {
    console.error('[Menu Scraper] Fetch error:', error);
    return null;
  }
}

/**
 * Resolve a potentially relative URL against a base URL
 */
function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}
