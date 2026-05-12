import { CookieDefinition } from './types';

/**
 * Central registry of all cookies used in the application
 * Add new cookies here as they are implemented
 */
export const COOKIE_REGISTRY: Record<string, CookieDefinition> = {
  // Essential Cookies (No consent required)
  'sb-access-token': {
    name: 'sb-access-token',
    category: 'essential',
    purpose: 'Maintains your login session and authentication state',
    duration: '1 hour',
    provider: 'Supabase',
    requiresConsent: false,
  },
  'sb-refresh-token': {
    name: 'sb-refresh-token',
    category: 'essential',
    purpose: 'Allows automatic session renewal without re-login',
    duration: '30 days',
    provider: 'Supabase',
    requiresConsent: false,
  },
  'sb-auth-token': {
    name: 'sb-auth-token',
    category: 'essential',
    purpose: 'Stores authentication state across page loads',
    duration: 'Session',
    provider: 'Supabase',
    requiresConsent: false,
  },
  'forceweaver-consent': {
    name: 'forceweaver-consent',
    category: 'essential',
    purpose: 'Remembers your cookie consent preferences',
    duration: '13 months',
    provider: 'Rev Cloud Blueprint',
    requiresConsent: false,
  },

  // Analytics Cookies (Consent required)
  // PostHog writes these only after the user grants optional analytics consent.
  // Names are based on the project token; we list the canonical pattern.
  'ph_<token>_posthog': {
    name: 'ph_<token>_posthog',
    category: 'analytics',
    purpose:
      'Stores an anonymous distinct_id, session id, and feature flag cache used by PostHog product analytics',
    duration: '13 months',
    provider: 'PostHog',
    requiresConsent: true,
  },
  '__ph_opt_in_out_<token>': {
    name: '__ph_opt_in_out_<token>',
    category: 'analytics',
    purpose:
      'Remembers your opt-in or opt-out choice so PostHog respects consent across visits',
    duration: '13 months',
    provider: 'PostHog',
    requiresConsent: true,
  },

  // Future: Stripe Cookies (uncomment when Stripe is integrated)
  // '__stripe_mid': {
  //   name: '__stripe_mid',
  //   category: 'essential',
  //   purpose: 'Fraud prevention for payment processing',
  //   duration: '1 year',
  //   provider: 'Stripe',
  //   requiresConsent: false,
  // },
  // '__stripe_sid': {
  //   name: '__stripe_sid',
  //   category: 'essential',
  //   purpose: 'Maintains your checkout session state',
  //   duration: '30 minutes',
  //   provider: 'Stripe',
  //   requiresConsent: false,
  // },
};

/**
 * Get cookies by category
 */
export function getCookiesByCategory(category: CookieDefinition['category']): CookieDefinition[] {
  return Object.values(COOKIE_REGISTRY).filter(cookie => cookie.category === category);
}

/**
 * Get all cookies that require consent
 */
export function getConsentRequiredCookies(): CookieDefinition[] {
  return Object.values(COOKIE_REGISTRY).filter(cookie => cookie.requiresConsent);
}

/**
 * Get essential cookies
 */
export function getEssentialCookies(): CookieDefinition[] {
  return getCookiesByCategory('essential');
}

/**
 * Current consent version (increment when cookie policy changes significantly)
 */
export const CONSENT_VERSION = '1.0';

/**
 * Consent expiry duration in milliseconds (13 months)
 */
export const CONSENT_EXPIRY_MS = 13 * 30 * 24 * 60 * 60 * 1000;

