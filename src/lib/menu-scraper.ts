// Menu scraper for extracting menu content from restaurant websites

import { MenuContent, MenuSection, MenuItem } from '@/types/menu';

// URL patterns that likely indicate menu pages
const MENU_URL_PATTERNS = [
  /\/menu/i,
  /\/food/i,
  /\/ruokalista/i, // Finnish: menu
  /\/lounas/i, // Finnish: lunch
  /\/speisekarte/i, // German
  /\/meny/i, // Swedish
  /\/carta/i, // Spanish
  /\/dishes/i,
  /\/our-food/i,
];

// Link text patterns that indicate menu links
const MENU_LINK_TEXT_PATTERNS = [
  /^menu$/i,
  /our menu/i,
  /food menu/i,
  /see menu/i,
  /view menu/i,
  /ruokalista/i, // Finnish
  /lounaslista/i, // Finnish: lunch list
  /a la carte/i,
  /dinner menu/i,
  /lunch menu/i,
];

// Price patterns for different currencies
const PRICE_PATTERNS = [
  /(\d+[.,]\d{2})\s*(?:EUR|€|euro)/gi,
  /(?:EUR|€)\s*(\d+[.,]\d{2})/gi,
  /(\d+)\s*(?:EUR|€)/gi,
  /€\s*(\d+)/gi,
  /(\d+[.,]\d{2})\s*(?:\$|USD)/gi,
  /(\$)\s*(\d+[.,]\d{2})/gi,
];

// Section header patterns
const SECTION_HEADER_PATTERNS = [
  /^(starters?|appetizers?|alkuruoat|förrätter)/i,
  /^(main courses?|mains?|entrees?|pääruoat|huvudrätter)/i,
  /^(desserts?|jälkiruoat|efterrätter)/i,
  /^(drinks?|beverages?|juomat|drycker)/i,
  /^(salads?|salaatit)/i,
  /^(soups?|keitot)/i,
  /^(pasta|pizza)/i,
  /^(burgers?|hampurilaiset)/i,
  /^(sides?|lisäkkeet)/i,
  /^(lunch|lounas)/i,
  /^(dinner|illallinen)/i,
  /^(specials?|erikoisuudet)/i,
];

// Dietary indicator patterns
const DIETARY_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(vegan|vegaani)\b/i, label: 'vegan' },
  { pattern: /\b(vegetarian|kasvis|veg)\b/i, label: 'vegetarian' },
  { pattern: /\b(gluten[- ]?free|gluteeniton|gf)\b/i, label: 'gluten-free' },
  { pattern: /\b(lactose[- ]?free|laktoositon|lf)\b/i, label: 'lactose-free' },
  { pattern: /\b(dairy[- ]?free)\b/i, label: 'dairy-free' },
  { pattern: /\b(nut[- ]?free)\b/i, label: 'nut-free' },
];

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

/**
 * Main entry point for scraping a restaurant menu
 */
export async function scrapeMenu(websiteUrl: string): Promise<ScrapeResult> {
  try {
    // Step 1: Fetch the main website
    const mainPage = await fetchPage(websiteUrl);
    if (!mainPage) {
      return {
        success: false,
        menu: null,
        sourceUrl: null,
        error: 'Could not reach restaurant website',
      };
    }

    // Step 2: Try to find a menu link on the page
    const menuUrl = findMenuLink(mainPage.html, mainPage.finalUrl);

    // Step 3: If we found a menu link, fetch that page
    let menuHtml = mainPage.html;
    let menuSourceUrl = mainPage.finalUrl;

    if (menuUrl && menuUrl !== mainPage.finalUrl) {
      const menuPage = await fetchPage(menuUrl);
      if (menuPage) {
        menuHtml = menuPage.html;
        menuSourceUrl = menuPage.finalUrl;
      }
    }

    // Step 4: Extract menu content from the HTML
    const menuContent = extractMenuContent(menuHtml);

    if (!menuContent || (menuContent.sections.length === 0 && !menuContent.rawText)) {
      return {
        success: false,
        menu: null,
        sourceUrl: menuSourceUrl,
        error: 'Could not find menu content on website',
      };
    }

    return {
      success: true,
      menu: menuContent,
      sourceUrl: menuSourceUrl,
    };
  } catch (error) {
    console.error('Menu scraping error:', error);
    return {
      success: false,
      menu: null,
      sourceUrl: null,
      error: error instanceof Error ? error.message : 'Scraping failed',
    };
  }
}

