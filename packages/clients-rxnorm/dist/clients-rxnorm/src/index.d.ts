/**
 * RxNorm Client Package
 * Public API façade for drug normalization
 */
export { nameToRxCui, rxcuiToNdcs, getNdcsForRxcui, getAlternativeDrugs, type NormalizationOptions, type RxCuiResult, type NdcInfo, type FetchOptions, } from "./facade";
export type { RelatedDrug } from "./internal/alternativeFinder";
export { nameToRxCuiCached, rxcuiToNdcsCached, initRxNormCache, invalidateDrugCache, invalidateRxCUICache, } from "./cachedFacade";
