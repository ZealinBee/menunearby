'use client';

import type { MenuSection as MenuSectionType, MenuItem } from '@/types/menu';

interface MenuSectionProps {
  section: MenuSectionType;
}

function MenuItemCard({ item }: { item: MenuItem }) {
  return (
    <div className="group py-4 border-b border-primary-lighter/30 last:border-b-0">
      {/* Item header with name and price */}
      <div className="flex items-baseline gap-2">
        <h4 className="text-cream font-display text-lg tracking-wide">
          {item.name}
        </h4>
        {/* Dotted leader line - classic menu style */}
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

      {/* Dietary tags */}
      {item.dietary && item.dietary.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {item.dietary.map((diet) => (
            <span
              key={diet}
              className="text-xs font-accent uppercase tracking-wider px-2 py-0.5 border border-accent/40 text-accent/80"
            >
              {diet}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function MenuSection({ section }: MenuSectionProps) {
  return (
    <div className="mb-10">
      {/* Section header with decorative elements */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-[1px] w-8 bg-accent" />
        <h3 className="font-accent text-2xl text-white tracking-wide uppercase">
          {section.title}
        </h3>
        <div className="flex-1 h-[1px] bg-primary-lighter" />
      </div>

      {/* Menu items */}
      <div className="space-y-1">
        {section.items.map((item, index) => (
          <MenuItemCard key={`${item.name}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
}
