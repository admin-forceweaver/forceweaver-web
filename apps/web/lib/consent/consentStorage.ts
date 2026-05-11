import Cookies from 'js-cookie';
import { ConsentState, ConsentCategory } from './types';
import { CONSENT_VERSION, CONSENT_EXPIRY_MS } from './cookieRegistry';

const CONSENT_COOKIE_NAME = 'forceweaver-consent';
const CONSENT_STORAGE_KEY = 'forceweaver-consent-backup';

/**
 * Client-side consent storage manager
 * Uses cookies as primary storage with localStorage backup
 */
export class ConsentStorage {
  /**
   * Save consent state to cookies and localStorage
   */
  static save(consent: Partial<ConsentState>): void {
    const now = Date.now();
    const expiresAt = now + CONSENT_EXPIRY_MS;

    const state: ConsentState = {
      version: CONSENT_VERSION,
      analytics: consent.analytics ?? false,
      marketing: consent.marketing ?? false,
      preferences: consent.preferences ?? false,
      timestamp: now,
      expiresAt,
    };

    // Save to cookie (13 months)
    Cookies.set(CONSENT_COOKIE_NAME, JSON.stringify(state), {
      expires: 395, // 13 months in days
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    });

    // Backup to localStorage (for cookie clearing scenarios)
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('[Consent] localStorage unavailable:', error);
    }
  }

  /**
   * Load consent state from cookies or localStorage
   */
  static load(): ConsentState | null {
    // Try cookie first
    const cookieValue = Cookies.get(CONSENT_COOKIE_NAME);
    if (cookieValue) {
      try {
        const state = JSON.parse(cookieValue) as ConsentState;
        
        // Check if expired
        if (state.expiresAt < Date.now()) {
          this.clear();
          return null;
        }
        
        // Check version mismatch (require re-consent)
        if (state.version !== CONSENT_VERSION) {
          this.clear();
          return null;
        }
        
        return state;
      } catch (error) {
        console.error('[Consent] Failed to parse cookie:', error);
      }
    }

    // Fallback to localStorage
    try {
      const localValue = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (localValue) {
        const state = JSON.parse(localValue) as ConsentState;
        
        // Re-validate and restore to cookie
        if (state.expiresAt >= Date.now() && state.version === CONSENT_VERSION) {
          this.save(state); // Restore to cookie
          return state;
        }
      }
    } catch (error) {
      console.warn('[Consent] Failed to load from localStorage:', error);
    }

    return null;
  }

  /**
   * Check if user has consented to a specific category
   */
  static hasConsent(category: ConsentCategory): boolean {
    const state = this.load();
    if (!state) return false;
    return state[category] === true;
  }

  /**
   * Update specific consent category
   */
  static updateCategory(category: ConsentCategory, value: boolean): void {
    const current = this.load() || {
      analytics: false,
      marketing: false,
      preferences: false,
    };
    
    this.save({
      ...current,
      [category]: value,
    });
  }

  /**
   * Clear all consent data
   */
  static clear(): void {
    Cookies.remove(CONSENT_COOKIE_NAME);
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch (error) {
      console.warn('[Consent] localStorage unavailable:', error);
    }
  }

  /**
   * Check if consent exists (any consent decision made)
   */
  static exists(): boolean {
    return this.load() !== null;
  }

  /**
   * Get consent age in days
   */
  static getConsentAge(): number | null {
    const state = this.load();
    if (!state) return null;
    
    const ageMs = Date.now() - state.timestamp;
    return Math.floor(ageMs / (24 * 60 * 60 * 1000));
  }
}

