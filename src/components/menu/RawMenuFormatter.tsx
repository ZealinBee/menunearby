'use client';

interface RawMenuFormatterProps {
  text: string;
}

interface ParsedLine {
  type: 'section' | 'item' | 'description' | 'empty';
  text: string;
  price?: string;
}

// Simple client-side parser to make raw menu text look nice
function parseRawMenuText(text: string): ParsedLine[] {
  const lines = text.split('\n');
  const parsed: ParsedLine[] = [];

  // Price pattern - matches various formats like €15, 15€, $15.00, 15.00€, etc.
  const pricePattern = /([€$£¥]?\s*\d+[.,]?\d*\s*[€$£¥]?)/;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      parsed.push({ type: 'empty', text: '' });
      continue;
    }

    // Check if this looks like a section header (all caps, or ends with colon, or short with no price)
    const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed.length > 2 && /[A-Z]/.test(trimmed);
    const endsWithColon = trimmed.endsWith(':');
    const hasPrice = pricePattern.test(trimmed);
    const isShort = trimmed.length < 25;

    if ((isAllCaps || endsWithColon) && !hasPrice) {
      parsed.push({
        type: 'section',
        text: trimmed.replace(/:$/, '')
      });
      continue;
    }

    // Check if this looks like a menu item (has a price)
    if (hasPrice) {
      const priceMatch = trimmed.match(/([€$£¥]?\s*\d+[.,]?\d*\s*[€$£¥]?)(?:\s*[-–—]?\s*)?$/);
      if (priceMatch) {
        const price = priceMatch[1].trim();
        const name = trimmed.replace(priceMatch[0], '').trim().replace(/[.…]+$/, '').trim();
        parsed.push({
          type: 'item',
          text: name,
          price: price
        });
        continue;
      }

      // Price might be at the start or middle
      const anyPriceMatch = trimmed.match(pricePattern);
      if (anyPriceMatch) {
        const price = anyPriceMatch[1].trim();
        const name = trimmed.replace(price, '').trim().replace(/^[-–—:]\s*/, '').replace(/[-–—:]\s*$/, '').trim();
        if (name) {
          parsed.push({
            type: 'item',
            text: name,
            price: price
          });
          continue;
        }
      }
    }

    // Check if previous line was an item - this might be a description
    const prevLine = parsed[parsed.length - 1];
    if (prevLine?.type === 'item' && trimmed.length > 20 && !isShort) {
      parsed.push({ type: 'description', text: trimmed });
      continue;
    }

    // Default: treat as an item without price if it looks like a dish name
    if (isShort && /^[A-Z]/.test(trimmed)) {
      parsed.push({ type: 'section', text: trimmed });
    } else if (trimmed.length < 60) {
      parsed.push({ type: 'item', text: trimmed });
    } else {
      parsed.push({ type: 'description', text: trimmed });
    }
  }

  return parsed;
}

// Group parsed lines into visual sections
function groupIntoSections(lines: ParsedLine[]): { title: string; items: { name: string; price?: string; description?: string }[] }[] {
  const sections: { title: string; items: { name: string; price?: string; description?: string }[] }[] = [];
  let currentSection: { title: string; items: { name: string; price?: string; description?: string }[] } = {
    title: 'Menu',
    items: []
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.type === 'empty') continue;

    if (line.type === 'section') {
      // Start new section if current has items
      if (currentSection.items.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { title: line.text, items: [] };
      continue;
    }

    if (line.type === 'item') {
      const item: { name: string; price?: string; description?: string } = {
        name: line.text,
        price: line.price
      };

      // Check if next line is a description
      const nextLine = lines[i + 1];
      if (nextLine?.type === 'description') {
        item.description = nextLine.text;
        i++; // Skip the description line
      }

      currentSection.items.push(item);
    } else if (line.type === 'description' && currentSection.items.length > 0) {
      // Append to last item if it doesn't have a description
      const lastItem = currentSection.items[currentSection.items.length - 1];
      if (!lastItem.description) {
        lastItem.description = line.text;
      }
    }
  }

  // Add final section
  if (currentSection.items.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

export function RawMenuFormatter({ text }: RawMenuFormatterProps) {
  const parsed = parseRawMenuText(text);
  const sections = groupIntoSections(parsed);

  // If we couldn't parse anything meaningful, show formatted raw text
  if (sections.length === 0 || sections.every(s => s.items.length === 0)) {
    return (
      <div className="space-y-4">
        {text.split('\n\n').map((paragraph, i) => (
          <p key={i} className="text-cream/80 leading-relaxed">
            {paragraph.split('\n').map((line, j) => (
              <span key={j}>
                {line}
                {j < paragraph.split('\n').length - 1 && <br />}
              </span>
            ))}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div>
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="mb-10 last:mb-0">
          {/* Section header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-[1px] w-8 bg-accent" />
            <h3 className="font-accent text-2xl text-white tracking-wide uppercase">
              {section.title}
            </h3>
            <div className="flex-1 h-[1px] bg-primary-lighter" />
          </div>

          {/* Items */}
          <div className="space-y-1">
            {section.items.map((item, itemIndex) => (
              <div
                key={itemIndex}
                className="group py-4 border-b border-primary-lighter/30 last:border-b-0"
              >
                {/* Item header with name and price */}
                <div className="flex items-baseline gap-2">
                  <h4 className="text-cream font-display text-lg tracking-wide">
                    {item.name}
                  </h4>
                  {/* Dotted leader line */}
                  <div className="flex-1 border-b border-dotted border-cream/20 mb-1.5 min-w-[20px]" />
                  {item.price && (
                    <span className="text-gold font-display text-lg whitespace-nowrap">
                      {item.price}
                    </span>
                  )}
                </div>

                {/* Description */}
                {item.description && (
                  <p className="text-cream/70 text-sm mt-1.5 leading-relaxed font-accent max-w-[90%]">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
