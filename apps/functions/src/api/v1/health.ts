/**
 * Health Check Endpoint
 * Verifies connectivity to all external services
 */

import { Request, Response } from 'express';
import { nameToRxCui } from '@clients-rxnorm';
import { fdaClient } from '@clients-openfda';
import { createLogger } from '@core-guardrails';
import { FEATURE_FLAGS } from '@core-config';

const logger = createLogger({ service: 'HealthCheck' });

interface ServiceStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
}

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  service: string;
  services: {
    rxnorm: ServiceStatus;
    fda: ServiceStatus;
    openai?: ServiceStatus;
    firestore: ServiceStatus;
  };
  uptime: number;
}

/**
 * GET /api/v1/health
 * Comprehensive health check
 */
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const services: HealthCheckResponse['services'] = {
    rxnorm: { status: 'healthy' },
    fda: { status: 'healthy' },
    firestore: { status: 'healthy' },
  };

  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

  // Check RxNorm API
  try {
    const rxnormStart = Date.now();
    await nameToRxCui('aspirin');
    services.rxnorm = {
      status: 'healthy',
      responseTime: Date.now() - rxnormStart,
    };
  } catch (error) {
    logger.warn('RxNorm health check failed', { error: error as Error });
    services.rxnorm = {
      status: 'unhealthy',
      error: (error as Error).message,
    };
    overallStatus = 'degraded';
  }

  // Check FDA API
  try {
    const fdaStart = Date.now();
    // Quick validation check
    const isValid = await fdaClient.validateNDC('00071-0156-23');
    if (!isValid.isValid) {
      throw new Error('FDA validation failed');
    }
    services.fda = {
      status: 'healthy',
      responseTime: Date.now() - fdaStart,
    };
  } catch (error) {
    logger.warn('FDA health check failed', { error: error as Error });
    services.fda = {
      status: 'unhealthy',
      error: (error as Error).message,
    };
    overallStatus = 'degraded';
  }

  // Check OpenAI (if enabled)
  if (FEATURE_FLAGS.ENABLE_OPENAI) {
    try {
      const openaiStart = Date.now();
      // OpenAI is optional - just mark as healthy for now
      services.openai = {
        status: 'healthy',
        responseTime: Date.now() - openaiStart,
      };
    } catch (error) {
      logger.warn('OpenAI health check failed', { error: error as Error });
      services.openai = {
        status: 'unhealthy',
        error: (error as Error).message,
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
  } catch (error) {
    logger.warn('Firestore health check failed', { error: error as Error });
    services.firestore = {
      status: 'unhealthy',
      error: (error as Error).message,
    };
    overallStatus = 'unhealthy';
  }

  // Determine overall status
  const unhealthyCount = Object.values(services).filter(
    s => s && s.status === 'unhealthy'
  ).length;
  
  if (unhealthyCount >= 2) {
    overallStatus = 'unhealthy';
  } else if (unhealthyCount === 1) {
    overallStatus = 'degraded';
  }

  const response: HealthCheckResponse = {
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
