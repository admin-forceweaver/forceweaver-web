'use client';

import React, { useState, useEffect } from 'react';
import { useConsent } from './ConsentProvider';

interface CookieSettingsProps {
  onClose: () => void;
}

export function CookieSettings({ onClose }: CookieSettingsProps) {
  const { consent, updateConsent } = useConsent();
  const [settings, setSettings] = useState({
    analytics: consent?.analytics ?? false,
    marketing: consent?.marketing ?? false,
    preferences: consent?.preferences ?? false,
  });

  useEffect(() => {
    if (consent) {
      setSettings({
        analytics: consent.analytics,
        marketing: consent.marketing,
        preferences: consent.preferences,
      });
    }
  }, [consent]);

  const handleToggle = (category: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSave = async () => {
    await updateConsent(settings);
    onClose();
  };

  const handleAcceptAll = () => {
    setSettings({
      analytics: true,
      marketing: true,
      preferences: true,
    });
  };

  const handleDeclineAll = () => {
    setSettings({
      analytics: false,
      marketing: false,
      preferences: false,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-labelledby="cookie-settings-title"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2
              id="cookie-settings-title"
              className="text-2xl font-bold text-gray-900"
            >
              Cookie Preferences
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close cookie settings"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Essential Cookies */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Essential Cookies
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  These cookies are necessary for the website to function and cannot be disabled.
                </p>
              </div>
              <div className="ml-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Always Active
                </span>
              </div>
            </div>
            <div className="pl-4 text-sm text-gray-500">
              <p>Includes: Authentication, session management, security</p>
            </div>
          </div>

          {/* Analytics Cookies */}
          <div className="space-y-3 pt-6 border-t">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Analytics Cookies
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Help us understand how visitors interact with our website by collecting anonymous information.
                </p>
              </div>
              <div className="ml-4">
                <button
                  onClick={() => handleToggle('analytics')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.analytics ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={settings.analytics}
                  aria-label="Toggle analytics cookies"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.analytics ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="pl-4 text-sm text-gray-500">
              <p>Includes: Vercel Analytics, usage statistics</p>
            </div>
          </div>

          {/* Marketing Cookies */}
          <div className="space-y-3 pt-6 border-t">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Marketing Cookies
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Used to track visitors across websites to display relevant advertisements.
                </p>
              </div>
              <div className="ml-4">
                <button
                  onClick={() => handleToggle('marketing')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.marketing ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={settings.marketing}
                  aria-label="Toggle marketing cookies"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.marketing ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="pl-4 text-sm text-gray-500">
              <p>Currently not used</p>
            </div>
          </div>

          {/* Preference Cookies */}
          <div className="space-y-3 pt-6 border-t">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Preference Cookies
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Remember your preferences and settings for a personalized experience.
                </p>
              </div>
              <div className="ml-4">
                <button
                  onClick={() => handleToggle('preferences')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.preferences ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={settings.preferences}
                  aria-label="Toggle preference cookies"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.preferences ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="pl-4 text-sm text-gray-500">
              <p>Includes: Theme, language, UI preferences</p>
            </div>
          </div>

          {/* Links */}
          <div className="pt-6 border-t">
            <p className="text-sm text-gray-600">
              For more information, please read our{' '}
              <a href="/cookie-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Cookie Policy
              </a>{' '}
              and{' '}
              <a href="/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              onClick={handleDeclineAll}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Decline All
            </button>
            <button
              onClick={handleAcceptAll}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Accept All
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

