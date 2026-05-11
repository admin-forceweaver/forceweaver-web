'use client';

import { ConsentStorage } from './consentStorage';
import { ConsentLogger } from './consentLogger';
import { ConsentState, ConsentCategory, ConsentAction, ConsentMethod, ConsentChangeEvent } from './types';
import { CONSENT_VERSION } from './cookieRegistry';

type ConsentChangeListener = (event: ConsentChangeEvent) => void;

/**
 * Core consent management service
 * Centralizes all consent logic and provides event system
 */
export class ConsentManager {
  private static listeners: Set<ConsentChangeListener> = new Set();
  private static sessionId: string | null = null;

  /**
   * Initialize consent manager
   * Call this once at app startup
   */
  static initialize(): void {
    // Generate session ID if not exists
    if (!this.sessionId) {
      this.sessionId = this.generateSessionId();
    }

    // Check for expired consent
    const current = ConsentStorage.load();
    if (current && current.expiresAt < Date.now()) {
      console.log('[ConsentManager] Consent expired, clearing');
      ConsentStorage.clear();
    }
  }

  /**
   * Get current consent state
   */
  static getConsent(): ConsentState | null {
    return ConsentStorage.load();
  }

  /**
   * Save consent decision
   */
  static async saveConsent(
    consent: Partial<ConsentState>,
    action: ConsentAction,
    method: ConsentMethod = 'banner',
    userId?: string
  ): Promise<void> {
    const previous = ConsentStorage.load();
    
    // Save to client-side storage
    ConsentStorage.save(consent);
    
    const current = ConsentStorage.load();
    if (!current) {
      throw new Error('Failed to save consent');
    }

    // Determine what changed
    const changedCategories: ConsentCategory[] = [];
    if (previous?.analytics !== current.analytics) changedCategories.push('analytics');
    if (previous?.marketing !== current.marketing) changedCategories.push('marketing');
    if (previous?.preferences !== current.preferences) changedCategories.push('preferences');

    // Emit change event
    const event: ConsentChangeEvent = {
      previous,
      current,
      changedCategories,
    };
    this.emitChange(event);

    // Log to server (async, non-blocking)
    this.logToServer(current, action, method, userId).catch(error => {
      console.error('[ConsentManager] Failed to log consent:', error);
    });
  }

  /**
   * Accept all consent categories
   */
  static async acceptAll(method: ConsentMethod = 'banner', userId?: string): Promise<void> {
    await this.saveConsent(
      {
        analytics: true,
        marketing: true,
        preferences: true,
      },
      'accept',
      method,
      userId
    );
  }

  /**
   * Decline all optional categories
   */
  static async declineAll(method: ConsentMethod = 'banner', userId?: string): Promise<void> {
    await this.saveConsent(
      {
        analytics: false,
        marketing: false,
        preferences: false,
      },
      'decline',
      method,
      userId
    );
  }

  /**
   * Withdraw consent (GDPR right to withdraw)
   */
  static async withdrawConsent(userId?: string): Promise<void> {
    const current = ConsentStorage.load();
    if (current) {
      await this.logToServer(current, 'withdraw', 'settings', userId);
    }
    ConsentStorage.clear();
    
    const event: ConsentChangeEvent = {
      previous: current,
      current: {
        version: CONSENT_VERSION,
        analytics: false,
        marketing: false,
        preferences: false,
        timestamp: Date.now(),
        expiresAt: Date.now(),
      },
      changedCategories: ['analytics', 'marketing', 'preferences'],
    };
    this.emitChange(event);
  }

  /**
   * Check if user has consented to specific category
   */
  static hasConsent(category: ConsentCategory): boolean {
    return ConsentStorage.hasConsent(category);
  }

  /**
   * Check if any consent decision has been made
   */
  static hasDecided(): boolean {
    return ConsentStorage.exists();
  }

  /**
   * Subscribe to consent changes
   */
  static onChange(listener: ConsentChangeListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emit consent change event to all listeners
   */
  private static emitChange(event: ConsentChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[ConsentManager] Listener error:', error);
      }
    });
  }

  /**
   * Log consent to server
   */
  private static async logToServer(
    consent: ConsentState,
    action: ConsentAction,
    method: ConsentMethod,
    userId?: string
  ): Promise<void> {
    await ConsentLogger.log({
      userId,
      sessionId: this.sessionId || this.generateSessionId(),
      consentVersion: consent.version,
      analytics: consent.analytics,
      marketing: consent.marketing,
      preferences: consent.preferences,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      action,
      pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      consentMethod: method,
    });
  }

  /**
   * Generate a unique session ID for anonymous users
   */
  private static generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${randomStr}`;
  }

  /**
   * Get consent age in days
   */
  static getConsentAge(): number | null {
    return ConsentStorage.getConsentAge();
  }

  /**
   * Check if consent needs refresh (> 12 months)
   */
  static needsRefresh(): boolean {
    const age = this.getConsentAge();
    if (age === null) return false;
    return age > 365; // 12 months
  }
}

