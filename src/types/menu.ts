// Menu types for scraped restaurant menus

export interface MenuItem {
  name: string;
  description?: string;
  price?: string;
  dietary?: string[]; // e.g., ['vegetarian', 'gluten-free']
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export interface MenuContent {
  sections: MenuSection[];
  rawText?: string; // Fallback when structured parsing fails
  scrapedAt: string;
}

export interface MenuScrapeResponse {
  success: boolean;
  menu: MenuContent | null;
  sourceUrl: string | null;
  cached: boolean;
  error?: string;
  errorCode?: MenuErrorCode;
}

export type MenuErrorCode =
  | 'NO_WEBSITE'
  | 'WEBSITE_UNREACHABLE'
  | 'MENU_NOT_FOUND'
  | 'SCRAPE_FAILED'
  | 'TIMEOUT';
