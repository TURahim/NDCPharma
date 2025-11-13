/**
 * Calculation Logging Service
 * 
 * HIPAA-compliant audit trail for NDC calculations
 * - Write-once logging (tamper-proof)
 * - PHI-safe (no patient identifiers)
 * - Firestore-based persistence
 * - 7-year retention policy
 */

import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { createLogger } from './logger';
import { redactPHI } from './redaction';

const logger = createLogger({ service: 'CalculationLogger' });

export interface CalculationLogEntry {
  logId: string;
  timestamp: Date;
  userId?: string;
  correlationId?: string;
  request: {
    drug: {
      name?: string;
      rxcui?: string;
    };
    sig: {
      dose: number;
      frequency: number;
      unit: string;
    };
    daysSupply: number;
  };
  response: {
    success: boolean;
    totalQuantity?: number;
    recommendedPackages?: Array<{
      ndc: string;
      packageSize: number;
      unit: string;
    }>;
    overfillPercentage?: number;
    underfillPercentage?: number;
    warnings?: string[];
    error?: {
      code: string;
      message: string;
    };
  };
  executionTime: number;
  aiUsed: boolean;
  aiCost?: number;
  cacheHit: boolean;
  cacheDetails?: {
    hit: boolean;
    latency?: number;
  };
  warnings: string[];
  errors: Array<{
    code: string;
    message: string;
  }>;
}

/**
 * Log a calculation to Firestore for audit trail
 */
export async function logCalculation(
  db: Firestore,
  entry: CalculationLogEntry
): Promise<void> {
  try {
    // Redact any potential PHI from the log entry
    const redactedEntry = {
      ...entry,
      request: {
        ...entry.request,
        drug: {
          ...entry.request.drug,
          name: entry.request.drug.name ? redactPHI(entry.request.drug.name) : undefined,
        },
      },
      response: {
        ...entry.response,
        ...(entry.response.error && {
          error: {
            code: entry.response.error.code,
            message: redactPHI(entry.response.error.message) as string,
          },
        }),
      },
      warnings: entry.warnings.map((w) => redactPHI(w) as string),
      errors: entry.errors.map((e) => ({
        code: e.code,
        message: redactPHI(e.message) as string,
      })),
      timestamp: FieldValue.serverTimestamp(),
    };

    await db.collection('calculationLogs').add(redactedEntry);

    logger.debug('Calculation logged', {
      logId: entry.logId,
      userId: entry.userId,
      correlationId: entry.correlationId,
      success: entry.response.success,
      executionTime: entry.executionTime,
    });
  } catch (error) {
    // Fail soft - don't break the request if logging fails
    logger.error('Failed to log calculation', error as Error, {
      logId: entry.logId,
      userId: entry.userId,
    });
  }
}

/**
 * Get calculation logs for a specific user (HIPAA-compliant access)
 */
export async function getUserCalculationLogs(
  db: Firestore,
  userId: string,
  options: {
    limit?: number;
    startAfter?: Date;
  } = {}
): Promise<CalculationLogEntry[]> {
  try {
    let query = db
      .collection('calculationLogs')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc');

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.startAfter) {
      query = query.startAfter(options.startAfter);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate(),
    })) as CalculationLogEntry[];
  } catch (error) {
    logger.error('Failed to get user calculation logs', error as Error, {
      userId,
    });
    return [];
  }
}

/**
 * Get calculation statistics (for analytics)
 */
export async function getCalculationStats(
  db: Firestore,
  options: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  } = {}
): Promise<{
  totalCalculations: number;
  successRate: number;
  averageExecutionTime: number;
  cacheHitRate: number;
  aiUsageRate: number;
  topDrugs: Array<{ drugName: string; count: number }>;
}> {
  try {
    let query = db.collection('calculationLogs');

    if (options.startDate) {
      query = query.where('timestamp', '>=', options.startDate) as any;
    }

    if (options.endDate) {
      query = query.where('timestamp', '<=', options.endDate) as any;
    }

    if (options.userId) {
      query = query.where('userId', '==', options.userId) as any;
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return {
        totalCalculations: 0,
        successRate: 0,
        averageExecutionTime: 0,
        cacheHitRate: 0,
        aiUsageRate: 0,
        topDrugs: [],
      };
    }

    const logs = snapshot.docs.map((doc) => doc.data() as CalculationLogEntry);

    const totalCalculations = logs.length;
    const successCount = logs.filter((l) => l.response.success).length;
    const cacheHits = logs.filter((l) => l.cacheHit).length;
    const aiUsed = logs.filter((l) => l.aiUsed).length;
    const totalExecutionTime = logs.reduce((sum, l) => sum + l.executionTime, 0);

    // Count drug usage
    const drugCounts = new Map<string, number>();
    logs.forEach((log) => {
      const drugName = log.request.drug.name || log.request.drug.rxcui || 'Unknown';
      drugCounts.set(drugName, (drugCounts.get(drugName) || 0) + 1);
    });

    const topDrugs = Array.from(drugCounts.entries())
      .map(([drugName, count]) => ({ drugName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCalculations,
      successRate: successCount / totalCalculations,
      averageExecutionTime: totalExecutionTime / totalCalculations,
      cacheHitRate: cacheHits / totalCalculations,
      aiUsageRate: aiUsed / totalCalculations,
      topDrugs,
    };
  } catch (error) {
    logger.error('Failed to get calculation stats', error as Error);
    return {
      totalCalculations: 0,
      successRate: 0,
      averageExecutionTime: 0,
      cacheHitRate: 0,
      aiUsageRate: 0,
      topDrugs: [],
    };
  }
}

