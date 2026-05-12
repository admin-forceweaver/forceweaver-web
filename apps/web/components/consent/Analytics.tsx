'use client';

import { useEffect, useRef } from 'react';
import { useConsent } from './ConsentProvider';
import { initPosthogBrowser } from '@/lib/analytics/initPosthogBrowser';

/**
 * Bridges the cookie consent state to the PostHog browser SDK.
 *
 * Renders nothing visible: PostHog is initialized lazily in the browser, then
 * opted in or out as the user's `analytics` consent toggle changes. When the
 * PostHog token is missing the SDK never initializes, so no network requests
 * or cookies are produced.
 */
export function Analytics() {
  const { consent } = useConsent();
  const analyticsAllowed = consent?.analytics === true;
  const consentEventSentRef = useRef(false);

  useEffect(() => {
    const instance = initPosthogBrowser();
    if (!instance) {
      return;
    }

    if (analyticsAllowed) {
      if (instance.has_opted_out_capturing()) {
        instance.opt_in_capturing();
      }
      if (!consentEventSentRef.current) {
        consentEventSentRef.current = true;
        try {
          instance.capture('analytics_consent_accepted');
        } catch {
          // Capture is best-effort; never throw from the consent bridge.
        }
      }
    } else {
      consentEventSentRef.current = false;
      if (!instance.has_opted_out_capturing()) {
        instance.opt_out_capturing();
      }
    }
  }, [analyticsAllowed]);

  return null;
}
