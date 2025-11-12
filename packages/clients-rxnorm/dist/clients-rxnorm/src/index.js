"use strict";
/**
 * RxNorm Client Package
 * Public API façade for drug normalization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rxcuiToNdcs = exports.nameToRxCui = void 0;
// Public exports - simple MVP interface
var facade_1 = require("./facade");
Object.defineProperty(exports, "nameToRxCui", { enumerable: true, get: function () { return facade_1.nameToRxCui; } });
Object.defineProperty(exports, "rxcuiToNdcs", { enumerable: true, get: function () { return facade_1.rxcuiToNdcs; } });
