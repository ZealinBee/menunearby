// AI-powered menu formatter using Claude
import Anthropic from '@anthropic-ai/sdk';
import type { MenuContent, MenuSection } from '@/types/menu';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `Parse restaurant menu text into JSON. Output ONLY valid JSON:
{"sections":[{"title":"Section","items":[{"name":"Dish","description":"desc","price":"€15","dietary":["vegan"]}]}]}
Rules: Group by sections, keep original prices, only include dietary if mentioned. If not a menu: {"sections":[]}`;

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
    const startTime = Date.now();
    // Truncate for speed - 6000 chars is enough for most menus
    const truncatedText = rawText.substring(0, 6000);
    console.log(`[Menu AI] Formatting ${truncatedText.length} chars...`);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `Parse menu:\n${truncatedText}`,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    console.log(`[Menu AI] API call: ${Date.now() - startTime}ms`);

    // Extract text response
    let responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Strip markdown code blocks if present
    responseText = responseText
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();

    // Log first part of response for debugging
    console.log(`[Menu AI] Response preview: ${responseText.substring(0, 200)}...`);

    // Try to parse JSON, handling truncated responses
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (jsonError) {
      // Try to salvage truncated JSON
      console.warn('JSON parse failed, attempting to salvage...');

      // Try multiple salvage strategies
      const salvageAttempts = [
        // Strategy 1: Find last complete item }] and close sections
        () => {
          const idx = responseText.lastIndexOf('}]');
          if (idx > 0) return responseText.substring(0, idx + 2) + ']}';
          return null;
        },
        // Strategy 2: Find last complete item } and close arrays
        () => {
          const idx = responseText.lastIndexOf('}');
          if (idx > 0) return responseText.substring(0, idx + 1) + ']}]}';
          return null;
        },
        // Strategy 3: Find last complete section and close
        () => {
          const idx = responseText.lastIndexOf('"items"');
          if (idx > 0) {
            const beforeItems = responseText.substring(0, idx);
            const lastBrace = beforeItems.lastIndexOf('{');
            if (lastBrace > 0) return responseText.substring(0, lastBrace) + ']}';
          }
          return null;
        },
      ];

      for (const attempt of salvageAttempts) {
        const salvaged = attempt();
        if (salvaged) {
          try {
            parsed = JSON.parse(salvaged);
            console.log('Successfully salvaged truncated JSON');
            break;
          } catch {
            // Try next strategy
          }
        }
      }

      if (!parsed) {
        console.error('All salvage attempts failed');
        console.error('[Menu AI] Raw response:', responseText);
        return menu;
      }
    }

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