/**
 * Fetch a page with proper headers and timeout
 */
async function fetchPage(url: string): Promise<FetchResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MenuNearby/1.0 (Restaurant Menu Aggregator)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,fi;q=0.8',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
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
    console.error('Fetch error:', error);
    return null;
  }
}

/**
 * Find a menu link in the HTML
 */
function findMenuLink(html: string, baseUrl: string): string | null {
  // Simple regex-based link extraction (works without DOM parser)
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  const matches: { url: string; text: string }[] = [];

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    matches.push({
      url: match[1],
      text: match[2].trim(),
    });
  }

  // First, check URL patterns
  for (const link of matches) {
    for (const pattern of MENU_URL_PATTERNS) {
      if (pattern.test(link.url)) {
        return resolveUrl(link.url, baseUrl);
      }
    }
  }

  // Then, check link text
  for (const link of matches) {
    for (const pattern of MENU_LINK_TEXT_PATTERNS) {
      if (pattern.test(link.text)) {
        return resolveUrl(link.url, baseUrl);
      }
    }
  }

  return null;
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

/**
 * Extract menu content from HTML
 */
function extractMenuContent(html: string): MenuContent | null {
  // Remove script and style tags
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

  // Check if this looks like a menu (has prices)
  const hasMenuContent = PRICE_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0; // Reset regex
    return pattern.test(textContent);
  });

  if (!hasMenuContent) {
    return null;
  }

  // Try to parse into structured sections
  const sections = parseMenuSections(textContent);

  return {
    sections,
    // Always include rawText so AI can reformat if needed
    rawText: textContent.substring(0, 8000),
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Parse text content into menu sections
 */
function parseMenuSections(text: string): MenuSection[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const sections: MenuSection[] = [];
  let currentSection: MenuSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line is a section header
    const isHeader = SECTION_HEADER_PATTERNS.some((pattern) => pattern.test(line));

    if (isHeader) {
      if (currentSection && currentSection.items.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        title: capitalizeFirst(line),
        items: [],
      };
      continue;
    }

    // Try to parse as a menu item (line with a price)
    const menuItem = parseMenuItem(line, lines[i + 1]);
    if (menuItem) {
      if (!currentSection) {
        currentSection = {
          title: 'Menu',
          items: [],
        };
      }
      currentSection.items.push(menuItem);

      // Skip description line if we used it
      if (menuItem.description && lines[i + 1] && !hasPrice(lines[i + 1])) {
        i++;
      }
    }
  }

  // Don't forget the last section
  if (currentSection && currentSection.items.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Parse a single menu item from a line
 */
function parseMenuItem(line: string, nextLine?: string): MenuItem | null {
  // Check if line has a price
  if (!hasPrice(line)) {
    return null;
  }

  // Extract price
  let price: string | undefined;
  let name = line;

  for (const pattern of PRICE_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(line);
    if (match) {
      price = match[0];
      name = line.replace(pattern, '').trim();
      break;
    }
  }

  if (!name || name.length < 2) {
    return null;
  }

  // Clean up name (remove dots, dashes used as separators)
  name = name.replace(/\.{2,}/g, '').replace(/-{2,}/g, '').trim();

  // Extract dietary indicators
  const dietary: string[] = [];
  for (const { pattern, label } of DIETARY_PATTERNS) {
    if (pattern.test(name)) {
      dietary.push(label);
      name = name.replace(pattern, '').trim();
    }
  }

  // Check if next line could be a description
  let description: string | undefined;
  if (nextLine && !hasPrice(nextLine) && nextLine.length > 10 && nextLine.length < 200) {
    // Next line is likely a description
    description = nextLine;
  }

  return {
    name: capitalizeFirst(name),
    description,
    price,
    dietary: dietary.length > 0 ? dietary : undefined,
  };
}

/**
 * Check if a string contains a price
 */
function hasPrice(text: string): boolean {
  return PRICE_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

/**
 * Capitalize first letter of a string
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
