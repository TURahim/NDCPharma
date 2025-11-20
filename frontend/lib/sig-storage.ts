/**
 * SIG Storage Utility
 * Manages recent SIGs in localStorage for quick recall
 */

import { SIGData } from '@/types/workflow';

const RECENT_SIGS_KEY = 'ndc_recent_sigs';
const MAX_RECENT_SIGS = 10;

export interface StoredSIG extends SIGData {
  id: string;
  timestamp: number;
  drugName?: string;
  preview: string;
}

/**
 * Get recent SIGs from localStorage
 */
export function getRecentSIGs(): StoredSIG[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(RECENT_SIGS_KEY);
    if (!stored) return [];
    
    const sigs: StoredSIG[] = JSON.parse(stored);
    
    // Filter out SIGs older than 90 days
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    return sigs.filter(sig => sig.timestamp > ninetyDaysAgo);
  } catch (error) {
    console.error('Failed to load recent SIGs:', error);
    return [];
  }
}

/**
 * Save a SIG to recent history
 */
export function saveRecentSIG(sig: SIGData, drugName?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const recent = getRecentSIGs();
    
    // Generate preview text
    let preview = '';
    if (sig.mode === 'structured' && sig.structured) {
      preview = `${sig.structured.dose} ${sig.structured.unit} ${sig.structured.frequency}x daily for ${sig.daysSupply} days`;
    } else if (sig.freetext) {
      preview = sig.freetext.substring(0, 100);
    }
    
    const newSIG: StoredSIG = {
      ...sig,
      id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      drugName,
      preview,
    };
    
    // Check if this SIG already exists (same preview)
    const existingIndex = recent.findIndex(s => s.preview === preview);
    if (existingIndex !== -1) {
      // Update timestamp and move to front
      recent.splice(existingIndex, 1);
    }
    
    // Add to front of list
    recent.unshift(newSIG);
    
    // Keep only MAX_RECENT_SIGS
    const trimmed = recent.slice(0, MAX_RECENT_SIGS);
    
    localStorage.setItem(RECENT_SIGS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save recent SIG:', error);
  }
}

/**
 * Delete a SIG from recent history
 */
export function deleteRecentSIG(id: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const recent = getRecentSIGs();
    const filtered = recent.filter(sig => sig.id !== id);
    localStorage.setItem(RECENT_SIGS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete recent SIG:', error);
  }
}

/**
 * Clear all recent SIGs
 */
export function clearRecentSIGs(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(RECENT_SIGS_KEY);
  } catch (error) {
    console.error('Failed to clear recent SIGs:', error);
  }
}

