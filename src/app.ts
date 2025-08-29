import express from 'express';
import { config } from './config';
import { logger } from './config/logger';
import { prisma } from './config/database';
import { redis } from './config/redis';
import {
  corsMiddleware,
  helmetMiddleware,
  generalRateLimit,
  requestIdMiddleware,
  securityHeaders,
  requestLogger,
  errorLogger,
  performanceLogger,
  errorHandler,
  notFoundHandler,
  timeoutHandler,
  validateContentType,
  requestSizeLimit,
} from './middleware';

// Import routes
import { authRoutes, chatRoutes, caseRoutes, sosRoutes, reportRoutes } from './routes';

const app = express();

// Trust proxy (for rate limiting and IP detection)
app.set('trust proxy', 1);

// Request timeout
app.use(timeoutHandler(30000)); // 30 seconds

// Request ID middleware (must be first to ensure all logs have request ID)
app.use(requestIdMiddleware);

// Security headers
app.use(helmetMiddleware);
app.use(securityHeaders);

// CORS
app.use(corsMiddleware);

// Rate limiting
app.use(generalRateLimit);

// Request size limits
app.use(requestSizeLimit('10mb'));

// Content type validation for non-GET requests
app.use(validateContentType(['application/json', 'multipart/form-data']));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.server.env !== 'test') {
  app.use(requestLogger);
  app.use(performanceLogger);
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis connection
    const redisStatus = redis.status;
    
    // System info
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime)}s`,
      environment: config.server.env,
      version: '1.0.0',
      services: {
        database: 'connected',
        redis: redisStatus,
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      },
    };

    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
    });
  }
});

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'NyayaMitra Legal Systems API',
    version: '1.0.0',
    description: 'Comprehensive legal assistance and case tracking system',
    environment: config.server.env,
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: `${config.server.apiPrefix}/auth`,
      cases: `${config.server.apiPrefix}/cases`,
      chat: `${config.server.apiPrefix}/chat`,
      sos: `${config.server.apiPrefix}/sos`,
      reports: `${config.server.apiPrefix}/reports`,
    },
    documentation: '/api/docs',
    health: '/health',
  });
});

// API Routes
app.use(`${config.server.apiPrefix}/auth`, authRoutes);
app.use(`${config.server.apiPrefix}/chat`, chatRoutes);
app.use(`${config.server.apiPrefix}/cases`, caseRoutes);
app.use(`${config.server.apiPrefix}/sos`, sosRoutes);
app.use(`${config.server.apiPrefix}/reports`, reportRoutes);

// Error handling middleware
app.use(errorLogger);
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  const server = app.listen(); // Get server instance if available
  
  // Close server
  if (server) {
    server.close(async (err) => {
      if (err) {
        logger.error('Error closing server:', err);
      }
      
      try {
        // Close database connections
        await prisma.$disconnect();
        logger.info('Database connection closed');
        
        // Close Redis connections
        redis.disconnect();
        logger.info('Redis connection closed');
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
    
    // Force close after timeout
    setTimeout(() => {
      logger.warn('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Start server
const startServer = (): void => {
  try {
    const port = config.server.port;
    
    app.listen(port, () => {
      logger.info(`NyayaMitra API server started`, {
        port,
        environment: config.server.env,
        apiPrefix: config.server.apiPrefix,
        timestamp: new Date().toISOString(),
      });
      
      // Log available endpoints
      logger.info('Available endpoints:', {
        health: '/health',
        api: '/api',
        auth: `${config.server.apiPrefix}/auth`,
        cases: `${config.server.apiPrefix}/cases`,
        chat: `${config.server.apiPrefix}/chat`,
        sos: `${config.server.apiPrefix}/sos`,
        reports: `${config.server.apiPrefix}/reports`,
      });
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

export default app;