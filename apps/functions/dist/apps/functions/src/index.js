"use strict";
/**
 * NDC Calculator Cloud Functions
 * Main entry point for Firebase Cloud Functions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const _api_contracts_1 = require("@api-contracts");
const health_1 = require("./api/v1/health");
const calculate_1 = require("./api/v1/calculate");
const validate_1 = require("./api/v1/middlewares/validate");
const error_1 = require("./api/v1/middlewares/error");
const rateLimit_1 = require("./api/v1/middlewares/rateLimit");
const redact_1 = require("./api/v1/middlewares/redact");
const _core_config_1 = require("@core-config");
const _core_guardrails_1 = require("@core-guardrails");
const logger = (0, _core_guardrails_1.createLogger)({ service: 'functions-main' });
// Create Express app
const app = (0, express_1.default)();
// Global middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: (0, _core_config_1.getCorsOrigins)() }));
app.use(express_1.default.json());
app.use(redact_1.redactionMiddleware);
// Routes
app.get('/v1/health', (0, error_1.asyncHandler)(health_1.healthCheck));
app.post('/v1/calculate', rateLimit_1.rateLimitMiddleware, (0, validate_1.validateRequest)(_api_contracts_1.CalculateRequestSchema), (0, error_1.asyncHandler)(calculate_1.calculateHandler));
// Error handling
app.use(error_1.errorHandler);
// Export Cloud Function
exports.api = functions
    .region('us-central1')
    .runWith({
    memory: '512MB',
    timeoutSeconds: 60,
})
    .https
    .onRequest(app);
logger.info('NDC Calculator functions initialized');
//# sourceMappingURL=index.js.map