"use strict";
/**
 * RxNorm Client Package
 * Public API façade for drug normalization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateRxCUICache = exports.invalidateDrugCache = exports.initRxNormCache = exports.rxcuiToNdcsCached = exports.nameToRxCuiCached = exports.getNdcsForRxcui = exports.rxcuiToNdcs = exports.nameToRxCui = void 0;
// Public exports - simple MVP interface (non-cached)
var facade_1 = require("./facade");
Object.defineProperty(exports, "nameToRxCui", { enumerable: true, get: function () { return facade_1.nameToRxCui; } });
Object.defineProperty(exports, "rxcuiToNdcs", { enumerable: true, get: function () { return facade_1.rxcuiToNdcs; } });
Object.defineProperty(exports, "getNdcsForRxcui", { enumerable: true, get: function () { return facade_1.getNdcsForRxcui; } });
// Cached interface exports (requires Firestore initialization)
var cachedFacade_1 = require("./cachedFacade");
Object.defineProperty(exports, "nameToRxCuiCached", { enumerable: true, get: function () { return cachedFacade_1.nameToRxCuiCached; } });
Object.defineProperty(exports, "rxcuiToNdcsCached", { enumerable: true, get: function () { return cachedFacade_1.rxcuiToNdcsCached; } });
Object.defineProperty(exports, "initRxNormCache", { enumerable: true, get: function () { return cachedFacade_1.initRxNormCache; } });
Object.defineProperty(exports, "invalidateDrugCache", { enumerable: true, get: function () { return cachedFacade_1.invalidateDrugCache; } });
Object.defineProperty(exports, "invalidateRxCUICache", { enumerable: true, get: function () { return cachedFacade_1.invalidateRxCUICache; } });
