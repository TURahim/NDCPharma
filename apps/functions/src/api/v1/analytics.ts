/**
 * Analytics Dashboard Endpoint (Admin Only)
 * 
 * Provides usage metrics, performance statistics, and business intelligence
 * - User activity stats
 * - Calculation metrics
 * - Cache performance
 * - API health
 * - Top drugs
 */

import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from './middlewares/auth';
import { getCalculationStats } from '@core-guardrails';
import { createLogger } from '@core-guardrails';

const logger = createLogger({ service: 'AnalyticsEndpoint' });

/**
 * Get overall system analytics
 * Admin only - comprehensive system metrics
 */
export async function getSystemAnalytics(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const startTime = Date.now();

  try {
    const db = admin.firestore();

    // Get date range from query params (default: last 30 days)
    const daysBack = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Parallel queries for better performance
    const [calculationStats, userStats, cacheStats] = await Promise.all([
      getCalculationStats(db, { startDate }),
      getUserActivityStats(db),
      getCachePerformance(db, startDate),
    ]);

    const executionTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      data: {
        period: {
          days: daysBack,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
        calculations: calculationStats,
        users: userStats,
        cache: cacheStats,
      },
      metadata: {
        executionTime,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to get system analytics', error as Error, {
      userId: req.user?.uid,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to retrieve system analytics',
      },
    });
  }
}

/**
 * Get user activity statistics
 */
async function getUserActivityStats(db: admin.firestore.Firestore): Promise<{
  totalUsers: number;
  activeUsers: number;
  usersByRole: Record<string, number>;
  topUsers: Array<{ userId: string; calculationCount: number }>;
}> {
  try {
    const usersSnapshot = await db.collection('users').get();
    const activitySnapshot = await db.collection('userActivity').get();

    const totalUsers = usersSnapshot.size;
    const activeUsers = activitySnapshot.docs.filter(
      (doc) => doc.data().isActive
    ).length;

    // Count users by role
    const usersByRole: Record<string, number> = {};
    usersSnapshot.docs.forEach((doc) => {
      const role = doc.data().role || 'unknown';
      usersByRole[role] = (usersByRole[role] || 0) + 1;
    });

    // Get top users by calculation count
    const topUsers = activitySnapshot.docs
      .map((doc) => ({
        userId: doc.id,
        calculationCount: doc.data().calculationCount || 0,
      }))
      .sort((a, b) => b.calculationCount - a.calculationCount)
      .slice(0, 10);

    return {
      totalUsers,
      activeUsers,
      usersByRole,
      topUsers,
    };
  } catch (error) {
    logger.error('Failed to get user activity stats', error as Error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      usersByRole: {},
      topUsers: [],
    };
  }
}

/**
 * Get cache performance metrics
 */
async function getCachePerformance(
  db: admin.firestore.Firestore,
  startDate: Date
): Promise<{
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  averageLatency: number;
}> {
  try {
    const logsSnapshot = await db
      .collection('calculationLogs')
      .where('timestamp', '>=', startDate)
      .get();

    if (logsSnapshot.empty) {
      return {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        hitRate: 0,
        averageLatency: 0,
      };
    }

    const logs = logsSnapshot.docs.map((doc) => doc.data());
    const totalRequests = logs.length;
    const cacheHits = logs.filter((log) => log.cacheHit).length;
    const cacheMisses = totalRequests - cacheHits;
    const hitRate = cacheHits / totalRequests;

    // Calculate average cache latency (if available)
    const cacheLatencies = logs
      .filter((log) => log.cacheDetails?.latency)
      .map((log) => log.cacheDetails.latency);

    const averageLatency =
      cacheLatencies.length > 0
        ? cacheLatencies.reduce((sum, lat) => sum + lat, 0) / cacheLatencies.length
        : 0;

    return {
      totalRequests,
      cacheHits,
      cacheMisses,
      hitRate,
      averageLatency,
    };
  } catch (error) {
    logger.error('Failed to get cache performance', error as Error);
    return {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      averageLatency: 0,
    };
  }
}

/**
 * Get user-specific analytics
 * Users can only see their own analytics, admins can see any user
 */
export async function getUserAnalytics(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const startTime = Date.now();

  try {
    const requestedUserId = req.params.userId;
    const currentUserId = req.user?.uid;
    const isAdmin = req.user?.role === 'admin';

    // Authorization check: users can only see their own analytics
    if (requestedUserId !== currentUserId && !isAdmin) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only view your own analytics',
        },
      });
      return;
    }

    const db = admin.firestore();

    // Get date range from query params (default: last 30 days)
    const daysBack = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get user's calculation statistics
    const stats = await getCalculationStats(db, {
      startDate,
      userId: requestedUserId,
    });

    // Get user activity record
    const activityDoc = await db.collection('userActivity').doc(requestedUserId).get();
    const activity = activityDoc.exists ? activityDoc.data() : null;

    const executionTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      data: {
        userId: requestedUserId,
        period: {
          days: daysBack,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
        calculations: stats,
        activity: activity
          ? {
              totalCalculations: activity.calculationCount,
              totalRequests: activity.totalRequests,
              currentHourRequests: activity.currentHourRequests,
              lastActive: activity.lastActiveAt?.toDate?.().toISOString(),
            }
          : null,
      },
      metadata: {
        executionTime,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to get user analytics', error as Error, {
      userId: req.user?.uid,
      requestedUserId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to retrieve user analytics',
      },
    });
  }
}

/**
 * Get API health metrics
 * Provides real-time health status of external services
 */
export async function getAPIHealthMetrics(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const startTime = Date.now();

  try {
    const db = admin.firestore();

    // Get recent calculation logs to analyze API health
    const recentLogsSnapshot = await db
      .collection('calculationLogs')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    if (recentLogsSnapshot.empty) {
      res.status(200).json({
        success: true,
        data: {
          message: 'No recent data available',
          errorRate: 0,
          averageResponseTime: 0,
        },
      });
      return;
    }

    const logs = recentLogsSnapshot.docs.map((doc) => doc.data());
    const totalRequests = logs.length;
    const errors = logs.filter((log) => !log.response.success);
    const errorRate = errors.length / totalRequests;
    const averageResponseTime =
      logs.reduce((sum, log) => sum + log.executionTime, 0) / totalRequests;

    // Group errors by type
    const errorsByType: Record<string, number> = {};
    errors.forEach((error) => {
      const code = error.response.error?.code || 'UNKNOWN';
      errorsByType[code] = (errorsByType[code] || 0) + 1;
    });

    const executionTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      data: {
        totalRequests,
        errorCount: errors.length,
        errorRate,
        averageResponseTime,
        errorsByType,
        period: 'Last 100 requests',
      },
      metadata: {
        executionTime,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to get API health metrics', error as Error);

    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to retrieve API health metrics',
      },
    });
  }
}

