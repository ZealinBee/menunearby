// Menu scraper for extracting menu content from restaurant websites
// Uses AI to intelligently find menu pages and extract content from text and images

import Anthropic from '@anthropic-ai/sdk';
import { MenuContent, MenuSection, MenuItem } from '@/types/menu';

// Lazy-loaded Anthropic client to ensure env vars are loaded
let _anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

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

    // Step 2: Find ALL potential menu page URLs (expanded patterns)
    const allMenuLinks = findAllMenuLinks(mainPage.html, mainPage.finalUrl);
    console.log(`[Menu Scraper] Found ${allMenuLinks.length} menu links:`, allMenuLinks);

    // Step 3: Fetch all menu pages (including main page)
    const pagesToProcess: { html: string; url: string }[] = [];

    // Always include main page as it might have inline menu
    pagesToProcess.push({ html: mainPage.html, url: mainPage.finalUrl });

    if (allMenuLinks.length > 0) {
      // Fetch up to 5 menu pages in parallel
      const menuPagesToFetch = allMenuLinks.slice(0, 5);
      const fetchPromises = menuPagesToFetch.map(async (url) => {
        // Skip if it's the same as main page
        if (url === mainPage.finalUrl) return null;
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
    }

    // Step 4: Extract content from all pages and find the best menu content
    let bestMenuContent = '';
    let menuSourceUrl = mainPage.finalUrl;
    let bestScore = 0;

    for (const page of pagesToProcess) {
      const pageText = extractTextContent(page.html);
      const isMenuUrl = /ruokalista|menu|lounas|speisekarte|meny|carta|food|ravintola/i.test(page.url);
      const priceCount = countPrices(pageText);

      // Score this page's likelihood of being a menu
      let score = priceCount * 10;
      if (isMenuUrl) score += 50;
      if (pageText.length > 500) score += 20;

      console.log(`[Menu Scraper] Page ${page.url}: ${priceCount} prices, score=${score}`);

      if (score > bestScore && pageText.length > 100) {
        bestScore = score;
        bestMenuContent = pageText;
        menuSourceUrl = page.url;
      }
    }

    console.log(`[Menu Scraper] Best page: ${menuSourceUrl}, score: ${bestScore}`);

    // Step 5: If text content is poor, try image extraction
    let imageMenuText = '';
    if (bestScore < 30 || bestMenuContent.length < 200) {
      const allImageUrls = new Set<string>();
      for (const page of pagesToProcess) {
        const images = extractMenuImages(page.html, page.url);
        images.urls.forEach((url) => allImageUrls.add(url));
      }

      const imageUrls = Array.from(allImageUrls);
      console.log(`[Menu Scraper] Text insufficient (score=${bestScore}), found ${imageUrls.length} potential menu images`);

      if (imageUrls.length > 0) {
        console.log(`[Menu Scraper] Processing menu images with AI vision...`);
        imageMenuText = await extractTextFromImages(imageUrls);
      }
    }

    // Step 6: Combine content intelligently
    const imageHasMenu = imageMenuText &&
      !imageMenuText.includes('Not a menu image') &&
      imageMenuText.length > 100;

    // If we have neither good text nor images, fail
    if (bestScore < 10 && !imageHasMenu) {
      console.log(`[Menu Scraper] No menu content found`);
      return {
        success: false,
        menu: null,
        sourceUrl: menuSourceUrl,
        error: 'Could not find menu content on website',
      };
    }

    // Combine content - prefer image content if it's substantial
    let finalContent = bestMenuContent;
    if (imageHasMenu) {
      if (imageMenuText.length > bestMenuContent.length || bestScore < 30) {
        finalContent = imageMenuText;
      } else {
        finalContent = `${bestMenuContent}\n\n--- Additional items from images ---\n${imageMenuText}`;
      }
    }

    // Step 7: Use AI to parse the menu into structured format
    console.log(`[Menu Scraper] Parsing menu with AI (${finalContent.length} chars)...`);
    const sections = await parseMenuWithAI(finalContent);

    const hasStructuredContent = sections.length > 0 && sections.some(s => s.items.length > 0);

    return {
      success: true,
      menu: {
        sections: hasStructuredContent ? sections : [],
        rawText: hasStructuredContent ? undefined : finalContent.substring(0, 15000),
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
 * Use Claude to parse menu text into structured sections
 */
async function parseMenuWithAI(menuText: string): Promise<MenuSection[]> {
  const anthropic = getAnthropicClient();
  if (!anthropic) {
    console.log('[Menu Scraper] No ANTHROPIC_API_KEY, skipping AI parsing');
    return [];
  }

  if (menuText.length < 50) {
    console.log('[Menu Scraper] Menu text too short for AI parsing');
    return [];
  }

  try {
    const truncatedText = menuText.substring(0, 8000);
    console.log(`[Menu Scraper] Calling AI to parse ${truncatedText.length} chars...`);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `Parse this restaurant menu into a structured JSON format. Extract all menu items with their names, descriptions, and prices.

IMPORTANT RULES:
1. Group items into logical sections (Starters, Main Courses, Desserts, Drinks, etc.)
2. Keep original prices exactly as written (€15, 15€, $12.50, etc.)
3. Extract descriptions if available
4. Mark dietary info if mentioned (V=vegetarian, VG=vegan, GF=gluten-free, L=lactose-free)
5. If a section name isn't clear, use a reasonable name like "Menu Items"
6. Output ONLY valid JSON, no other text

Output format:
{"sections":[{"title":"Section Name","items":[{"name":"Item Name","description":"Description if any","price":"€15","dietary":["V","GF"]}]}]}

Menu text to parse:
${truncatedText}`,
        },
      ],
    });

    let responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    console.log(`[Menu Scraper] AI response length: ${responseText.length}`);
    console.log(`[Menu Scraper] AI response preview: ${responseText.substring(0, 300)}...`);

    // Clean up response
    responseText = responseText
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();

    // Extract JSON object
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Menu Scraper] No JSON found in AI response');
      console.error('[Menu Scraper] Full response:', responseText);
      return [];
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (jsonError) {
      console.error('[Menu Scraper] JSON parse error:', jsonError);
      // Try to salvage truncated JSON
      const salvaged = salvageTruncatedJSON(jsonMatch[0]);
      if (salvaged) {
        parsed = salvaged;
        console.log('[Menu Scraper] Successfully salvaged truncated JSON');
      } else {
        console.error('[Menu Scraper] Failed to parse AI JSON response');
        console.error('[Menu Scraper] JSON string:', jsonMatch[0].substring(0, 500));
        return [];
      }
    }

    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      console.error('[Menu Scraper] AI response missing sections array:', Object.keys(parsed));
      return [];
    }

    // Validate and clean sections
    const sections: MenuSection[] = parsed.sections
      .filter((s: unknown) =>
        typeof s === 'object' && s !== null &&
        'title' in s && 'items' in s && Array.isArray((s as {items: unknown}).items)
      )
      .map((s: { title: string; items: Array<{ name: string; description?: string; price?: string; dietary?: string[] }> }) => ({
        title: String(s.title),
        items: s.items
          .filter((item: unknown) =>
            typeof item === 'object' && item !== null &&
            'name' in item && typeof (item as {name: unknown}).name === 'string'
          )
          .map((item: { name: string; description?: string; price?: string; dietary?: string[] }): MenuItem => ({
            name: item.name,
            description: item.description ? String(item.description) : undefined,
            price: item.price ? String(item.price) : undefined,
            dietary: Array.isArray(item.dietary)
              ? item.dietary.filter((d): d is string => typeof d === 'string')
              : undefined,
          }))
      }))
      .filter((s: MenuSection) => s.items.length > 0);

    console.log(`[Menu Scraper] AI parsed ${sections.length} sections with ${sections.reduce((acc, s) => acc + s.items.length, 0)} items`);
    return sections;
  } catch (error) {
    console.error('[Menu Scraper] AI parsing error:', error);
    return [];
  }
}

