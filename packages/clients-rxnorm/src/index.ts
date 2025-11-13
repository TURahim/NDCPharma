/**
 * RxNorm Client Package
 * Public API façade for drug normalization
 */

// Public exports - simple MVP interface (non-cached)
export {
  nameToRxCui,
  rxcuiToNdcs,
  getNdcsForRxcui,
  getAlternativeDrugs,
  type NormalizationOptions,
  type RxCuiResult,
  type NdcInfo,
  type FetchOptions,
} from "./facade";

// Export alternative finder types
export type { RelatedDrug } from "./internal/alternativeFinder";

// Cached interface exports (requires Firestore initialization)
export {
  nameToRxCuiCached,
  rxcuiToNdcsCached,
  initRxNormCache,
  invalidateDrugCache,
  invalidateRxCUICache,
} from "./cachedFacade";

