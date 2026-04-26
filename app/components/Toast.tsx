'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

// Sitewide toast system. Replaces native alert() across the app — alert
// is a 1990s browser modal that breaks on mobile and is inaccessible to
// screen readers. This component renders a small toast at top-right on
// desktop, bottom-center on mobile (avoids iOS notch / Dynamic Island).
//
// ARIA semantics:
//   - tone='error'   → role="alert" (announced immediately by screen
//                      readers; appropriate for actionable failures)
//   - tone='success' → role="status" (polite announcement; appropriate
//                      for confirmations)
//   - tone='info'    → role="status"
//
// Auto-dismiss:
//   - error: 5s (give the user time to read what went wrong)
//   - success/info: 3s
//
// Migration note: this replaces the FeatureFlagsTab inline-toast pattern.
// Components that imported nothing call alert() / confirm() — those should
// migrate to useToast().showError(...) / useToast().showSuccess(...).
//
// HMR-safe: nextId is module-scoped so React fast-refresh doesn't reset
// it mid-render and produce duplicate keys across re-renders.

type ToastTone = 'success' | 'error' | 'info'

interface Toast {
  id: number
  text: string
  tone: ToastTone
}

interface ToastContextValue {
  showToast: (text: string, tone?: ToastTone) => void
  showSuccess: (text: string) => void
  showError: (text: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be called inside <ToastProvider>')
  }
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  // Cleanup any pending timers when the provider unmounts.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach(t => clearTimeout(t))
      timers.clear()
    }
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const showToast = useCallback(
    (text: string, tone: ToastTone = 'info') => {
      const id = ++nextId
      setToasts(prev => [...prev, { id, text, tone }])
      const ms = tone === 'error' ? 5000 : 3000
      const timer = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
        timersRef.current.delete(id)
      }, ms)
      timersRef.current.set(id, timer)
    },
    [],
  )

  const showSuccess = useCallback(
    (text: string) => showToast(text, 'success'),
    [showToast],
  )
  const showError = useCallback(
    (text: string) => showToast(text, 'error'),
    [showToast],
  )

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError }}>
      {children}
      {/* Toast portal. aria-live="polite" so screen readers get notified
          but in a non-interrupting way; per-toast role overrides this for
          error tone. pointer-events-none on the wrapper so toasts don't
          block clicks behind them; per-toast pointer-events-auto restores
          interactivity for the dismiss button. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 sm:bottom-auto sm:top-4 sm:inset-x-auto sm:right-4 z-[60] flex flex-col items-center sm:items-end gap-2 px-4 sm:px-0"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
          paddingTop: 'max(env(safe-area-inset-top), 0px)',
        }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto min-w-[260px] max-w-md px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-start gap-3 ${
              t.tone === 'error'
                ? 'bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                : t.tone === 'success'
                  ? 'bg-green-50 dark:bg-green-900/40 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200'
            }`}
          >
            <span className="flex-1 leading-snug">{t.text}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 -mr-1 -mt-0.5 text-current opacity-60 hover:opacity-100 transition-opacity"
            >
              <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
