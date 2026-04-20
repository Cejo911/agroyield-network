import Image from 'next/image'
import type { ReactNode } from 'react'

// Design primitive — the canonical way to render a business logo anywhere in
// the Tailwind-themed app surface. Solves three recurring failure modes that
// plagued ad-hoc implementations:
//
//   1. Non-square logos escaping a rounded corner, because `rounded-*` was
//      applied to a Next <Image> element rather than an overflow-hidden box.
//   2. Avatars compressing from square to rectangle inside flex rows when the
//      sibling text was long — no `shrink-0` on the avatar wrapper.
//   3. Divergent fallback styles for "no logo uploaded yet" across call sites.
//
// Implementation: a fixed-size `overflow-hidden` wrapper owns the box, the
// corners, the border, and the flex-shrink behaviour. The <Image> inside
// simply fills the wrapper with `object-contain`. There is no way to misuse
// this — if a component renders business logos, it imports this primitive
// and picks a size.
//
// Out of scope: app/home-client.tsx uses the shared CSS-var marketing theme
// (--border-color, --text-primary…) that also powers /login, /about, /privacy.
// Its logo tile is self-contained in that theme and is intentionally not
// migrated — doing so would leak Tailwind classes into the marketing surface.
//
// See ROADMAP scratchpad #62: "overflow-hidden wrapper is non-negotiable for
// avatars. Build the primitive on day zero whenever ≥2 sizes are implied."

type Size = 'sm' | 'md' | 'lg' | 'xl'

type FallbackTone = 'subtle' | 'strong'

// Pixel values double as the Next <Image> `width`/`height` props (important
// for the image optimizer to pick the right responsive size) and as the
// rendered box dimensions via the Tailwind w-*/h-* classes.
const SIZE: Record<Size, { box: string; radius: string; text: string; pixels: number }> = {
  sm: { box: 'w-10 h-10', radius: 'rounded-lg', text: 'text-lg',  pixels: 40 }, // dashboard header
  md: { box: 'w-14 h-14', radius: 'rounded-xl', text: 'text-lg',  pixels: 56 }, // directory card
  lg: { box: 'w-20 h-20', radius: 'rounded-lg', text: 'text-3xl', pixels: 80 }, // setup form preview
  xl: { box: 'w-24 h-24', radius: 'rounded-xl', text: 'text-2xl', pixels: 96 }, // public business page hero
}

// Two fallback tones because two contexts need different contrast:
//   - 'subtle' (default)  → green-100 tint, dark-mode aware. Used when the
//                           logo sits on a plain page surface (dashboard).
//   - 'strong'            → solid green-600, white text. Used when the avatar
//                           is half-overlapping a cover image and needs to
//                           punch through visually (directory cards, public
//                           business page).
const FALLBACK_TONE: Record<FallbackTone, string> = {
  subtle: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  strong: 'bg-green-600 text-white',
}

interface BusinessLogoProps {
  /** Supabase-hosted logo URL, or null/empty to render the fallback. */
  src?: string | null
  /** Business name — used for alt text and the default initial-letter fallback. */
  name: string
  /** Visual size. Defaults to `sm` (40×40). */
  size?: Size
  /** Style of the no-logo fallback when no custom slot is supplied. */
  fallbackTone?: FallbackTone
  /**
   * Override the default single-letter fallback content. Pass 2-char company
   * initials (e.g. `"AS"` for "Acme Solutions") when the site already
   * computes them. Ignored when `fallback` is provided.
   */
  label?: string
  /**
   * Custom fallback content — completely overrides both the default
   * initial-letter treatment and the tone styling. Used by the setup form
   * to render a dashed-border "Upload me" affordance instead of a letter.
   */
  fallback?: ReactNode
  /**
   * Extra classes merged onto the wrapper. Use for shadows (`shadow-sm`,
   * `shadow`), explicit dark-mode borders, or spacing tweaks unique to a
   * call site.
   */
  className?: string
  /** Pass-through to the underlying Next <Image> — set true for above-the-fold logos. */
  priority?: boolean
}

export default function BusinessLogo({
  src,
  name,
  size = 'sm',
  fallbackTone = 'subtle',
  label,
  fallback,
  className = '',
  priority = false,
}: BusinessLogoProps) {
  const { box, radius, text, pixels } = SIZE[size]
  const boxBase = `${box} ${radius} shrink-0 ${className}`.trim()

  // Case 1: logo URL present — render the Next <Image> inside an
  // overflow-hidden wrapper. The wrapper owns the box; the image fills it.
  if (src) {
    return (
      <div
        className={`${boxBase} overflow-hidden border border-gray-200 dark:border-gray-700 bg-white`}
      >
        <Image
          src={src}
          alt={`${name} logo`}
          width={pixels}
          height={pixels}
          priority={priority}
          className="w-full h-full object-contain"
        />
      </div>
    )
  }

  // Case 2: caller provides a custom fallback slot (e.g. setup form's
  // dashed-border upload placeholder).
  if (fallback !== undefined) {
    return <div className={boxBase}>{fallback}</div>
  }

  // Case 3: default fallback — tone-styled tile containing either the
  // caller-supplied `label` (typically 2-char initials) or the first letter
  // of the business name.
  const content = label ?? (name?.trim()[0] || 'B').toUpperCase()
  return (
    <div
      className={`${boxBase} ${FALLBACK_TONE[fallbackTone]} flex items-center justify-center font-bold ${text}`}
      aria-label={`${name} logo placeholder`}
    >
      {content}
    </div>
  )
}
