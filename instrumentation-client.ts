// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Filter out Supabase SDK noise that isn't a bug in our code.
  //
  // 1. Auth-token lock contention (Web Locks API)
  //    "Lock \"lock:sb-<project>-auth-token\" was released because
  //     another request stole it"
  //    Within-tab contention from multiple SupabaseClient instances —
  //    mostly fixed by the singleton in lib/supabase/client.ts but
  //    can still surface on iOS Safari/Chrome tab suspend/resume.
  //
  // 2. Cross-tab lock contention (AbortError variants)
  //    Two phrasings of the same underlying issue have been observed:
  //      "AbortError: Lock was stolen by another request"
  //      "AbortError: Lock broken by another request with the 'steal' option"
  //    Both fire when the same user has multiple tabs of the site open.
  //    Web Locks deliberately spans tabs in the same origin; this is
  //    expected behaviour, not a bug at our layer. Different browsers
  //    and Web Locks polyfill versions surface the message differently.
  //
  // 3. Storage access denied
  //    "Failed to read the 'sessionStorage' property from 'Window':
  //     Access is denied for this document."
  //    Supabase's RealtimeClient tries to access sessionStorage during
  //    init. The browser denies it because the user is in private mode,
  //    has strict tracking protection on, is in an in-app webview
  //    (Facebook / WhatsApp / Instagram browsers), or has site storage
  //    blocked. Auth still works (in-memory token fallback); only
  //    realtime subscriptions are degraded — and that's a UX limitation
  //    of the user's browser environment, not a code bug.
  //    Same filter covers the localStorage variant the SDK falls back to.
  //
  // 4. Service Worker registration denied
  //    "NotSupportedError: Failed to register a ServiceWorker for scope
  //     ('https://...') with script ('https://.../sw.js'): The user denied
  //     permission to use Service Worker."
  //    @ducanh2912/next-pwa auto-registers public/sw.js on page load.
  //    When the user has explicitly denied service-worker permission for
  //    the origin (or the OS / browser policy blocks it), the registration
  //    throws NotSupportedError. We don't control the registration code
  //    (the plugin generates it). PWA features are degraded — no offline,
  //    no background sync — but everything else works fine. Filtering
  //    matches the "user denied permission to use Service Worker" tail of
  //    the error so we still capture other ServiceWorker failure modes
  //    (script not found, MIME type wrong, scope mismatch) which would
  //    indicate a real bug.
  //
  // All four are SDK-internal noise that overwhelms the alert feed
  // during launch monitoring. Filter strings are narrow enough that
  // real errors are still captured: the lock-name substring, the
  // AbortError message, the storage-property phrase, and the
  // user-denied-permission tail are all specific enough that
  // legitimate code paths won't get caught.
  ignoreErrors: [
    /Lock .* was released because another request stole it/,
    /Lock was stolen by another request/,
    /Lock broken by another request/,
    /Failed to read the 'sessionStorage' property/,
    /Failed to read the 'localStorage' property/,
    /The user denied permission to use Service Worker/,
  ],

  // 5. Bare "Error: Rejected" from next-pwa Service Worker registration
  //    The ignoreErrors filter above catches the explicit NotSupportedError
  //    shape (4) — but a different code path also exists: when
  //    `navigator.serviceWorker.register()` rejects with no typed error,
  //    the unhandled-rejection handler surfaces it as just `Error: Rejected`
  //    with no further detail. Most events in this class are bot crawlers:
  //    Googlebot's smartphone crawler advertises a Chrome Mobile / Nexus 5X
  //    / Android 6.0.1 user-agent (verified via 3 attached replays from
  //    66.249.66.x — Google's published crawler IP block), and Google's
  //    docs confirm Googlebot doesn't support Service Workers in JS.
  //    A small minority of events come from real Chrome users on Windows
  //    where strict privacy settings block the SW registration —
  //    same root cause class, no UI impact (just no offline cache for
  //    that session).
  //
  //    A regex on the bare "Rejected" message would be too broad
  //    (catches any other code path that rejects a Promise with that
  //    string), so we filter via beforeSend with a stack-frame check:
  //    drop only events whose top-of-stack contains `ServiceWorkerContainer`
  //    AND whose message is exactly "Rejected". Real app errors of any
  //    other shape pass through untouched.
  //
  //    See JAVASCRIPT-NEXTJS-A — 28 events, 12 users, 8 days, ~70% bots.
  beforeSend(event) {
    const exc = event.exception?.values?.[0]
    if (
      exc?.value === 'Rejected' &&
      exc.stacktrace?.frames?.some(
        (f) => typeof f.function === 'string' && f.function.includes('ServiceWorkerContainer'),
      )
    ) {
      return null // drop the event — bot crawler or restricted-browser SW rejection
    }
    return event
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
