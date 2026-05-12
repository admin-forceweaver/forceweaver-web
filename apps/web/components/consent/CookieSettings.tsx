'use client';

import React, { useState, useEffect } from 'react';
import { useConsent } from './ConsentProvider';

interface CookieSettingsProps {
  onClose: () => void;
}

function ToggleSwitch({
  pressed,
  onClick,
  disabled,
  ariaLabel,
}: {
  pressed: boolean;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        disabled ? 'cursor-default opacity-90' : 'cursor-pointer'
      } ${pressed ? 'bg-violet-600' : 'bg-gray-300'}`}
    >
      <span
        className={`pointer-events-none absolute left-1 top-1 block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          pressed ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function PreferenceCard({
  title,
  description,
  footer,
  trailing,
}: {
  title: string;
  description: string;
  footer?: string;
  trailing: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{description}</p>
          {footer ? <p className="mt-2 text-xs text-gray-500">{footer}</p> : null}
        </div>
        <div className="shrink-0 pt-0.5">{trailing}</div>
      </div>
    </div>
  );
}

export function CookieSettings({ onClose }: CookieSettingsProps) {
  const { consent, updateConsent, acceptAll } = useConsent();
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
    setSettings((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSave = async () => {
    await updateConsent(settings);
    onClose();
  };

  const handleAllowAll = async () => {
    await acceptAll();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-labelledby="cookie-settings-title"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <h2 id="cookie-settings-title" className="pr-8 text-lg font-bold text-gray-900">
            Privacy preference center
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="Close cookie settings"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <p className="text-sm leading-relaxed text-gray-600">
            We use strictly necessary cookies to run the service. With your permission, we also use first-party
            analytics to understand product usage. See our{' '}
            <a
              href="/cookie-policy"
              className="font-medium text-gray-900 underline underline-offset-2 hover:text-gray-700"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cookie Policy
            </a>{' '}
            for details.
          </p>

          <button
            type="button"
            onClick={handleAllowAll}
            className="w-full rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
          >
            Allow all
          </button>

          <h3 className="text-base font-bold text-gray-900">Manage consent preferences</h3>

          <div className="space-y-4">
            <PreferenceCard
              title="Strictly necessary"
              description="Required for authentication, security, and core application features. Always active."
              trailing={<ToggleSwitch pressed disabled ariaLabel="Strictly necessary cookies always on" />}
            />

            <PreferenceCard
              title="Product analytics"
              description="First-party analytics (PostHog) for usage insights. Autocapture and events run only if you enable this category."
              footer="Includes: PostHog product analytics, usage statistics"
              trailing={
                <ToggleSwitch
                  pressed={settings.analytics}
                  onClick={() => handleToggle('analytics')}
                  ariaLabel="Toggle product analytics cookies"
                />
              }
            />

            <PreferenceCard
              title="Marketing cookies"
              description="Used to track visitors across websites to display relevant advertisements."
              footer="Currently not used"
              trailing={
                <ToggleSwitch
                  pressed={settings.marketing}
                  onClick={() => handleToggle('marketing')}
                  ariaLabel="Toggle marketing cookies"
                />
              }
            />

            <PreferenceCard
              title="Preference cookies"
              description="Remember your preferences and settings for a personalized experience."
              footer="Includes: Theme, language, UI preferences"
              trailing={
                <ToggleSwitch
                  pressed={settings.preferences}
                  onClick={() => handleToggle('preferences')}
                  ariaLabel="Toggle preference cookies"
                />
              }
            />
          </div>
        </div>

        <div className="border-t border-gray-100 px-6 py-5">
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
          >
            Confirm my choices
          </button>
        </div>
      </div>
    </div>
  );
}
