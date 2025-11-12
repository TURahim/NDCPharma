/**
 * Health Check Endpoint
 * Returns service status and version information
 */

import { Request, Response } from 'express';

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'ndc-calculator',
  };
  
  res.status(200).json(health);
}

