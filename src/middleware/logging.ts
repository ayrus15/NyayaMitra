import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { maskSensitiveData } from '../utils';

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string;

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
    timestamp: new Date().toISOString(),
  });

  // Log request body for non-GET requests (excluding sensitive data)
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    logger.debug('Request body', {
      requestId,
      body: maskSensitiveData(req.body),
    });
  }

  // Store original end function
  const originalEnd = res.end;
  const originalJson = res.json;

  // Track response data
  let responseBody: any;

  // Override res.json to capture response body
  res.json = function(body: any) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  // Override res.end to log response
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - startTime;
    
    // Log response
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.userId,
      timestamp: new Date().toISOString(),
    });

    // Log response body for errors or debug mode
    if (res.statusCode >= 400 || logger.level === 'debug') {
      logger.debug('Response body', {
        requestId,
        statusCode: res.statusCode,
        body: responseBody ? maskSensitiveData(responseBody) : undefined,
      });
    }

    // Log slow requests
    if (duration > 5000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        userId: req.user?.userId,
      });
    }

    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

// Error logging middleware
export const errorLogger = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string;

  logger.error('Request error', {
    requestId,
    method: req.method,
    url: req.url,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
    body: req.method !== 'GET' ? maskSensitiveData(req.body) : undefined,
    timestamp: new Date().toISOString(),
  });

  next(error);
};

// Security event logging
export const securityLogger = {
  // Log authentication attempts
  loginAttempt: (req: Request, email: string, success: boolean, reason?: string) => {
    logger.info('Authentication attempt', {
      email,
      success,
      reason,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });
  },

  // Log authorization failures
  authorizationFailure: (req: Request, userId: string, resource: string, action: string) => {
    logger.warn('Authorization failure', {
      userId,
      resource,
      action,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });
  },

  // Log suspicious activity
  suspiciousActivity: (req: Request, activity: string, details?: any) => {
    logger.warn('Suspicious activity detected', {
      activity,
      details: details ? maskSensitiveData(details) : undefined,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId,
      timestamp: new Date().toISOString(),
    });
  },

  // Log rate limit violations
  rateLimitViolation: (req: Request, limit: number, window: string) => {
    logger.warn('Rate limit violation', {
      limit,
      window,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId,
      timestamp: new Date().toISOString(),
    });
  },

  // Log SOS incidents for audit trail
  sosIncident: (req: Request, incidentId: string, action: string, details?: any) => {
    logger.info('SOS incident action', {
      incidentId,
      action,
      details: details ? maskSensitiveData(details) : undefined,
      userId: req.user?.userId,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });
  },

  // Log data access for compliance
  dataAccess: (req: Request, dataType: string, recordId: string, action: 'read' | 'write' | 'delete') => {
    logger.info('Data access', {
      dataType,
      recordId,
      action,
      userId: req.user?.userId,
      method: req.method,
      url: req.url,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });
  },
};

// Performance monitoring middleware
export const performanceLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  // Store original end function
  const originalEnd = res.end;

  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryDiff = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
    };

    // Log performance metrics
    if (duration > 1000 || memoryDiff.heapUsed > 50 * 1024 * 1024) { // Log if > 1s or > 50MB memory
      logger.info('Performance metrics', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration.toFixed(2)}ms`,
        memoryUsage: {
          rss: `${(memoryDiff.rss / 1024 / 1024).toFixed(2)}MB`,
          heapUsed: `${(memoryDiff.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          heapTotal: `${(memoryDiff.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        },
        userId: req.user?.userId,
        timestamp: new Date().toISOString(),
      });
    }

    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

// Health check logging
export const healthCheckLogger = (service: string, status: 'healthy' | 'unhealthy', details?: any) => {
  logger.info('Health check', {
    service,
    status,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Background job logging
export const jobLogger = {
  started: (jobName: string, jobId: string, data?: any) => {
    logger.info('Job started', {
      jobName,
      jobId,
      data: data ? maskSensitiveData(data) : undefined,
      timestamp: new Date().toISOString(),
    });
  },

  completed: (jobName: string, jobId: string, duration: number, result?: any) => {
    logger.info('Job completed', {
      jobName,
      jobId,
      duration: `${duration}ms`,
      result: result ? maskSensitiveData(result) : undefined,
      timestamp: new Date().toISOString(),
    });
  },

  failed: (jobName: string, jobId: string, error: Error, duration: number) => {
    logger.error('Job failed', {
      jobName,
      jobId,
      duration: `${duration}ms`,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      timestamp: new Date().toISOString(),
    });
  },

  progress: (jobName: string, jobId: string, progress: number) => {
    logger.debug('Job progress', {
      jobName,
      jobId,
      progress: `${progress}%`,
      timestamp: new Date().toISOString(),
    });
  },
};