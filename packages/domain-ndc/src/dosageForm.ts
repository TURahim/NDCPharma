/**
 * Dosage Form Normalization Utilities
 * Maps various dosage form representations to normalized families
 */

import { DosageFormType } from './types';

export type DosageFormFamily = 'solid' | 'liquid' | 'other';

/**
 * Dosage form mapping table
 */
const DOSAGE_FORM_MAP: Record<string, DosageFormFamily> = {
  // Solid forms
  'tablet': 'solid',
  'capsule': 'solid',
  'caplet': 'solid',
  'chewable': 'solid',
  'lozenge': 'solid',
  'pill': 'solid',
  'granule': 'solid',
  'powder': 'solid',
  
  // Liquid forms
  'solution': 'liquid',
  'suspension': 'liquid',
  'syrup': 'liquid',
  'elixir': 'liquid',
  'emulsion': 'liquid',
  'drops': 'liquid',
  'liquid': 'liquid',
  
  // Other forms
  'inhaler': 'other',
  'spray': 'other',
  'aerosol': 'other',
  'injection': 'other',
  'injectable': 'other',
  'patch': 'other',
  'cream': 'other',
  'ointment': 'other',
  'gel': 'other',
  'foam': 'other',
};

/**
 * Normalize dosage form to a family
 * @param form - Dosage form string (e.g., "TABLET", "Oral Capsule")
 * @returns Normalized dosage form family
 */
export function normalizeDosageForm(form: string): DosageFormFamily {
  if (!form) return 'other';
  
  const normalized = form.toLowerCase().trim();
  
  // Check for exact matches first
  for (const [key, value] of Object.entries(DOSAGE_FORM_MAP)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  
  return 'other';
}

/**
 * Check if two dosage forms are compatible
 * @param form1 - First dosage form
 * @param form2 - Second dosage form
 * @returns True if forms are in the same family
 */
export function areDosageFormsCompatible(form1: string, form2: string): boolean {
  const family1 = normalizeDosageForm(form1);
  const family2 = normalizeDosageForm(form2);
  
  return family1 === family2;
}

/**
 * Filter packages by dosage form family
 * @param packages - Array of packages with dosageForm property
 * @param targetForm - Target dosage form
 * @returns Filtered packages
 */
export function filterByDosageFormFamily<T extends { dosageForm: string }>(
  packages: T[],
  targetForm: string
): T[] {
  const targetFamily = normalizeDosageForm(targetForm);
  
  return packages.filter(pkg => {
    const pkgFamily = normalizeDosageForm(pkg.dosageForm);
    return pkgFamily === targetFamily;
  });
}

/**
 * Get dosage form type (SOLID, LIQUID, INJECTABLE, SPECIAL)
 * 
 * @param dosageForm - Dosage form string
 * @returns Dosage form type enum
 */
export function getDosageFormType(dosageForm: string): DosageFormType {
  if (!dosageForm) {
    return DosageFormType.SPECIAL;
  }
  
  const normalized = dosageForm.toLowerCase().trim();
  
  // Check for solid forms
  const solidForms = ['tablet', 'capsule', 'caplet', 'chewable', 'lozenge', 'pill'];
  for (const form of solidForms) {
    if (normalized.includes(form)) {
      return DosageFormType.SOLID;
    }
  }
  
  // Check for liquid forms
  const liquidForms = ['solution', 'suspension', 'syrup', 'elixir', 'emulsion', 'drops', 'liquid'];
  for (const form of liquidForms) {
    if (normalized.includes(form)) {
      return DosageFormType.LIQUID;
    }
  }
  
  // Check for injectable forms
  const injectableForms = ['injection', 'injectable', 'vial', 'ampule', 'syringe'];
  for (const form of injectableForms) {
    if (normalized.includes(form)) {
      return DosageFormType.INJECTABLE;
    }
  }
  
  // Default to special
  return DosageFormType.SPECIAL;
}

/**
 * Check if dosage form is liquid or injectable (requires mL-based calculations)
 * 
 * @param dosageForm - Dosage form string
 * @returns True if liquid or injectable
 */
export function isLiquidDosageForm(dosageForm: string): boolean {
  const type = getDosageFormType(dosageForm);
  return type === DosageFormType.LIQUID || type === DosageFormType.INJECTABLE;
}

