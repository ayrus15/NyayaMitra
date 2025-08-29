import { startJobWorkers, scheduleRecurringJobs } from './jobs';
import { logger } from './config/logger';
import { config } from './config';

// Start job workers
async function startWorker(): Promise<void> {
  try {
    logger.info('Starting NyayaMitra job worker...');
    
    // Start all job workers
    startJobWorkers();
    
    // Schedule recurring jobs
    scheduleRecurringJobs();
    
    logger.info('Job worker started successfully', {
      environment: config.server.env,
    });
    
  } catch (error) {
    logger.error('Failed to start job worker:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down worker...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down worker...');
  process.exit(0);
});

// Start the worker
startWorker();