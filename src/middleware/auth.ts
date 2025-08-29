import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { authService } from '../services';
import { AuthenticatedRequest, AuthenticationError, AuthorizationError } from '../types';
import { logger } from '../config/logger';

// Extend Request interface for authenticated requests
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
        firstName: string;
        lastName: string;
      };
    }
  }
}

// Authentication middleware - verifies JWT token
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AuthenticationError('Access token is required');
    }

    const payload = await authService.verifyToken(token);
    req.user = payload;
    
    next();
  } catch (error) {
    logger.warn('Authentication failed:', { error: error instanceof Error ? error.message : error });
    
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        timestamp: new Date().toISOString(),
      });
    }
  }
};

// Optional authentication middleware - adds user info if token is present but doesn't fail if missing
export const optionalAuthentication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const payload = await authService.verifyToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    // Log but don't fail - this is optional authentication
    logger.debug('Optional authentication failed:', { error: error instanceof Error ? error.message : error });
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Access denied: User ${req.user.userId} with role ${req.user.role} attempted to access resource requiring roles: ${roles.join(', ')}`);
      
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};

// Admin only middleware
export const requireAdmin = requireRole(UserRole.ADMIN);

// Admin or Moderator middleware
export const requireAdminOrModerator = requireRole(UserRole.ADMIN, UserRole.MODERATOR);

// Any authenticated user middleware (convenience)
export const requireAuth = authenticateToken;

// Check if user owns resource (for user-specific endpoints)
export const requireOwnership = (userIdParam = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const resourceUserId = req.params[userIdParam];
    
    // Allow admin/moderator to access any resource
    if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.MODERATOR) {
      next();
      return;
    }

    // Check ownership
    if (req.user.userId !== resourceUserId) {
      logger.warn(`Access denied: User ${req.user.userId} attempted to access resource owned by ${resourceUserId}`);
      
      res.status(403).json({
        success: false,
        error: 'Access denied - you can only access your own resources',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};