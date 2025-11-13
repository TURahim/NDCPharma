/**
 * RxNorm Client Package
 * Public API façade for drug normalization
 */

// Public exports - simple MVP interface (non-cached)
export {
  nameToRxCui,
  rxcuiToNdcs,
  getNdcsForRxcui,
  type NormalizationOptions,
  type RxCuiResult,
  type NdcInfo,
  type FetchOptions,
} from "./facade";

// Cached interface exports (requires Firestore initialization)
export {
  nameToRxCuiCached,
  rxcuiToNdcsCached,
  initRxNormCache,
  invalidateDrugCache,
  invalidateRxCUICache,
} from "./cachedFacade";

