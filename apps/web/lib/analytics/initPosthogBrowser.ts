'use client';

import posthog from 'posthog-js';

let initialized = false;

/**
 * Initialize the PostHog browser SDK exactly once with privacy-first defaults.
 *
 * Behavior:
 *  - No-ops on the server, or if `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` is unset.
 *  - Starts opted out of capture and persistence so no PostHog cookies are
 *    written until the user grants optional analytics consent via the cookie
 *    banner.
 *  - Routes ingest through the same-origin `/ingest` proxy by default to reduce
 *    third-party cookie / ad-blocker friction; override with
 *    `NEXT_PUBLIC_POSTHOG_HOST`.
 *  - Uses cross-subdomain cookies (PostHog default) so the same anonymous
 *    distinct_id is shared across `forceweaver.com`, `blog.forceweaver.com`,
 *    and the future `revsnap.forceweaver.com` app.
 *  - Disables session recording; product-side replay or engagement scoring can
 *    be layered on when the Revsnap app is folded in.
 */
export function initPosthogBrowser(): typeof posthog | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) {
    return null;
  }

  if (initialized) {
    return posthog;
  }

  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || '/ingest';
  const uiHost =
    process.env.NEXT_PUBLIC_POSTHOG_UI_HOST?.trim() || 'https://us.posthog.com';

  posthog.init(token, {
    api_host: apiHost,
    ui_host: uiHost,
    defaults: '2026-01-30',
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    disable_session_recording: true,
    capture_exceptions: true,
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
    persistence: 'localStorage+cookie',
    cross_subdomain_cookie: true,
  });

  initialized = true;
  return posthog;
}

/**
 * Return the initialized PostHog instance, or null if it has not been
 * initialized yet (e.g. on the server, or before the consent provider mounts).
 */
export function getPosthog(): typeof posthog | null {
  if (typeof window === 'undefined' || !initialized) {
    return null;
  }
  return posthog;
}
