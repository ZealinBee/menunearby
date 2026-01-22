'use client';

interface MenuToggleProps {
  activeView: 'details' | 'menu';
  onToggle: (view: 'details' | 'menu') => void;
}

export function MenuToggle({ activeView, onToggle }: MenuToggleProps) {
  return (
    <div className="flex gap-0 border-b border-primary-lighter mb-6">
      <button
        onClick={() => onToggle('details')}
        className={`px-6 py-3 text-sm font-medium transition-colors relative ${
          activeView === 'details'
            ? 'text-cream'
            : 'text-cream/60 hover:text-cream/80'
        }`}
      >
        Details
        {activeView === 'details' && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
        )}
      </button>
      <button
        onClick={() => onToggle('menu')}
        className={`px-6 py-3 text-sm font-medium transition-colors relative ${
          activeView === 'menu'
            ? 'text-cream'
            : 'text-cream/60 hover:text-cream/80'
        }`}
      >
        Menu
        {activeView === 'menu' && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
        )}
      </button>
    </div>
  );
}
