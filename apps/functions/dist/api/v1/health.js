"use strict";
/**
 * Health Check Endpoint
 * Returns service status and version information
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = healthCheck;
async function healthCheck(req, res) {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'ndc-calculator',
    };
    res.status(200).json(health);
}
//# sourceMappingURL=health.js.map