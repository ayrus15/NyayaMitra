import { Job } from 'bullmq';
import { caseService } from '../services';
import { prisma } from '../config/database';
import { logger, jobLogger } from '../config/logger';
import { CaseSyncJobData } from '../types';

export const processCaseSync = async (job: Job<CaseSyncJobData>) => {
  const startTime = Date.now();
  const { caseId, lastSyncAt } = job.data;

  jobLogger.started('Case Sync', job.id!, job.data);

  try {
    // Get case from database
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseRecord) {
      throw new Error(`Case ${caseId} not found`);
    }

    // Sync case data from external API
    const updatedCase = await caseService.syncCaseFromExternalAPI(caseRecord.caseNumber);

    if (!updatedCase) {
      throw new Error(`Failed to sync case ${caseRecord.caseNumber} from external API`);
    }

    // Check if there are significant updates
    const hasSignificantUpdate = checkForSignificantUpdates(caseRecord, updatedCase);

    if (hasSignificantUpdate) {
      // Notify followers of the case
      const followers = await prisma.caseFollow.findMany({
        where: { caseId },
        include: { user: true },
      });

      if (followers.length > 0) {
        // Queue notifications for all followers
        const { Queue } = require('bullmq');
        const { bullRedis } = require('../config/redis');
        const notificationQueue = new Queue('notifications', { connection: bullRedis });

        for (const follow of followers) {
          await notificationQueue.add('send-notification', {
            userId: follow.userId,
            type: 'email',
            template: 'case-update',
            data: {
              caseId,
              caseNumber: updatedCase.caseNumber,
              title: updatedCase.title,
              userName: `${follow.user.firstName} ${follow.user.lastName}`,
              eventTitle: 'Case information updated',
              eventDate: new Date().toISOString(),
            },
          });
        }

        logger.info(`Queued notifications for ${followers.length} followers of case ${caseId}`);
      }
    }

    const duration = Date.now() - startTime;
    jobLogger.completed('Case Sync', job.id!, duration, { 
      caseNumber: caseRecord.caseNumber,
      hasSignificantUpdate,
      followersNotified: hasSignificantUpdate ? (await prisma.caseFollow.count({ where: { caseId } })) : 0,
    });

    return { 
      success: true, 
      caseNumber: caseRecord.caseNumber,
      hasSignificantUpdate,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    jobLogger.failed('Case Sync', job.id!, error as Error, duration);
    throw error;
  }
};

// Check if the case has significant updates worth notifying about
function checkForSignificantUpdates(
  oldCase: any,
  newCase: any
): boolean {
  // Check for status changes
  if (oldCase.status !== newCase.status) {
    return true;
  }

  // Check for next hearing date changes
  if (oldCase.nextHearing?.getTime() !== newCase.nextHearing?.getTime()) {
    return true;
  }

  // Check for judge changes
  if (oldCase.judge !== newCase.judge) {
    return true;
  }

  // Check for court changes
  if (oldCase.court !== newCase.court) {
    return true;
  }

  // Check for title changes
  if (oldCase.title !== newCase.title) {
    return true;
  }

  return false;
}

// Batch sync multiple cases
export const processBatchCaseSync = async (job: Job<{ caseIds: string[] }>) => {
  const startTime = Date.now();
  const { caseIds } = job.data;

  jobLogger.started('Batch Case Sync', job.id!, job.data);

  try {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const caseId of caseIds) {
      try {
        await processCaseSync({
          id: `sync-${caseId}`,
          data: { caseId },
        } as Job<CaseSyncJobData>);
        
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Case ${caseId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const duration = Date.now() - startTime;
    jobLogger.completed('Batch Case Sync', job.id!, duration, results);

    return results;

  } catch (error) {
    const duration = Date.now() - startTime;
    jobLogger.failed('Batch Case Sync', job.id!, error as Error, duration);
    throw error;
  }
};