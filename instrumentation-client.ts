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
  // 2. Cross-tab lock contention (AbortError variant)
  //    "AbortError: Lock was stolen by another request"
  //    Same user with multiple tabs of the site open. Web Locks
  //    deliberately spans tabs in the same origin; this is expected
  //    behaviour, not a bug at our layer.
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
  // All three are SDK-internal noise that overwhelms the alert feed
  // during launch monitoring. Filter strings are narrow enough that
  // real errors are still captured: the lock-name substring, the
  // AbortError message, and the storage-property phrase are all
  // specific enough that legitimate code paths won't get caught.
  ignoreErrors: [
    /Lock .* was released because another request stole it/,
    /Lock was stolen by another request/,
    /Failed to read the 'sessionStorage' property/,
    /Failed to read the 'localStorage' property/,
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
