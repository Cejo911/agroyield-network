'use client'

import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'

// Design primitive — the canonical centred-dialog modal for the app.
// Mirrors the BusinessLogo / UserAvatar / EmptyState style and solves
// six recurring failure modes that plagued the bespoke `fixed inset-0`
// modals scattered across community-client (repost), AppNav (mobile
// menu), and any future confirm/prompt surface:
//
//   1. Missing dialog semantics — bespoke modals shipped without
//      `role="dialog" aria-modal="true"`, so screen readers announced
//      them as a generic group of regions and the user couldn't tell a
//      dialog had opened. The primitive sets both, plus an
//      `aria-labelledby` pointing at the rendered title when one is
//      supplied.
//   2. No focus trap — on a bespoke modal, `Tab` from inside the dialog
//      escaped silently into the page chrome behind, making keyboard
//      operation impossible. Implemented hand-rolled here (per the
//      audit's "no new deps" rule): on every keydown, the modal root
//      computes its current focusable list and wraps Tab / Shift-Tab.
//   3. No Escape-to-close — every other major web app closes a modal on
//      Escape. The primitive owns the `keydown` listener so call sites
//      don't rebuild it (and don't forget to unbind it).
//   4. No body-scroll lock — bespoke modals let the page behind keep
//      scrolling under the touch on mobile and under the wheel on
//      desktop, which feels broken. The primitive freezes
//      `document.body.style.overflow` while open and restores the prior
//      value on close (saving the previous value matters — not every
//      site sets `overflow: visible` as the default).
//   5. No focus restore — when the modal closed, focus dropped to
//      `<body>` and the keyboard user lost their place. The primitive
//      captures `document.activeElement` on open and re-focuses it on
//      close, with a graceful fallback when the captured element no
//      longer exists.
//   6. Initial-focus drift — bespoke modals never moved focus into the
//      dialog, so a screen-reader user opening the modal had nothing
//      announced. The primitive moves focus to `initialFocusRef` if
//      provided, else to the first focusable child, else to the modal
//      root itself (made focusable via `tabIndex={-1}`).
//
// Implementation: a fixed-inset backdrop owns the click-outside-to-close
// affordance (when `closeOnBackdropClick !== false`); the inner dialog
// `stopPropagation`s clicks so they don't bubble. The focus-trap is
// hand-rolled — no new dependency. The querySelector list mirrors the
// canonical "tabbable" set used by libraries like focus-trap.
//
// Out of scope: bottom-sheet modals on `<sm` (audit P2 follow-up — the
// audit calls out that mobile modals should be bottom sheets but that's
// a separate visual primitive). Popovers anchored to a button position
// (e.g. dropdowns) are NOT modals and should not use this primitive.

type Size = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<Size, string> = {
  sm: 'max-w-sm', // confirm / discard prompts
  md: 'max-w-md', // single-form modals
  lg: 'max-w-lg', // repost composer, bigger forms
}

// Tabbable selector — covers buttons, links with hrefs, native form
// controls and any element opted in via tabindex>=0. Excludes
// `tabindex="-1"` so the modal root itself (which we make focusable as a
// last-resort focus target) doesn't get included in the trap cycle.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface ModalProps {
  /** Whether the modal is currently rendered. When false, the primitive
   *  renders nothing (so the body-scroll lock and listeners are torn
   *  down cleanly via the `useEffect` cleanup path). */
  open: boolean
  /** Called when the user requests close — Escape, backdrop click (if
   *  enabled), or any caller-controlled dismiss button inside the
   *  modal. Caller decides whether to honour the request (e.g. while a
   *  submission is in-flight). */
  onClose: () => void
  /** Optional title — when provided, rendered as a visible `<h2>` and
   *  wired as `aria-labelledby` for the dialog. Pass `undefined` for
   *  modals that supply their own header structure. */
  title?: string
  /** Modal body content. */
  children: ReactNode
  /** Width preset. Defaults to `md`. */
  size?: Size
  /** Backdrop click closes the modal. Default `true`. Set to `false`
   *  during in-flight submissions so the user can't accidentally lose
   *  state. */
  closeOnBackdropClick?: boolean
  /** Override the default "focus first focusable child" behaviour —
   *  pass a ref to the element you want focused on open (e.g. a
   *  textarea inside a compose form). */
  initialFocusRef?: RefObject<HTMLElement | null>
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdropClick = true,
  initialFocusRef,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Effect: when `open` flips to true, do all the a11y wiring; on
  // close (or unmount), tear it down. Everything in here runs only
  // while the modal is mounted-and-open.
  useEffect(() => {
    if (!open) return

    // 1. Capture the previously-focused element so we can restore it
    //    when the modal closes. Bail back to `null` if it isn't an
    //    HTMLElement (e.g. when the modal opened programmatically and
    //    the focused element was `<body>`).
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    // 2. Save the current body overflow value and lock the page scroll.
    //    Save the literal previous value (not assume "visible") so the
    //    restore on close is exact.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // 3. Move focus into the dialog. Prefer the caller-supplied ref;
    //    fall back to the first focusable child; fall back to the
    //    dialog root itself (tabIndex={-1} makes it focusable).
    const focusInitial = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus()
        return
      }
      const root = dialogRef.current
      if (!root) return
      const firstFocusable = root.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      if (firstFocusable) {
        firstFocusable.focus()
      } else {
        root.focus()
      }
    }
    // Defer the focus call by one frame — the dialog has just mounted
    // and its children may still be laying out, so an immediate focus
    // call can race child rendering on slower devices.
    const focusTimer = window.setTimeout(focusInitial, 0)

    // 4. Keydown handler — Escape closes, Tab/Shift-Tab cycles within
    //    the dialog. Computed on each keystroke so dynamically-added
    //    focusables (a button that appears mid-flow) participate in
    //    the trap.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const root = dialogRef.current
      if (!root) return
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(el => !el.hasAttribute('disabled'))
      if (focusables.length === 0) {
        // Nothing tabbable — keep focus pinned on the root.
        e.preventDefault()
        root.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        // Shift-Tab from the first focusable wraps to the last.
        if (active === first || !root.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last) {
        // Tab from the last focusable wraps to the first.
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      // Restore the saved overflow value (NOT 'visible') so we don't
      // clobber a parent that intentionally set overflow:hidden.
      document.body.style.overflow = previousOverflow
      // Restore focus to whatever owned it before the modal opened.
      // Guard against the element having been removed from the DOM
      // during the modal's lifetime.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [open, onClose, initialFocusRef])

  if (!open) return null

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        // `max-h-[90vh] overflow-y-auto` so dialogs taller than the
        // viewport (e.g. the AppNav mobile menu with 10 nav links +
        // tier badge + sign-out, or any future long-form content)
        // become internally scrollable instead of overflowing past
        // the viewport with no scroll affordance. Body-scroll lock
        // above continues to prevent the *page* from scrolling
        // underneath the modal.
        className={`bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full ${SIZE_CLASS[size]} outline-none max-h-[90vh] overflow-y-auto`}
      >
        {title && (
          <h2
            id={titleId}
            className="text-lg font-bold text-gray-900 dark:text-white px-5 pt-5"
          >
            {title}
          </h2>
        )}
        <div className={title ? 'px-5 pb-5 pt-3' : 'p-5'}>{children}</div>
      </div>
    </div>
  )
}
