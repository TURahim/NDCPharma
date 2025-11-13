/**
 * Calculation Storage Service
 * Manages calculation history using localStorage (with future Firestore migration path)
 */

import { StoredCalculation, CalculationStats } from '@/types/calculation';

// Storage keys
const LOCAL_STORAGE_KEY = 'ndc_recent_calculations';
const MAX_LOCAL_ITEMS = 20; // Keep last 20 calculations

export class CalculationStorage {
  /**
   * Save a calculation to history
   * TODO: For authenticated users, also save to Firestore for cross-device sync
   */
  static async save(calculation: StoredCalculation): Promise<void> {
    try {
      // Get existing calculations
      const existing = await this.getRecent(MAX_LOCAL_ITEMS);

      // Add new calculation at the beginning
      const updated = [calculation, ...existing];

      // Keep only MAX_LOCAL_ITEMS
      const trimmed = updated.slice(0, MAX_LOCAL_ITEMS);

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
      }

      // TODO: If user is authenticated, also save to Firestore:
      // await saveToFirestore(calculation);
    } catch (error) {
      console.error('Error saving calculation:', error);
      // Graceful degradation - don't throw, just log
    }
  }

  /**
   * Get recent calculations
   * Returns most recent first
   * 
   * @param limit - Maximum number of calculations to return
   */
  static async getRecent(limit: number = 10): Promise<StoredCalculation[]> {
    try {
      if (typeof window === 'undefined') {
        return [];
      }

      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      
      if (!stored) {
        return [];
      }

      const calculations: StoredCalculation[] = JSON.parse(stored);

      // Sort by timestamp desc (most recent first)
      calculations.sort((a, b) => b.timestamp - a.timestamp);

      // Return limited results
      return calculations.slice(0, limit);

      // TODO: For authenticated users, merge with Firestore data:
      // const firestoreCalcs = await getFromFirestore(limit);
      // return mergeAndSort(localCalcs, firestoreCalcs);
    } catch (error) {
      console.error('Error retrieving calculations:', error);
      return [];
    }
  }

  /**
   * Get calculation by ID
   */
  static async getById(id: string): Promise<StoredCalculation | null> {
    try {
      const all = await this.getRecent(MAX_LOCAL_ITEMS);
      return all.find((calc) => calc.id === id) || null;
    } catch (error) {
      console.error('Error retrieving calculation by ID:', error);
      return null;
    }
  }

  /**
   * Clear all calculations
   */
  static async clear(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }

      // TODO: For authenticated users, also clear Firestore (with confirmation):
      // await clearFirestoreHistory();
    } catch (error) {
      console.error('Error clearing calculations:', error);
    }
  }

  /**
   * Get statistics about calculations
   */
  static async getStats(): Promise<CalculationStats> {
    try {
      const all = await this.getRecent(MAX_LOCAL_ITEMS);

      // Aggregate drug frequency
      const drugCounts = new Map<string, { count: number; lastUsed: number }>();

      all.forEach((calc) => {
        const drugName = calc.drug.name;
        const existing = drugCounts.get(drugName);

        if (existing) {
          drugCounts.set(drugName, {
            count: existing.count + 1,
            lastUsed: Math.max(existing.lastUsed, calc.timestamp),
          });
        } else {
          drugCounts.set(drugName, {
            count: 1,
            lastUsed: calc.timestamp,
          });
        }
      });

      // Convert to array and sort by count desc
      const mostFrequentDrugs = Array.from(drugCounts.entries())
        .map(([name, data]) => ({
          name,
          count: data.count,
          lastUsed: data.lastUsed,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        totalCalculations: all.length,
        lastCalculationTime: all[0]?.timestamp,
        mostFrequentDrugs,
      };
    } catch (error) {
      console.error('Error getting calculation stats:', error);
      return {
        totalCalculations: 0,
        mostFrequentDrugs: [],
      };
    }
  }

  /**
   * Search calculations by drug name
   */
  static async searchByDrug(drugName: string): Promise<StoredCalculation[]> {
    try {
      const all = await this.getRecent(MAX_LOCAL_ITEMS);
      const lowerQuery = drugName.toLowerCase();

      return all.filter((calc) =>
        calc.drug.name.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error searching calculations:', error);
      return [];
    }
  }

  /**
   * Check if storage is available and has space
   */
  static isAvailable(): boolean {
    try {
      if (typeof window === 'undefined') {
        return false;
      }

      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Helper function to generate a simple UUID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Helper function to format time ago
 * Examples: "Just now", "2 min ago", "3 hours ago", "Yesterday", "3 days ago"
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 10) {
    return 'Just now';
  } else if (seconds < 60) {
    return `${seconds} sec ago`;
  } else if (minutes < 60) {
    return `${minutes} min ago`;
  } else if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    // Format as date for older items
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

