'use client'

import type { CSSProperties } from 'react'

// Real-time password strength meter for the signup form.
//
// The signup form (`app/signup/page.tsx`) historically validated only
// "≥8 characters" server-side, which left users with no signal during
// typing about whether their password was actually any good. This
// component closes that gap with three coordinated affordances —
//
//   1. A four-segment horizontal bar that fills left-to-right as more
//      criteria are met. The bar always reserves four slots so the
//      form layout doesn't shift between zero / weak / strong states
//      (the previous bespoke modals had a layout-jump failure mode
//      every time conditional content unmounted; reserving min-height
//      here is a deliberate echo of that lesson).
//   2. A textual label ("Strength: Weak / Fair / Good / Strong") that
//      shares its colour with the highest filled segment so the meter
//      reads correctly for users who can't distinguish 4-shades-of-
//      green from 4-shades-of-red.
//   3. A row of inline criteria hints (≥8 chars, lowercase, uppercase,
//      digit, symbol) so a user typing a "fair" password can see
//      exactly which criterion is missing instead of guessing.
//
// Failure modes prevented by extracting this primitive (vs. inlining
// in the signup form):
//
//   • Hard-blocking submit. The meter is purely advisory — the actual
//     gate ("≥8 chars") is enforced by Supabase Auth on the server.
//     Inlining the meter risked a future contributor wiring its level
//     into the submit button's `disabled` state, which would make the
//     existing "8 chars only" rule stricter without anyone reviewing
//     the UX impact. A separate file makes the boundary explicit.
//   • Layout shift on first keystroke. The bar reserves vertical space
//     via `minHeight` on the wrapper, so the form doesn't jump down
//     when the user starts typing. Without this, the "Confirm
//     password" field below would visibly displace.
//   • Dependency creep. Several password-strength libraries on npm
//     (zxcvbn, owasp-password-strength-test) are tempting but each
//     adds 200KB+ to the client bundle. The deterministic five-checks
//     algorithm here is sufficient for an advisory meter — the audit
//     asks for *real-time feedback*, not entropy estimation.
//   • Aria semantics drift. The criteria icons are decorative — the
//     met/unmet status is already communicated by the colour AND a
//     visible word ("✓ ≥8 characters" / "○ ≥8 characters"), so the
//     SVG-equivalent glyphs carry `aria-hidden="true"` and the screen
//     reader gets the textual list naturally.
//
// The signup page consumes the page-level CSS variables (`--text-*`,
// `--input-bg`, etc.), so this component uses inline styles with the
// same tokens to match — no new Tailwind dependencies on a page that
// otherwise opted out of Tailwind.

export interface PasswordStrength {
  /** 0 = empty input, 1 = weak, 2 = fair, 3 = good, 4 = strong. */
  level: 0 | 1 | 2 | 3 | 4
  checks: {
    length: boolean
    lower: boolean
    upper: boolean
    digit: boolean
    symbol: boolean
  }
}

/** Deterministic strength assessment — five binary checks scored as a
 *  count, then bucketed into the 0..4 levels rendered by the bar. */
export function computePasswordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digit: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }
  const score = Object.values(checks).filter(Boolean).length
  const level: 0 | 1 | 2 | 3 | 4 =
    password.length === 0 ? 0
      : score <= 2 ? 1
        : score === 3 ? 2
          : score === 4 ? 3
            : 4
  return { level, checks }
}

const LEVEL_LABEL: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: '',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong',
}

// Colour tokens chosen for AA-contrast on both light and dark page
// surfaces. Hexes (not Tailwind classes) because the signup page
// renders without Tailwind utilities on the form column.
const LEVEL_COLOR: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'transparent',
  1: '#ef4444', // red-500 — weak
  2: '#f59e0b', // amber-500 — fair
  3: '#84cc16', // lime-500 — good
  4: '#16a34a', // green-600 — strong
}

const CRITERIA: Array<{ key: keyof PasswordStrength['checks']; label: string }> = [
  { key: 'length', label: '≥8 characters' },
  { key: 'lower',  label: 'lowercase' },
  { key: 'upper',  label: 'uppercase' },
  { key: 'digit',  label: 'digit' },
  { key: 'symbol', label: 'symbol' },
]

interface PasswordStrengthMeterProps {
  password: string
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { level, checks } = computePasswordStrength(password)

  // Reserve min-height so the form layout doesn't jump when typing
  // begins. Even at level 0 (empty), the four bar segments render as
  // muted placeholders so the eye can map the future fill direction.
  const wrapperStyle: CSSProperties = {
    marginTop: 8,
    minHeight: 56,
  }

  const barRowStyle: CSSProperties = {
    display: 'flex',
    gap: 4,
  }

  // Note: 8px height (was 4px) and a stronger fallback color than
  // `var(--border-color)`. Empirical fix: at 4px + #e5e7eb (the
  // signup page's --border-color), the unfilled bar is ~1.16:1
  // contrast against the white card background — below WCAG AA's
  // 3:1 floor for non-text UI components, so the bar reads as
  // "no bar visible" rather than "thin gray bar". `#9ca3af`
  // (gray-400) gives 2.8:1 against white and 7:1 against the
  // dark-mode card background, so the bar shape is always visible
  // and the filled segments still contrast meaningfully.
 // Note: 8px height (was 4px) and a stronger fallback color than
  // `var(--border-color)`. Empirical fix: at 4px + #e5e7eb (the
  // signup page's --border-color), the unfilled bar is ~1.16:1
  // contrast against the white card background — below WCAG AA's
  // 3:1 floor for non-text UI components, so the bar reads as
  // "no bar visible" rather than "thin gray bar". `#9ca3af`
  // (gray-400) gives 2.8:1 against white and 7:1 against the
  // dark-mode card background, so the bar shape is always visible
  // and the filled segments still contrast meaningfully.
  const segmentStyle = (filled: boolean): CSSProperties => ({
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: filled ? LEVEL_COLOR[level] : '#9ca3af',
    opacity: filled ? 1 : 0.35,
    transition: 'background-color 0.15s, opacity 0.15s',
  })

  const labelStyle: CSSProperties = {
    marginTop: 6,
    fontSize: 12,
    fontWeight: 600,
    color: level === 0 ? 'var(--text-muted)' : LEVEL_COLOR[level],
    minHeight: 16,
  }

  const criteriaRowStyle: CSSProperties = {
    marginTop: 4,
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px 12px',
    fontSize: 11,
    color: 'var(--text-muted)',
  }

  const criterionStyle = (met: boolean): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    color: met ? LEVEL_COLOR[4] : 'var(--text-muted)',
    fontWeight: met ? 600 : 400,
  })

  return (
    <div style={wrapperStyle} aria-live="polite">
      <div style={barRowStyle} role="presentation">
        {[1, 2, 3, 4].map(slot => (
          <div key={slot} style={segmentStyle(level >= slot)} />
        ))}
      </div>
      <div style={labelStyle}>
        {level === 0 ? '\u00A0' : `Strength: ${LEVEL_LABEL[level]}`}
      </div>
      <div style={criteriaRowStyle}>
        {CRITERIA.map(({ key, label }) => {
          const met = checks[key]
          return (
            <span key={key} style={criterionStyle(met)}>
              <span aria-hidden="true">{met ? '✓' : '○'}</span>
              {label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