/**
 * Try to salvage a truncated JSON response
 */
function salvageTruncatedJSON(text: string): { sections: MenuSection[] } | null {
  const strategies = [
    // Strategy 1: Close arrays and objects
    () => {
      const idx = text.lastIndexOf('}]');
      if (idx > 0) return text.substring(0, idx + 2) + ']}';
      return null;
    },
    // Strategy 2: More aggressive closing
    () => {
      const idx = text.lastIndexOf('}');
      if (idx > 0) return text.substring(0, idx + 1) + ']}]}';
      return null;
    },
  ];

  for (const strategy of strategies) {
    const salvaged = strategy();
    if (salvaged) {
      try {
        return JSON.parse(salvaged);
      } catch {
        continue;
      }
    }
  }
  return null;
}

/**
 * Count price patterns in text
 */
function countPrices(text: string): number {
  const patterns = [
    /\d+[.,]\d{2}\s*€/g,
    /€\s*\d+[.,]\d{2}/g,
    /\d+\s*€/g,
    /€\s*\d+/g,
  ];

  let count = 0;
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

/**
 * Extract text from menu images using Claude Vision
 */
async function extractTextFromImages(imageUrls: string[]): Promise<string> {
  const anthropic = getAnthropicClient();
  if (!anthropic || imageUrls.length === 0) {
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
 * Fetch a page with proper headers and timeout
 */
async function fetchPage(url: string): Promise<FetchResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

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
