/**
 * Cookie & Consent Management Types
 * Provides type safety for the entire consent management system
 */

export type ConsentCategory = 'analytics' | 'marketing' | 'preferences';

export type ConsentAction = 'accept' | 'decline' | 'update' | 'withdraw';

export type ConsentMethod = 'banner' | 'settings' | 'dashboard';

export interface ConsentState {
  version: string;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  timestamp: number;
  expiresAt: number;
}

export interface ConsentLogEntry {
  userId?: string;
  sessionId: string;
  consentVersion: string;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  action: ConsentAction;
  pageUrl?: string;
  consentMethod?: ConsentMethod;
}

export interface CookieDefinition {
  name: string;
  category: 'essential' | ConsentCategory;
  purpose: string;
  duration: string;
  provider: string;
  requiresConsent: boolean;
}

export interface ConsentChangeEvent {
  previous: ConsentState | null;
  current: ConsentState;
  changedCategories: ConsentCategory[];
}

