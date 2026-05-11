'use client';

import React, { useState, useEffect } from 'react';
import { useConsent } from './ConsentProvider';
import { CookieSettings } from './CookieSettings';

export function CookieBanner() {
  const { hasDecided, acceptAll, declineAll } = useConsent();
  const [showSettings, setShowSettings] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show banner if user hasn't decided
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

  const handleDeclineAll = async () => {
    await declineAll();
    setIsVisible(false);
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
    setIsVisible(false);
  };

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl"
        role="dialog"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-description"
      >
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h3
                id="cookie-banner-title"
                className="text-lg font-semibold text-gray-900 mb-2"
              >
                We value your privacy
              </h3>
              <p
                id="cookie-banner-description"
                className="text-sm text-gray-600"
              >
                We use cookies to enhance your browsing experience and analyze our traffic.
                By clicking &quot;Accept All&quot;, you consent to our use of cookies.{' '}
                <a
                  href="/cookie-policy"
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn more
                </a>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={handleDeclineAll}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label="Decline all optional cookies"
              >
                Essential Only
              </button>
              
              <button
                onClick={handleOpenSettings}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="Customize cookie preferences"
              >
                Customize
              </button>
              
              <button
                onClick={handleAcceptAll}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                aria-label="Accept all cookies"
              >
                Accept All
              </button>
            </div>
          </div>

          {/* CCPA Disclosure */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              California residents: We do not sell your personal information.{' '}
              <a
                href="/privacy-policy#ccpa"
                className="text-blue-600 hover:underline"
              >
                Learn about your privacy rights
              </a>
            </p>
          </div>
        </div>
      </div>

      {showSettings && (
        <CookieSettings onClose={handleCloseSettings} />
      )}
    </>
  );
}

