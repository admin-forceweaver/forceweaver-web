import { ConsentLogEntry } from './types';

/**
 * Client-side consent is stored locally (ConsentStorage).
 * This marketing site does not persist consent events to a database.
 */
export class ConsentLogger {
  static async log(entry: Omit<ConsentLogEntry, 'timestamp'>): Promise<boolean> {
    void entry;
    return true;
  }

  static async getHistory(userId: string): Promise<ConsentLogEntry[]> {
    void userId;
    return [];
  }

  static async getLatestConsent(userId: string): Promise<ConsentLogEntry | null> {
    void userId;
    return null;
  }
}
