/**
 * RxNorm Client Package
 * Public API façade for drug normalization
 */

// Public exports - simple MVP interface
export {
  nameToRxCui,
  rxcuiToNdcs,
  type NormalizationOptions,
  type RxCuiResult,
  type NdcInfo,
  type FetchOptions,
} from "./facade";

