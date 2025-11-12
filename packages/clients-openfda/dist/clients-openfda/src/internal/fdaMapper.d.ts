/**
 * FDA Data Mapper
 * Transforms FDA API responses to internal domain models
 */
import type { FDANDCResult, FDAPackaging, NDCPackage, PackageSize, ActiveIngredient, MarketingStatus, NDCDetails } from './fdaTypes';
/**
 * Map FDA NDC result to internal NDC package model
 * @param fdaResult FDA API result
 * @returns Normalized NDC package
 */
export declare function mapFDAResultToNDCPackage(fdaResult: FDANDCResult): NDCPackage[];
/**
 * Map FDA result to detailed NDC information
 * @param fdaResult FDA API result
 * @returns NDC details with extended information
 */
export declare function mapFDAResultToNDCDetails(fdaResult: FDANDCResult): NDCDetails | null;
/**
 * Parse package size from FDA description
 * Examples:
 * - "100 TABLET in 1 BOTTLE" → {quantity: 100, unit: "TABLET"}
 * - "30 mL in 1 BOTTLE" → {quantity: 30, unit: "ML"}
 * - "1 KIT" → {quantity: 1, unit: "KIT"}
 * - "2.5 mL in 1 VIAL" → {quantity: 2.5, unit: "ML"}
 *
 * @param description Package description from FDA
 * @returns Parsed package size
 */
export declare function parsePackageSize(description: string): PackageSize;
/**
 * Normalize unit strings to standard format
 * @param unit Raw unit string
 * @returns Normalized unit
 */
export declare function normalizeUnit(unit: string): string;
/**
 * Normalize NDC to 11-digit format with dashes (XXXXX-XXXX-XX)
 * @param ndc Raw NDC string
 * @returns Normalized NDC
 */
export declare function normalizeNDC(ndc: string): string;
/**
 * Normalize dosage form to standard format
 * @param dosageForm Raw dosage form string
 * @returns Normalized dosage form
 */
export declare function normalizeDosageForm(dosageForm: string): string;
/**
 * Map FDA active ingredients to internal model
 * @param ingredients FDA active ingredients
 * @returns Normalized active ingredients
 */
export declare function mapActiveIngredients(ingredients: Array<{
    name: string;
    strength: string;
}>): ActiveIngredient[];
/**
 * Parse marketing status from FDA packaging
 * @param packaging FDA packaging information
 * @returns Marketing status
 */
export declare function parseMarketingStatus(packaging: FDAPackaging): MarketingStatus;
/**
 * Parse FDA date (YYYYMMDD) to ISO 8601 format
 * @param fdaDate FDA date string (YYYYMMDD)
 * @returns ISO 8601 date string or undefined
 */
export declare function parseFDADate(fdaDate?: string): string | undefined;
/**
 * Extract RxCUI from OpenFDA metadata
 * @param openfda OpenFDA metadata
 * @returns First RxCUI or undefined
 */
export declare function extractRxCUI(openfda: any): string | undefined;
/**
 * Filter NDC packages by dosage form
 * @param packages Array of NDC packages
 * @param dosageForm Desired dosage form (e.g., "TABLET", "CAPSULE")
 * @returns Filtered packages
 */
export declare function filterByDosageForm(packages: NDCPackage[], dosageForm: string): NDCPackage[];
/**
 * Filter NDC packages by active status
 * @param packages Array of NDC packages
 * @returns Only active packages
 */
export declare function filterActivePackages(packages: NDCPackage[]): NDCPackage[];
/**
 * Sort NDC packages by package size (ascending)
 * @param packages Array of NDC packages
 * @returns Sorted packages
 */
export declare function sortByPackageSize(packages: NDCPackage[]): NDCPackage[];
/**
 * Group NDC packages by dosage form
 * @param packages Array of NDC packages
 * @returns Map of dosage form to packages
 */
export declare function groupByDosageForm(packages: NDCPackage[]): Map<string, NDCPackage[]>;
