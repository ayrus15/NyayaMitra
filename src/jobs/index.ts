import { Worker, Queue, QueueScheduler } from 'bullmq';
import { bullRedis } from '../config/redis';
import { logger } from '../config/logger';
import { processSosDispatch } from './SosDispatchJob';
import { processNotification } from './NotificationJob';
import { processCaseSync, processBatchCaseSync } from './CaseSyncJob';
import { processReportTriage } from './ReportTriageJob';

// Queue instances
export const sosDispatchQueue = new Queue('sos-dispatch', { connection: bullRedis });
export const notificationQueue = new Queue('notifications', { connection: bullRedis });
export const caseSyncQueue = new Queue('case-sync', { connection: bullRedis });
export const reportTriageQueue = new Queue('report-triage', { connection: bullRedis });

// Queue schedulers for delayed jobs
const sosDispatchScheduler = new QueueScheduler('sos-dispatch', { connection: bullRedis });
const notificationScheduler = new QueueScheduler('notifications', { connection: bullRedis });
const caseSyncScheduler = new QueueScheduler('case-sync', { connection: bullRedis });
const reportTriageScheduler = new QueueScheduler('report-triage', { connection: bullRedis });

// Worker instances
let workers: Worker[] = [];

export function startJobWorkers(): void {
  // SOS Dispatch Worker
  const sosDispatchWorker = new Worker('sos-dispatch', processSosDispatch, {
    connection: bullRedis,
    concurrency: 5,
    removeOnComplete: 100,
    removeOnFail: 50,
  });

  // Notification Worker
  const notificationWorker = new Worker('notifications', processNotification, {
    connection: bullRedis,
    concurrency: 10,
    removeOnComplete: 200,
    removeOnFail: 100,
  });

  // Case Sync Worker
  const caseSyncWorker = new Worker('case-sync', async (job) => {
    if (job.name === 'sync-case') {
      return await processCaseSync(job);
    } else if (job.name === 'batch-sync-cases') {
      return await processBatchCaseSync(job);
    }
    throw new Error(`Unknown case sync job: ${job.name}`);
  }, {
    connection: bullRedis,
    concurrency: 3,
    removeOnComplete: 50,
    removeOnFail: 25,
  });

  // Report Triage Worker
  const reportTriageWorker = new Worker('report-triage', processReportTriage, {
    connection: bullRedis,
    concurrency: 5,
    removeOnComplete: 100,
    removeOnFail: 50,
  });

  // Store worker references
  workers = [sosDispatchWorker, notificationWorker, caseSyncWorker, reportTriageWorker];

  // Add event listeners
  workers.forEach(worker => {
    worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed`, {
        queue: worker.name,
        jobName: job.name,
        duration: job.finishedOn! - job.processedOn!,
      });
    });

    worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed`, {
        queue: worker.name,
        jobName: job?.name,
        error: err.message,
        stack: err.stack,
      });
    });

    worker.on('error', (err) => {
      logger.error(`Worker error in ${worker.name}:`, err);
    });
  });

  logger.info('Job workers started successfully', {
    workers: workers.map(w => w.name),
  });
}

export function stopJobWorkers(): Promise<void[]> {
  logger.info('Stopping job workers...');
  
  const promises = workers.map(worker => worker.close());
  workers = [];
  
  return Promise.all(promises);
}

// Utility functions for scheduling jobs

// Schedule SOS dispatch
export async function scheduleSosDispatch(data: any, options: any = {}): Promise<void> {
  await sosDispatchQueue.add('dispatch-sos', data, {
    priority: getPriorityWeight(data.priority),
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    ...options,
  });
}

// Schedule notification
export async function scheduleNotification(data: any, options: any = {}): Promise<void> {
  await notificationQueue.add('send-notification', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    ...options,
  });
}

// Schedule case sync
export async function scheduleCaseSync(data: any, options: any = {}): Promise<void> {
  await caseSyncQueue.add('sync-case', data, {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    ...options,
  });
}

// Schedule batch case sync
export async function scheduleBatchCaseSync(caseIds: string[], options: any = {}): Promise<void> {
  await caseSyncQueue.add('batch-sync-cases', { caseIds }, {
    attempts: 1,
    delay: 60000, // 1 minute delay
    ...options,
  });
}

// Schedule report triage
export async function scheduleReportTriage(data: any, options: any = {}): Promise<void> {
  await reportTriageQueue.add('triage-report', data, {
    attempts: 2,
    delay: 5000, // 5 second delay
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    ...options,
  });
}

// Schedule recurring jobs
export function scheduleRecurringJobs(): void {
  // Daily case sync for all followed cases
  caseSyncQueue.add('daily-case-sync', {}, {
    repeat: { cron: '0 2 * * *' }, // 2 AM daily
    attempts: 1,
  });

  // Weekly cleanup of old completed jobs
  notificationQueue.add('cleanup-old-jobs', {}, {
    repeat: { cron: '0 3 * * 0' }, // 3 AM on Sundays
    attempts: 1,
  });

  logger.info('Recurring jobs scheduled');
}

// Helper functions
function getPriorityWeight(priority: string): number {
  switch (priority) {
    case 'CRITICAL': return 1;
    case 'HIGH': return 2;
    case 'MEDIUM': return 3;
    case 'LOW': return 4;
    default: return 3;
  }
}

// Queue monitoring functions
export async function getQueueStats(): Promise<{
  queues: Array<{
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }>;
}> {
  const queues = [sosDispatchQueue, notificationQueue, caseSyncQueue, reportTriageQueue];
  
  const stats = await Promise.all(
    queues.map(async (queue) => ({
      name: queue.name,
      waiting: await queue.getWaiting().then(jobs => jobs.length),
      active: await queue.getActive().then(jobs => jobs.length),
      completed: await queue.getCompleted().then(jobs => jobs.length),
      failed: await queue.getFailed().then(jobs => jobs.length),
      delayed: await queue.getDelayed().then(jobs => jobs.length),
    }))
  );

  return { queues: stats };
}

// Health check for job system
export async function checkJobSystemHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  workers: Array<{
    name: string;
    status: string;
  }>;
  queues: any;
}> {
  const workerStatuses = workers.map(worker => ({
    name: worker.name,
    status: worker.isRunning() ? 'running' : 'stopped',
  }));

  const allWorkersRunning = workerStatuses.every(w => w.status === 'running');
  const queueStats = await getQueueStats();

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (!allWorkersRunning) {
    status = 'unhealthy';
  } else if (queueStats.queues.some(q => q.failed > 10)) {
    status = 'degraded';
  }

  return {
    status,
    workers: workerStatuses,
    queues: queueStats,
  };
}