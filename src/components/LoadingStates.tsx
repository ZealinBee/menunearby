'use client';

export function RestaurantCardSkeleton() {
  return (
    <div className="card animate-pulse">
      {/* Image skeleton */}
      <div className="h-40 sm:h-48 -mx-6 -mt-6 mb-4 bg-[var(--color-primary-lighter)]" />

      {/* Content skeleton */}
      <div className="space-y-3">
        <div>
          <div className="h-3 w-20 bg-[var(--color-primary-lighter)] mb-2" />
          <div className="h-5 w-3/4 bg-[var(--color-primary-lighter)]" />
        </div>

        <div className="flex items-center justify-between">
          <div className="h-4 w-16 bg-[var(--color-primary-lighter)]" />
          <div className="h-4 w-10 bg-[var(--color-primary-lighter)]" />
        </div>

        <div className="h-10 w-full bg-[var(--color-primary-lighter)] mt-4" />
      </div>
    </div>
  );
}

export function RestaurantListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <RestaurantCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="text-center py-12 sm:py-16">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--color-primary-lighter)] flex items-center justify-center">
        <svg
          className="w-8 h-8 text-[var(--color-accent)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <h3 className="text-lg text-[var(--color-white)] mb-2">Unable to load restaurants</h3>
      <p className="text-[var(--color-cream)] opacity-60 mb-6 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-secondary">
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="text-center py-12 sm:py-16">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--color-primary-lighter)] flex items-center justify-center">
        <svg
          className="w-8 h-8 text-[var(--color-cream)] opacity-60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      </div>
      <h3 className="text-lg text-[var(--color-white)] mb-2">No restaurants found</h3>
      <p className="text-[var(--color-cream)] opacity-60 max-w-md mx-auto">
        We couldn&apos;t find any restaurants in this area. Try searching in a different location.
      </p>
    </div>
  );
}
