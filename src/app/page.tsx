import { MapPin, Clock, Star, ChevronRight, Search, Utensils, Wine, Flame } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--color-primary)]">
      {/* Hero Section with Background Image Overlay */}
      <section
        className="relative min-h-[80vh] flex items-center justify-center"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-[var(--color-primary)] opacity-90" />

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-8 text-center">
          <span className="text-label text-[var(--color-accent)] mb-4 block">
            Mood to eat out?
          </span>
          <h1 className="text-display text-[var(--color-white)] mb-6">
            Find Nearby Restaurants & Their Menus
          </h1>
          <p className="text-[var(--text-body-lg)] text-[var(--color-cream)] opacity-80 max-w-2xl mx-auto mb-10">
            Discover what&apos;s cooking around you. Browse menus, check prices, and pick your next meal.
          </p>

          {/* Search Bar */}
          <div className="flex items-center bg-[var(--color-primary-light)] border border-[var(--color-primary-lighter)] max-w-xl mx-auto">
            <div className="flex items-center gap-3 px-5 py-4 flex-1">
              <Search className="w-5 h-5 text-[var(--color-primary-lighter)]" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search by cuisine, restaurant, or location..."
                className="bg-transparent border-none outline-none text-[var(--color-cream)] placeholder:text-[var(--color-primary-lighter)] w-full"
              />
            </div>
            <button className="btn btn-primary h-full px-8 py-4">
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Accent Divider */}
      <div className="divider-accent mx-auto my-16" />

      {/* Categories Section */}
      <section className="max-w-6xl mx-auto px-8 py-16">
        <h2 className="text-center mb-12">Explore by Category</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Utensils, title: "Fine Dining", count: "124 venues" },
            { icon: Wine, title: "Wine Bars", count: "89 venues" },
            { icon: Flame, title: "Chef's Table", count: "47 venues" },
          ].map((category, index) => (
            <div
              key={index}
              className="card group cursor-pointer transition-all duration-[var(--transition-base)] hover:border-[var(--color-accent)]"
            >
              <category.icon
                className="w-8 h-8 text-[var(--color-accent)] mb-4"
                strokeWidth={1.5}
              />
              <h3 className="mb-2">{category.title}</h3>
              <p className="text-[var(--color-cream)] opacity-60 text-sm">{category.count}</p>
              <ChevronRight
                className="w-5 h-5 text-[var(--color-accent)] mt-4 opacity-0 group-hover:opacity-100 transition-opacity"
                strokeWidth={1.5}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Featured Restaurants */}
      <section
        className="py-24 relative"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-[var(--color-primary)] opacity-95" />

        <div className="relative z-10 max-w-6xl mx-auto px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-label text-[var(--color-accent)] mb-2 block">Featured</span>
              <h2>Exceptional Establishments</h2>
            </div>
            <a href="#" className="btn btn-secondary">
              View All
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                name: "Le Jardin Noir",
                cuisine: "French Contemporary",
                rating: "4.9",
                time: "45 min",
                distance: "2.3 km",
                image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&q=80"
              },
              {
                name: "Ember & Oak",
                cuisine: "Modern American",
                rating: "4.8",
                time: "30 min",
                distance: "1.8 km",
                image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80"
              },
            ].map((restaurant, index) => (
              <div key={index} className="group cursor-pointer">
                <div
                  className="h-64 mb-6 overflow-hidden relative"
                  style={{
                    backgroundImage: `url("${restaurant.image}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="absolute inset-0 bg-[var(--color-primary)] opacity-20 group-hover:opacity-10 transition-opacity" />
                  <div className="absolute top-4 right-4 bg-[var(--color-primary)] px-3 py-1 flex items-center gap-1">
                    <Star className="w-4 h-4 text-[var(--color-gold)] fill-[var(--color-gold)]" strokeWidth={1.5} />
                    <span className="text-[var(--color-white)] text-sm font-medium">{restaurant.rating}</span>
                  </div>
                </div>

                <span className="text-label text-[var(--color-accent)]">{restaurant.cuisine}</span>
                <h3 className="mt-2 mb-4 group-hover:text-[var(--color-accent)] transition-colors">
                  {restaurant.name}
                </h3>

                <div className="flex items-center gap-6 text-sm text-[var(--color-cream)] opacity-60">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" strokeWidth={1.5} />
                    {restaurant.distance}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" strokeWidth={1.5} />
                    {restaurant.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Design System Showcase */}
      <section className="max-w-6xl mx-auto px-8 py-24">
        <div className="text-center mb-16">
          <span className="text-label text-[var(--color-accent)] mb-2 block">Design System</span>
          <h2>Typography & Components</h2>
        </div>

        {/* Typography */}
        <div className="mb-16">
          <h4 className="text-[var(--color-accent)] mb-6">Typography Scale</h4>
          <div className="space-y-4 border-l-2 border-[var(--color-primary-lighter)] pl-8">
            <p className="text-display">Display Text</p>
            <h1>Heading One</h1>
            <h2>Heading Two</h2>
            <h3>Heading Three</h3>
            <h4>Heading Four</h4>
            <p className="text-[var(--text-body-lg)]">Lead paragraph text with larger sizing for emphasis.</p>
            <p>Standard body text for general content and descriptions.</p>
            <p className="text-[var(--text-small)] opacity-60">Small text for captions and metadata</p>
            <p className="text-label">LABEL TEXT WITH WIDE TRACKING</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="mb-16">
          <h4 className="text-[var(--color-accent)] mb-6">Button Variants</h4>
          <div className="flex flex-wrap gap-4">
            <button className="btn btn-primary">Primary Button</button>
            <button className="btn btn-secondary">Secondary Button</button>
            <button className="btn btn-ghost">Ghost Button</button>
          </div>
        </div>

        {/* Colors */}
        <div className="mb-16">
          <h4 className="text-[var(--color-accent)] mb-6">Color Palette</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: "Primary", color: "#111A1B" },
              { name: "Primary Light", color: "#1E2A2B" },
              { name: "Primary Lighter", color: "#2C3E3F" },
              { name: "Accent", color: "#DE5905" },
              { name: "Cream", color: "#F5F2ED" },
            ].map((swatch, index) => (
              <div key={index}>
                <div
                  className="h-20 border border-[var(--color-primary-lighter)]"
                  style={{ backgroundColor: swatch.color }}
                />
                <p className="text-sm mt-2">{swatch.name}</p>
                <p className="text-xs opacity-60">{swatch.color}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Icons */}
        <div>
          <h4 className="text-[var(--color-accent)] mb-6">Lucide Icons</h4>
          <div className="flex flex-wrap gap-8">
            {[MapPin, Clock, Star, Search, Utensils, Wine, Flame, ChevronRight].map((Icon, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <Icon className="w-6 h-6 text-[var(--color-cream)]" strokeWidth={1.5} />
                <span className="text-xs opacity-60">{Icon.name}</span>
              </div>
            ))}
          </div>
          <p className="text-sm opacity-60 mt-4">
            Lucide icons with 1.5px stroke weight for a sharp, refined aesthetic.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-primary-lighter)] py-12">
        <div className="max-w-6xl mx-auto px-8 text-center">
          <p className="text-[var(--color-cream)] opacity-40 text-sm">
            MenuNearby — Exceptional Dining Experiences
          </p>
        </div>
      </footer>
    </div>
  );
}
