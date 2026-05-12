'use client';

import React, { useState, useEffect } from 'react';
import { useConsent } from './ConsentProvider';
import { CookieSettings } from './CookieSettings';

export function CookieBanner() {
  const { hasDecided, acceptAll, declineAll } = useConsent();
  const [showSettings, setShowSettings] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!hasDecided) {
      setIsVisible(true);
    }
  }, [hasDecided]);

  if (!isVisible || hasDecided) {
    return null;
  }

  const handleAcceptAll = async () => {
    await acceptAll();
    setIsVisible(false);
  };

  const handleDismissBanner = async () => {
    await declineAll();
    setIsVisible(false);
  };

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-[#f5f5f5] shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
        role="dialog"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-description"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="min-w-0 flex-1 pr-0 md:pr-4">
            <h3 id="cookie-banner-title" className="mb-2 text-base font-bold text-gray-900">
              Cookies &amp; analytics
            </h3>
            <p id="cookie-banner-description" className="text-sm leading-relaxed text-gray-800">
              We use strictly necessary cookies to operate the application. If you accept all cookies, we also
              enable first-party product analytics to understand usage. You can open cookie settings to choose
              optional categories. See our{' '}
              <a href="/cookie-policy" className="font-medium text-gray-900 underline underline-offset-2 hover:text-gray-700">
                Cookie Policy
              </a>{' '}
              for details.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 md:flex-nowrap">
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="rounded border border-gray-900 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
              aria-label="Open cookie settings"
            >
              Cookies settings
            </button>
            <button
              type="button"
              onClick={handleAcceptAll}
              className="rounded bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
              aria-label="Accept all cookies"
            >
              Accept all cookies
            </button>
            <button
              type="button"
              onClick={handleDismissBanner}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-gray-300 bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200"
              aria-label="Dismiss cookie banner"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {showSettings && <CookieSettings onClose={() => setShowSettings(false)} />}
    </>
  );
}
