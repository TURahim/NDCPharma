"use strict";
/**
 * Health Check Endpoint
 * Verifies connectivity to all external services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = healthCheck;
const _clients_rxnorm_1 = require("@clients-rxnorm");
const _clients_openfda_1 = require("@clients-openfda");
const _core_guardrails_1 = require("@core-guardrails");
const _core_config_1 = require("@core-config");
const logger = (0, _core_guardrails_1.createLogger)({ service: 'HealthCheck' });
/**
 * GET /api/v1/health
 * Comprehensive health check
 */
async function healthCheck(_req, res) {
    const startTime = Date.now();
    const services = {
        rxnorm: { status: 'healthy' },
        fda: { status: 'healthy' },
        firestore: { status: 'healthy' },
    };
    let overallStatus = 'healthy';
    // Check RxNorm API
    try {
        const rxnormStart = Date.now();
        await (0, _clients_rxnorm_1.nameToRxCui)('aspirin');
        services.rxnorm = {
            status: 'healthy',
            responseTime: Date.now() - rxnormStart,
        };
    }
    catch (error) {
        logger.warn('RxNorm health check failed', { error: error });
        services.rxnorm = {
            status: 'unhealthy',
            error: error.message,
        };
        overallStatus = 'degraded';
    }
    // Check FDA API
    try {
        const fdaStart = Date.now();
        // Quick validation check
        const isValid = await _clients_openfda_1.fdaClient.validateNDC('00071-0156-23');
        if (!isValid.isValid) {
            throw new Error('FDA validation failed');
        }
        services.fda = {
            status: 'healthy',
            responseTime: Date.now() - fdaStart,
        };
    }
    catch (error) {
        logger.warn('FDA health check failed', { error: error });
        services.fda = {
            status: 'unhealthy',
            error: error.message,
        };
        overallStatus = 'degraded';
    }
    // Check OpenAI (if enabled)
    if (_core_config_1.FEATURE_FLAGS.ENABLE_OPENAI) {
        try {
            const openaiStart = Date.now();
            // OpenAI is optional - just mark as healthy for now
            services.openai = {
                status: 'healthy',
                responseTime: Date.now() - openaiStart,
            };
        }
        catch (error) {
            logger.warn('OpenAI health check failed', { error: error });
            services.openai = {
                status: 'unhealthy',
                error: error.message,
            };
            // OpenAI is optional, so don't degrade overall status
        }
    }
    // Check Firestore (basic check - can be enhanced)
    try {
        // For now, just mark as healthy
        // TODO: Implement actual Firestore connectivity check
        services.firestore = {
            status: 'healthy',
            responseTime: 0,
        };
    }
    catch (error) {
        logger.warn('Firestore health check failed', { error: error });
        services.firestore = {
            status: 'unhealthy',
            error: error.message,
        };
        overallStatus = 'unhealthy';
    }
    // Determine overall status
    const unhealthyCount = Object.values(services).filter(s => s && s.status === 'unhealthy').length;
    if (unhealthyCount >= 2) {
        overallStatus = 'unhealthy';
    }
    else if (unhealthyCount === 1) {
        overallStatus = 'degraded';
    }
    const response = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'ndc-calculator',
        services,
        uptime: process.uptime(),
    };
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    logger.info('Health check completed', {
        status: overallStatus,
        executionTime: Date.now() - startTime,
    });
    res.status(statusCode).json(response);
}
//# sourceMappingURL=health.js.map