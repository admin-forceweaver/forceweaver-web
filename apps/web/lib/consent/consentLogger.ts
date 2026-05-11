import { createClient } from '@/lib/supabase/client';
import { ConsentLogEntry, ConsentAction } from './types';

/**
 * Server-side consent logging for compliance audit trail
 */
export class ConsentLogger {
  /**
   * Log consent decision to Supabase
   */
  static async log(entry: Omit<ConsentLogEntry, 'timestamp'>): Promise<boolean> {
    try {
      const supabase = await createClient();
      
      const logEntry = {
        user_id: entry.userId || null,
        session_id: entry.sessionId,
        consent_version: entry.consentVersion,
        analytics: entry.analytics,
        marketing: entry.marketing,
        preferences: entry.preferences,
        ip_address: entry.ipAddress || null,
        user_agent: entry.userAgent || null,
        action: entry.action,
        page_url: entry.pageUrl || null,
        consent_method: entry.consentMethod || null,
        timestamp: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('consent_logs')
        .insert([logEntry]);

      if (error) {
        console.error('[ConsentLogger] Failed to log consent:', error);
        return false;
      }

      console.log('[ConsentLogger] Consent logged successfully');
      return true;
    } catch (error) {
      console.error('[ConsentLogger] Exception during logging:', error);
      return false;
    }
  }

  /**
   * Get user's consent history
   */
  static async getHistory(userId: string): Promise<ConsentLogEntry[]> {
    try {
      const supabase = await createClient();
      
      const { data, error } = await supabase
        .from('consent_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[ConsentLogger] Failed to fetch history:', error);
        return [];
      }

      return data.map(row => ({
        userId: row.user_id,
        sessionId: row.session_id,
        consentVersion: row.consent_version,
        analytics: row.analytics,
        marketing: row.marketing,
        preferences: row.preferences,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.timestamp,
        action: row.action as ConsentAction,
        pageUrl: row.page_url,
        consentMethod: row.consent_method,
      }));
    } catch (error) {
      console.error('[ConsentLogger] Exception during history fetch:', error);
      return [];
    }
  }

  /**
   * Get latest consent for user
   */
  static async getLatestConsent(userId: string): Promise<ConsentLogEntry | null> {
    const history = await this.getHistory(userId);
    return history.length > 0 ? history[0] : null;
  }
}

