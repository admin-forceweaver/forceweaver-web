'use client';

import React, { useEffect, useState } from 'react';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { useConsent } from './ConsentProvider';

export function Analytics() {
  const { hasConsent } = useConsent();
  const [canTrack, setCanTrack] = useState(false);

  useEffect(() => {
    // Check consent status
    const analyticsConsent = hasConsent('analytics');
    setCanTrack(analyticsConsent);

    // Clean up tracking if consent is withdrawn
    return () => {
      if (!analyticsConsent && canTrack) {
        console.log('[Analytics] Consent withdrawn, stopping analytics');
        // Additional cleanup if needed
      }
    };
  }, [hasConsent, canTrack]);

  // Only render analytics if user has consented
  if (!canTrack) {
    return null;
  }

  return <VercelAnalytics />;
}

