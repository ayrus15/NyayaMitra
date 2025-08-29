import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { 
  AppError, 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError, 
  NotFoundError,
  ConflictError 
} from '../types';
import { logger } from '../config/logger';
import { config } from '../config';

// Custom error class for async handler wrapper
export class AsyncHandlerError extends Error {
  constructor(public originalError: Error) {
    super(originalError.message);
    this.name = 'AsyncHandlerError';
  }
}

// Async handler wrapper to catch async errors
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Main error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = undefined;

  // Log the error
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
  };

  // Handle different error types
  if (error instanceof AppError) {
    // Custom application errors
    statusCode = error.statusCode;
    message = error.message;
    
    if (error.statusCode < 500) {
      logger.warn('Application error:', errorInfo);
    } else {
      logger.error('Application error:', errorInfo);
    }
  } else if (error instanceof ZodError) {
    // Zod validation errors
    statusCode = 400;
    message = 'Validation failed';
    details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    
    logger.warn('Validation error:', { ...errorInfo, details });
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Prisma database errors
    ({ statusCode, message, details } = handlePrismaError(error));
    logger.error('Database error:', { ...errorInfo, code: error.code, details });
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    // Prisma validation errors
    statusCode = 400;
    message = 'Invalid data provided';
    logger.error('Database validation error:', errorInfo);
  } else if (error.name === 'JsonWebTokenError') {
    // JWT errors
    statusCode = 401;
    message = 'Invalid token';
    logger.warn('JWT error:', errorInfo);
  } else if (error.name === 'TokenExpiredError') {
    // JWT expiration
    statusCode = 401;
    message = 'Token expired';
    logger.warn('JWT expired:', errorInfo);
  } else if (error.name === 'MulterError') {
    // Multer file upload errors
    statusCode = 400;
    message = handleMulterError(error as any);
    logger.warn('File upload error:', errorInfo);
  } else {
    // Unknown errors
    logger.error('Unexpected error:', errorInfo);
  }

  // Don't leak error details in production
  if (config.server.env === 'production' && statusCode >= 500) {
    message = 'Internal Server Error';
    details = undefined;
  }

  // Send error response
  const response: any = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.details = details;
  }

  // Add request ID if available
  if (req.headers['x-request-id']) {
    response.requestId = req.headers['x-request-id'];
  }

  res.status(statusCode).json(response);
};

// Handle Prisma errors
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  message: string;
  details?: any;
} {
  switch (error.code) {
    case 'P2000':
      return {
        statusCode: 400,
        message: 'The provided value is too long for the field',
        details: error.meta,
      };
    case 'P2001':
      return {
        statusCode: 404,
        message: 'The record does not exist',
        details: error.meta,
      };
    case 'P2002':
      return {
        statusCode: 409,
        message: 'A record with this value already exists',
        details: {
          field: (error.meta?.target as string[])?.join(', ') || 'unknown',
        },
      };
    case 'P2003':
      return {
        statusCode: 400,
        message: 'Foreign key constraint failed',
        details: error.meta,
      };
    case 'P2004':
      return {
        statusCode: 400,
        message: 'A constraint failed on the database',
        details: error.meta,
      };
    case 'P2025':
      return {
        statusCode: 404,
        message: 'Record not found',
        details: error.meta,
      };
    default:
      return {
        statusCode: 500,
        message: 'Database operation failed',
        details: config.server.env === 'development' ? error.meta : undefined,
      };
  }
}

// Handle Multer errors
function handleMulterError(error: any): string {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return 'File too large';
    case 'LIMIT_FILE_COUNT':
      return 'Too many files';
    case 'LIMIT_FIELD_KEY':
      return 'Field name too long';
    case 'LIMIT_FIELD_VALUE':
      return 'Field value too long';
    case 'LIMIT_FIELD_COUNT':
      return 'Too many fields';
    case 'LIMIT_UNEXPECTED_FILE':
      return 'Unexpected file field';
    case 'MISSING_FIELD_NAME':
      return 'Missing field name';
    default:
      return 'File upload error';
  }
}

// 404 handler for unmatched routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
};

// Request timeout middleware
export const timeoutHandler = (timeoutMs = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn(`Request timeout: ${req.method} ${req.path}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          userId: req.user?.userId,
        });
        
        res.status(408).json({
          success: false,
          error: 'Request timeout',
          timestamp: new Date().toISOString(),
        });
      }
    }, timeoutMs);

    // Clear timeout when response is finished
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
};