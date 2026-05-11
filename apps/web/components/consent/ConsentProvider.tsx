'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConsentManager } from '@/lib/consent/consentManager';
import { ConsentState, ConsentCategory } from '@/lib/consent/types';

interface ConsentContextValue {
  consent: ConsentState | null;
  hasConsent: (category: ConsentCategory) => boolean;
  hasDecided: boolean;
  acceptAll: () => Promise<void>;
  declineAll: () => Promise<void>;
  updateConsent: (updates: Partial<ConsentState>) => Promise<void>;
  withdrawConsent: () => Promise<void>;
}

const ConsentContext = createContext<ConsentContextValue | undefined>(undefined);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [hasDecided, setHasDecided] = useState(false);

  useEffect(() => {
    // Initialize consent manager
    ConsentManager.initialize();
    
    // Load current consent
    const current = ConsentManager.getConsent();
    setConsent(current);
    setHasDecided(ConsentManager.hasDecided());

    // Subscribe to changes
    const unsubscribe = ConsentManager.onChange((event) => {
      setConsent(event.current);
      setHasDecided(true);
    });

    return unsubscribe;
  }, []);

  const value: ConsentContextValue = {
    consent,
    hasConsent: (category) => ConsentManager.hasConsent(category),
    hasDecided,
    acceptAll: async () => {
      await ConsentManager.acceptAll('banner');
    },
    declineAll: async () => {
      await ConsentManager.declineAll('banner');
    },
    updateConsent: async (updates) => {
      await ConsentManager.saveConsent(updates, 'update', 'settings');
    },
    withdrawConsent: async () => {
      await ConsentManager.withdrawConsent();
    },
  };

  return (
    <ConsentContext.Provider value={value}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);
  if (context === undefined) {
    throw new Error('useConsent must be used within ConsentProvider');
  }
  return context;
}

