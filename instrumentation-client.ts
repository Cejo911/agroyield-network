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

  // Filter out Supabase auth-token lock-contention noise.
  //
  // Supabase's auth client uses the Web Locks API to coordinate token
  // refreshes. Two flavours of contention bubble up as unhandled
  // rejections that aren't user-visible (sessions still refresh
  // successfully via Supabase's internal retry):
  //
  //   1. "Lock \"lock:sb-<project>-auth-token\" was released because
  //      another request stole it"
  //      Within-tab contention from multiple SupabaseClient instances —
  //      mostly fixed by the singleton in lib/supabase/client.ts but
  //      can still surface on iOS Safari/Chrome tab suspend/resume.
  //
  //   2. "AbortError: Lock was stolen by another request"
  //      Cross-tab contention from the same user having multiple tabs
  //      of the site open. Web Locks deliberately spans tabs in the
  //      same origin; this is expected behaviour, not a bug at our
  //      layer.
  //
  // Both are SDK-internal noise that overwhelms the alert feed during
  // launch monitoring. Filter strings are narrow enough that real
  // errors are still captured: the lock-name substring in (1) and the
  // exact AbortError message in (2) are both Supabase-specific.
  ignoreErrors: [
    /Lock .* was released because another request stole it/,
    /Lock was stolen by another request/,
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
