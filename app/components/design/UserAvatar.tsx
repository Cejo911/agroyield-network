import Image from 'next/image'
import type { ReactNode } from 'react'

// Design primitive — the canonical way to render a user/profile avatar
// anywhere in the Tailwind-themed app surface. Mirrors the structure of
// `BusinessLogo` and solves three recurring failure modes that plagued
// the ad-hoc `<Image src={profile.avatar_url}>` + coloured-letter-disc
// implementations scattered across feed, marketplace, prices, research,
// directory and messaging surfaces:
//
//   1. Sizing drift between call sites — the same logical "card author
//      rail" avatar rendered as `w-10 h-10` in one file, `w-11 h-11` in
//      another, `w-12 h-12` in a third. The discriminated `size` prop
//      replaces every hand-rolled width/height combo with four named
//      slots (sm/md/lg/xl) wired to the sizing table below.
//   2. Divergent fallback styling — image-loaded avatars rendered with a
//      light border on a white tile while the no-avatar fallback was a
//      solid-green-circle-with-white-letter, so a card row with a mix of
//      profile-photo users and initials users looked visually
//      inconsistent. This primitive owns the fallback tone, palette and
//      typography so both paths share one visual contract.
//   3. Missing `overflow-hidden` wrapper — `rounded-full` applied
//      directly to a Next <Image> let non-square uploads bleed past the
//      circle on Safari. The wrapper here owns the clipping; the image
//      simply fills it via `object-cover`.
//
// Implementation: a fixed-size `overflow-hidden` wrapper owns the box,
// the radius, the border, and the flex-shrink behaviour. The <Image>
// inside fills the wrapper with `object-cover`. There is no way to
// misuse this — if a component renders a user avatar, it imports this
// primitive and picks a size.
//
// Out of scope: the marketing surface (home/login/about/privacy) does
// not render user-supplied avatars and does not need this primitive.

type Size = 'sm' | 'md' | 'lg' | 'xl'

type FallbackTone = 'subtle' | 'strong'

// Pixel values double as the Next <Image> `width`/`height` props (so the
// optimizer picks the right responsive size) and as the rendered box
// dimensions via the Tailwind w-*/h-* classes.
const SIZE: Record<Size, { box: string; text: string; pixels: number }> = {
  sm: { box: 'w-8 h-8',   text: 'text-xs',  pixels: 32 }, // inline lists, comments, message inbox, nav trigger
  md: { box: 'w-10 h-10', text: 'text-sm',  pixels: 40 }, // card author rails (feed, listings, prices, research)
  lg: { box: 'w-14 h-14', text: 'text-base', pixels: 56 }, // profile/business detail header
  xl: { box: 'w-20 h-20', text: 'text-2xl', pixels: 80 }, // public profile / setup form hero
}

// Two fallback tones because two contexts need different contrast:
//   - 'subtle' (default) → green-100 tint, dark-mode aware. Used when
//                          the avatar sits on a plain page surface.
//   - 'strong'           → solid green-600, white text. Used when the
//                          avatar half-overlaps a cover image and needs
//                          to "punch through" visually.
const FALLBACK_TONE: Record<FallbackTone, string> = {
  subtle: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  strong: 'bg-green-600 text-white',
}

interface UserAvatarProps {
  /** Supabase-hosted avatar_url, or null/empty to render the fallback. */
  src?: string | null
  /** User's display name — used for alt text and the default initials fallback. */
  name?: string | null
  /** Visual size. Defaults to `md` (40×40). */
  size?: Size
  /** Style of the no-avatar fallback when no custom slot is supplied. */
  fallbackTone?: FallbackTone
  /**
   * Custom fallback content — completely overrides both the default
   * initials treatment and the tone styling. Used by the profile form
   * to layer a "📷 Change" hover overlay on top of the disc.
   */
  fallback?: ReactNode
  /**
   * Extra classes merged onto the wrapper. Use for shadows (`shadow-sm`,
   * `shadow-md`), explicit borders, ring treatments, or spacing tweaks
   * unique to a call site.
   */
  className?: string
  /** Pass-through to the underlying Next <Image> — set true for above-the-fold avatars. */
  priority?: boolean
  /** Override the default alt text. Falls back to `name` then 'User avatar'. */
  alt?: string
}

export default function UserAvatar({
  src,
  name,
  size = 'md',
  fallbackTone = 'subtle',
  fallback,
  className = '',
  priority = false,
  alt,
}: UserAvatarProps) {
  const { box, text, pixels } = SIZE[size]
  const boxBase = `${box} rounded-full shrink-0 ${className}`.trim()

  // Case 1: avatar URL present — render the Next <Image> inside an
  // overflow-hidden wrapper. The wrapper owns the box; the image fills
  // it via `object-cover`.
  if (src) {
    return (
      <div
        className={`${boxBase} overflow-hidden border border-gray-200 dark:border-gray-700 bg-white`}
      >
        <Image
          src={src}
          alt={alt ?? name ?? 'User avatar'}
          width={pixels}
          height={pixels}
          priority={priority}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  // Case 2: caller provides a custom fallback slot (e.g. profile form's
  // hover-to-change overlay).
  if (fallback !== undefined) {
    return <div className={`${boxBase} overflow-hidden`}>{fallback}</div>
  }

  // Case 3: default fallback — tone-styled tile containing the
  // computed initials of the user's name.
  const initials = computeInitials(name)
  return (
    <div
      className={`${boxBase} ${FALLBACK_TONE[fallbackTone]} flex items-center justify-center font-bold ${text}`}
      aria-label={alt ?? (name ? `${name} avatar` : 'User avatar')}
    >
      {initials}
    </div>
  )
}

function computeInitials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : ''
  return ((first + last).toUpperCase().slice(0, 2)) || '?'
}
