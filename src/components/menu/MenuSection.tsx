'use client';

import type { MenuSection as MenuSectionType, MenuItem } from '@/types/menu';

interface MenuSectionProps {
  section: MenuSectionType;
}

function MenuItemCard({ item }: { item: MenuItem }) {
  return (
    <div className="py-3 border-b border-primary-lighter/50 last:border-b-0">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="text-cream font-medium">{item.name}</h4>
          {item.description && (
            <p className="text-cream/60 text-sm mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
          {item.dietary && item.dietary.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.dietary.map((diet) => (
                <span
                  key={diet}
                  className="text-xs px-2 py-0.5 bg-primary-lighter text-cream/70"
                >
                  {diet}
                </span>
              ))}
            </div>
          )}
        </div>
        {item.price && (
          <span className="text-accent font-medium whitespace-nowrap">
            {item.price}
          </span>
        )}
      </div>
    </div>
  );
}

export function MenuSection({ section }: MenuSectionProps) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-cream mb-3 pb-2 border-b border-accent/30">
        {section.title}
      </h3>
      <div>
        {section.items.map((item, index) => (
          <MenuItemCard key={`${item.name}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
}
