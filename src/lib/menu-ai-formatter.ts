// AI-powered menu formatter using Claude
import Anthropic from '@anthropic-ai/sdk';
import type { MenuContent, MenuSection } from '@/types/menu';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a menu parser. Your task is to extract structured menu information from raw text scraped from restaurant websites.

Given raw menu text, extract and organize it into clear sections with menu items. For each item, identify:
- name: The dish name
- description: A brief description (if available)
- price: The price (keep original format with currency symbol)
- dietary: Array of dietary tags like "vegetarian", "vegan", "gluten-free", "lactose-free" (if indicated)

Output ONLY valid JSON in this exact format:
{
  "sections": [
    {
      "title": "Section Name",
      "items": [
        {
          "name": "Dish Name",
          "description": "Description if available",
          "price": "€15.00",
          "dietary": ["vegetarian"]
        }
      ]
    }
  ]
}

Rules:
- Group items into logical sections (Starters, Mains, Desserts, Drinks, etc.)
- If no clear sections exist, create appropriate ones based on the items
- Keep prices in their original format
- Only include dietary tags if explicitly mentioned
- Clean up messy text but preserve the meaning
- If text is not a menu or is unreadable, return {"sections": []}
- Output ONLY the JSON, no markdown code blocks or explanations`;

export async function formatMenuWithAI(menu: MenuContent): Promise<MenuContent> {
  // Skip if no API key configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('Anthropic API key not configured, returning original menu');
    return menu;
  }

  // Get raw text - either from rawText field or reconstruct from sections
  let rawText = menu.rawText;
  if (!rawText && menu.sections.length > 0) {
    // Reconstruct text from sections for AI to reformat
    rawText = menu.sections
      .map((section) => {
        const items = section.items
          .map((item) => `${item.name}${item.price ? ` ${item.price}` : ''}${item.description ? ` - ${item.description}` : ''}`)
          .join('\n');
        return `${section.title}\n${items}`;
      })
      .join('\n\n');
  }

  // Skip if text is too short to be a menu
  if (!rawText || rawText.length < 50) {
    return menu;
  }

  try {
    // Truncate very long text to avoid token limits
    const truncatedText = rawText.substring(0, 8000);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Parse this restaurant menu text into structured JSON format:\n\n${truncatedText}`,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    // Extract text response
    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Parse JSON response
    const parsed = JSON.parse(responseText);

    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      return menu;
    }

    // Validate and clean up sections
    interface RawSection {
      title: string;
      items: unknown[];
    }
    interface RawItem {
      name: string;
      description?: string;
      price?: string;
      dietary?: unknown[];
    }

    const sections: MenuSection[] = parsed.sections
      .filter(
        (section: unknown): section is RawSection =>
          typeof section === 'object' &&
          section !== null &&
          'title' in section &&
          typeof (section as { title: unknown }).title === 'string' &&
          'items' in section &&
          Array.isArray((section as { items: unknown }).items)
      )
      .map((section: RawSection) => ({
        title: section.title,
        items: section.items
          .filter(
            (item: unknown): item is RawItem =>
              typeof item === 'object' &&
              item !== null &&
              'name' in item &&
              typeof (item as { name: unknown }).name === 'string'
          )
          .map((item: RawItem) => ({
            name: item.name,
            description: typeof item.description === 'string' ? item.description : undefined,
            price: typeof item.price === 'string' ? item.price : undefined,
            dietary: Array.isArray(item.dietary)
              ? (item.dietary.filter((d): d is string => typeof d === 'string') as string[])
              : undefined,
          })),
      }))
      .filter((section: MenuSection) => section.items.length > 0);

    if (sections.length > 0) {
      return {
        sections,
        scrapedAt: menu.scrapedAt,
        // Clear rawText since we have structured data
      };
    }

    // AI couldn't parse it, return original
    return menu;
  } catch (error) {
    console.error('AI menu formatting error:', error);
    // Return original menu on error
    return menu;
  }
}
