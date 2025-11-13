/**
 * Authentication & Authorization Middleware
 * Implements Firebase Authentication and Role-Based Access Control (RBAC)
 */

import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { AppError, createLogger } from '@core-guardrails';

const logger = createLogger({ service: 'AuthMiddleware' });

/**
 * User roles for RBAC
 */
export enum UserRole {
  ADMIN = 'admin',
  PHARMACIST = 'pharmacist',
  PHARMACY_TECHNICIAN = 'pharmacy_technician',
}

/**
 * Extended request with authenticated user info
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: UserRole;
    emailVerified?: boolean;
  };
}

/**
 * Verify Firebase ID token and authenticate user
 * 
 * This middleware:
 * 1. Extracts Bearer token from Authorization header
 * 2. Verifies token with Firebase Admin SDK
 * 3. Attaches user info to request object
 * 4. Loads user role from Firestore
 * 
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export async function verifyToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(
        'AUTH_TOKEN_MISSING',
        'Authorization token is required',
        401
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Get user role from Firestore
    const userDoc = await admin
      .firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .get();

    const userData = userDoc.data();
    const role = userData?.role as UserRole | undefined;

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: role,
      emailVerified: decodedToken.email_verified,
    };

    logger.debug('User authenticated', {
      uid: req.user.uid,
      email: req.user.email,
      role: req.user.role,
    });

    next();
  } catch (error) {
    if ((error as any).code === 'auth/id-token-expired') {
      logger.warn('Expired token', { error: error as Error });
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Authentication token has expired',
        },
      });
      return;
    }

    if ((error as any).code === 'auth/argument-error') {
      logger.warn('Invalid token format', { error: error as Error });
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'Invalid authentication token',
        },
      });
      return;
    }

    if (error instanceof AppError) {
      logger.warn('Authentication failed', { error });
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    logger.error('Authentication error', error as Error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
    });
  }
}

/**
 * Check if user has required role(s)
 * 
 * This middleware must be used AFTER verifyToken middleware
 * 
 * @param allowedRoles Array of roles that can access this endpoint
 * @returns Middleware function
 * 
 * @example
 * ```typescript
 * app.post('/admin/users', verifyToken, checkRole([UserRole.ADMIN]), handler);
 * app.post('/calculate', verifyToken, checkRole([UserRole.PHARMACIST, UserRole.PHARMACY_TECHNICIAN]), handler);
 * ```
 */
export function checkRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        throw new AppError(
          'AUTH_REQUIRED',
          'Authentication required',
          401
        );
      }

      // Check if user has role assigned
      if (!req.user.role) {
        logger.warn('User has no role assigned', { uid: req.user.uid });
        res.status(403).json({
          success: false,
          error: {
            code: 'ROLE_NOT_ASSIGNED',
            message: 'User role not assigned. Please contact administrator.',
          },
        });
        return;
      }

      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Insufficient permissions', {
          uid: req.user.uid,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
        });
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to access this resource',
            details: {
              requiredRoles: allowedRoles,
              userRole: req.user.role,
            },
          },
        });
        return;
      }

      logger.debug('Role check passed', {
        uid: req.user.uid,
        role: req.user.role,
      });

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }

      logger.error('Role check error', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Authorization check failed',
        },
      });
    }
  };
}

/**
 * Optional authentication middleware
 * Authenticates user if token is provided, but doesn't require it
 * Useful for endpoints that have different behavior for authenticated vs anonymous users
 * 
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    // No token provided - continue as anonymous
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug('No auth token provided, continuing as anonymous');
      next();
      return;
    }

    // Token provided - try to verify it
    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Get user role from Firestore
    const userDoc = await admin
      .firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .get();

    const userData = userDoc.data();

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData?.role as UserRole | undefined,
      emailVerified: decodedToken.email_verified,
    };

    logger.debug('Optional auth - user authenticated', {
      uid: req.user.uid,
      role: req.user.role,
    });

    next();
  } catch (error) {
    // Invalid token - log but continue as anonymous
    logger.warn('Optional auth - invalid token, continuing as anonymous', {
      error: error as Error,
    });
    next();
  }
}

/**
 * Require email verification
 * This middleware must be used AFTER verifyToken middleware
 * 
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export function requireEmailVerification(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      },
    });
    return;
  }

  if (!req.user.emailVerified) {
    logger.warn('Email not verified', { uid: req.user.uid });
    res.status(403).json({
      success: false,
      error: {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address to access this resource',
      },
    });
    return;
  }

  next();
}

