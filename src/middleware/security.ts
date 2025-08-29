import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { config } from '../config';
import { logger } from '../config/logger';

// CORS configuration
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed origins
    if (config.cors.origin.includes(origin) || config.cors.origin.includes('*')) {
      return callback(null, true);
    }

    logger.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID',
  ],
});

// Helmet security headers
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// General rate limiting
export const generalRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      timestamp: new Date().toISOString(),
    });
  },
});

// Strict rate limiting for auth endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later',
      timestamp: new Date().toISOString(),
    });
  },
});

// SOS emergency rate limiting (more lenient)
export const sosRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 SOS requests per 5 minutes
  message: {
    success: false,
    error: 'SOS rate limit exceeded, please contact emergency services directly if this is urgent',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.error(`SOS rate limit exceeded`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId,
    });
    
    res.status(429).json({
      success: false,
      error: 'SOS rate limit exceeded, please contact emergency services directly if this is urgent',
      timestamp: new Date().toISOString(),
    });
  },
});

// Upload rate limiting
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 upload requests per minute
  message: {
    success: false,
    error: 'Upload rate limit exceeded, please try again later',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Request ID middleware
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
};

// IP whitelist middleware (for admin endpoints)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    if (!clientIP || !allowedIPs.includes(clientIP)) {
      logger.warn(`Access denied from IP: ${clientIP}`, {
        path: req.path,
        userAgent: req.get('User-Agent'),
      });
      
      res.status(403).json({
        success: false,
        error: 'Access denied from this IP address',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    next();
  };
};

// Content type validation middleware
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.get('Content-Type');
    
    if (req.method !== 'GET' && req.method !== 'DELETE' && (!contentType || !allowedTypes.some(type => contentType.includes(type)))) {
      res.status(415).json({
        success: false,
        error: `Unsupported content type. Allowed types: ${allowedTypes.join(', ')}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    next();
  };
};

// Request size limit middleware
export const requestSizeLimit = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('Content-Length');
    const maxSizeBytes = parseSize(maxSize);
    
    if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
      res.status(413).json({
        success: false,
        error: `Request too large. Maximum size: ${maxSize}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    next();
  };
};

// Security headers middleware (additional to helmet)
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Remove server header
  res.removeHeader('X-Powered-By');
  
  // Add additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // API-specific headers
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Response-Time', Date.now().toString());
  
  next();
};

// Helper function to parse size strings
function parseSize(size: string): number {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)?$/);
  
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }
  
  const value = parseFloat(match[1]);
  const unit = (match[2] || 'b') as keyof typeof units;
  
  return value * units[unit];
}