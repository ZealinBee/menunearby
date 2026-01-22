# MenuNearby Design Specification

## Brand Identity
A high-class, sophisticated restaurant discovery platform with sharp, editorial aesthetics.

---

## Color Palette

### Primary Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#111A1B` | Main background, text, primary surfaces |
| `--color-accent` | `#DE5905` | CTAs, highlights, interactive elements |

### Extended Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary-light` | `#1E2A2B` | Elevated surfaces, cards |
| `--color-primary-lighter` | `#2C3E3F` | Borders, dividers |
| `--color-accent-light` | `#F26A1B` | Hover states |
| `--color-accent-dark` | `#B84A04` | Active/pressed states |
| `--color-cream` | `#F5F2ED` | Light mode backgrounds, contrast text |
| `--color-gold` | `#C9A227` | Premium/featured indicators |
| `--color-white` | `#FFFFFF` | Text on dark, high contrast elements |

---

## Typography

### Font Families
- **Display/Headings**: `Playfair Display` — High-contrast serif with sharp, elegant strokes
- **Body**: `Cormorant Garamond` — Refined serif for sophisticated readability
- **Accent/UI**: `Libre Franklin` — Clean sans-serif for navigation, labels, buttons

### Type Scale
```
--text-display:  4rem / 64px   — Hero titles
--text-h1:       3rem / 48px   — Page titles
--text-h2:       2.25rem / 36px — Section headers
--text-h3:       1.75rem / 28px — Card titles
--text-h4:       1.25rem / 20px — Subheadings
--text-body:     1rem / 16px   — Body copy
--text-body-lg:  1.125rem / 18px — Lead paragraphs
--text-small:    0.875rem / 14px — Captions, metadata
--text-xs:       0.75rem / 12px  — Labels, tags
```

### Font Weights
- Light: 300
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

### Letter Spacing
- Headings: `0.02em` (slightly expanded for elegance)
- Body: `0.01em`
- All caps/labels: `0.1em` (wide tracking)

---

## Spacing System

Using an 8px base grid:
```
--space-1:  0.25rem / 4px
--space-2:  0.5rem / 8px
--space-3:  0.75rem / 12px
--space-4:  1rem / 16px
--space-5:  1.5rem / 24px
--space-6:  2rem / 32px
--space-8:  3rem / 48px
--space-10: 4rem / 64px
--space-12: 6rem / 96px
--space-16: 8rem / 128px
```

---

## Border & Radius

### Border Radius
**ALL ELEMENTS: `0` — No border radius anywhere.**

Sharp corners are mandatory for the high-class, editorial aesthetic.

### Border Widths
```
--border-thin:   1px
--border-medium: 2px
--border-thick:  4px
```

### Border Colors
- Default: `var(--color-primary-lighter)`
- Accent: `var(--color-accent)`
- Subtle: `rgba(255, 255, 255, 0.1)`

---

## Shadows & Depth

Minimal, sharp shadows only:
```
--shadow-sm:  0 2px 4px rgba(17, 26, 27, 0.1)
--shadow-md:  0 4px 12px rgba(17, 26, 27, 0.15)
--shadow-lg:  0 8px 24px rgba(17, 26, 27, 0.2)
--shadow-xl:  0 16px 48px rgba(17, 26, 27, 0.25)
```

---

## Imagery Guidelines

### Background Images
- **Opacity**: 5-15% opacity for atmospheric effect
- **Style**: High-quality food photography, architectural details, textures
- **Treatment**: Desaturated or duotone with primary/accent colors
- **Position**: Fixed or parallax for depth

### Content Images
- **Aspect Ratios**: 16:9, 4:3, 1:1 (strict, no arbitrary crops)
- **Borders**: None or 1px solid accent
- **Hover**: Subtle scale (1.02) with no easing curves

---

## Icons

### Library: Lucide Icons (lucide-react)
Selected for sharp, geometric aesthetics without soft/rounded modern styling.

### Icon Sizes
```
--icon-xs:  14px
--icon-sm:  16px
--icon-md:  20px
--icon-lg:  24px
--icon-xl:  32px
```

### Icon Style Guidelines
- Stroke width: 1.5px - 2px (sharp, not chunky)
- No filled variants by default
- Accent color for interactive icons
- Primary color for decorative icons

---

## Component Patterns

### Buttons
```css
.btn-primary {
  background: var(--color-accent);
  color: var(--color-white);
  padding: var(--space-3) var(--space-6);
  border: none;
  border-radius: 0;
  font-family: var(--font-accent);
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.btn-secondary {
  background: transparent;
  color: var(--color-accent);
  border: var(--border-medium) solid var(--color-accent);
  border-radius: 0;
}
```

### Cards
```css
.card {
  background: var(--color-primary-light);
  border: var(--border-thin) solid var(--color-primary-lighter);
  border-radius: 0;
  padding: var(--space-6);
}
```

### Inputs
```css
.input {
  background: transparent;
  border: var(--border-thin) solid var(--color-primary-lighter);
  border-radius: 0;
  color: var(--color-white);
  padding: var(--space-3) var(--space-4);
}

.input:focus {
  border-color: var(--color-accent);
  outline: none;
}
```

---

## Animation & Motion

Minimal, refined motion:
```
--transition-fast:   150ms ease-out
--transition-base:   250ms ease-out
--transition-slow:   400ms ease-out
```

### Principles
- No bouncy or playful animations
- Subtle opacity/transform transitions
- Prefer `ease-out` over `ease-in-out`
- Reserved use — motion should feel intentional

---

## Responsive Breakpoints

```
--breakpoint-sm:  640px
--breakpoint-md:  768px
--breakpoint-lg:  1024px
--breakpoint-xl:  1280px
--breakpoint-2xl: 1536px
```

---

## Accessibility

- Minimum contrast ratio: 4.5:1 for body text
- Focus states: 2px solid accent outline with 2px offset
- Interactive targets: Minimum 44x44px touch area
- Reduced motion: Respect `prefers-reduced-motion`

---

## Do's and Don'ts

### Do
- Use sharp 90° corners everywhere
- Maintain generous whitespace
- Use uppercase sparingly for labels and CTAs
- Layer low-opacity imagery for depth
- Keep typography hierarchy clear

### Don't
- Round any corners
- Use playful or bouncy animations
- Overcrowd layouts
- Use bright, saturated accent colors beyond #DE5905
- Mix too many typefaces
