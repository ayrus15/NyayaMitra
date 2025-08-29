import { Job } from 'bullmq';
import { reportService } from '../services';
import { prisma } from '../config/database';
import { logger, jobLogger } from '../config/logger';
import { ReportTriageJobData } from '../types';

export const processReportTriage = async (job: Job<ReportTriageJobData>) => {
  const startTime = Date.now();
  const { reportId, department } = job.data;

  jobLogger.started('Report Triage', job.id!, job.data);

  try {
    // Get report details
    const report = await prisma.corruptionReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    // Perform auto-triage based on department and content
    const triageResult = await performAutoTriage(report);

    // Update report with triage results
    await prisma.corruptionReport.update({
      where: { id: reportId },
      data: {
        status: triageResult.status,
        assignedTo: triageResult.assignedTo,
        updatedAt: new Date(),
      },
    });

    // If high priority, send immediate notification to moderators
    if (triageResult.priority === 'HIGH') {
      await notifyModerators(report, triageResult);
    }

    const duration = Date.now() - startTime;
    jobLogger.completed('Report Triage', job.id!, duration, triageResult);

    return triageResult;

  } catch (error) {
    const duration = Date.now() - startTime;
    jobLogger.failed('Report Triage', job.id!, error as Error, duration);
    throw error;
  }
};

// Perform automatic triage based on report content and metadata
async function performAutoTriage(report: any): Promise<{
  status: string;
  assignedTo?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  reasoning: string[];
}> {
  const reasoning: string[] = [];
  let priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

  // Analyze report content for priority indicators
  const content = `${report.title} ${report.description}`.toLowerCase();
  
  // High priority keywords
  const highPriorityKeywords = [
    'bribe', 'extortion', 'fraud', 'embezzlement', 'money laundering',
    'large amount', 'minister', 'senior official', 'urgent', 'ongoing'
  ];

  // Medium priority keywords
  const mediumPriorityKeywords = [
    'nepotism', 'favoritism', 'misuse', 'irregularity', 'violation'
  ];

  // Check for high priority indicators
  const highMatches = highPriorityKeywords.filter(keyword => content.includes(keyword));
  if (highMatches.length > 0) {
    priority = 'HIGH';
    reasoning.push(`High priority keywords detected: ${highMatches.join(', ')}`);
  }

  // Check for medium priority indicators
  const mediumMatches = mediumPriorityKeywords.filter(keyword => content.includes(keyword));
  if (mediumMatches.length > 0 && priority !== 'HIGH') {
    priority = 'MEDIUM';
    reasoning.push(`Medium priority keywords detected: ${mediumMatches.join(', ')}`);
  }

  // Check department for priority adjustment
  const highPriorityDepartments = [
    'police', 'judiciary', 'revenue', 'customs', 'banking'
  ];
  
  if (highPriorityDepartments.some(dept => 
    report.department.toLowerCase().includes(dept))) {
    if (priority === 'MEDIUM') priority = 'HIGH';
    if (priority === 'LOW') priority = 'MEDIUM';
    reasoning.push(`High-impact department: ${report.department}`);
  }

  // Check for evidence attachments
  const evidenceCount = await prisma.mediaAsset.count({
    where: { 
      corruptionReportId: report.id,
      uploadStatus: 'COMPLETED'
    },
  });

  if (evidenceCount > 0) {
    reasoning.push(`${evidenceCount} evidence file(s) attached`);
    // Evidence increases priority
    if (priority === 'LOW') priority = 'MEDIUM';
  }

  // Check recency
  const reportAge = Date.now() - report.createdAt.getTime();
  const isRecent = reportAge < 24 * 60 * 60 * 1000; // 24 hours
  if (isRecent && content.includes('ongoing')) {
    if (priority === 'MEDIUM') priority = 'HIGH';
    reasoning.push('Recent report mentioning ongoing corruption');
  }

  // Find appropriate assignee based on priority and department
  const assignedTo = await findBestModerator(report.department, priority);
  if (assignedTo) {
    reasoning.push(`Assigned to moderator based on expertise and workload`);
  }

  // Determine status based on priority
  let status = 'UNDER_REVIEW';
  if (priority === 'HIGH') {
    status = 'INVESTIGATING';
    reasoning.push('High priority - moved directly to investigation');
  }

  return {
    status,
    assignedTo,
    priority,
    reasoning,
  };
}

// Find the best moderator for assignment
async function findBestModerator(department: string, priority: 'LOW' | 'MEDIUM' | 'HIGH'): Promise<string | undefined> {
  try {
    // Get all active moderators
    const moderators = await prisma.user.findMany({
      where: {
        role: 'MODERATOR',
        isActive: true,
      },
    });

    if (moderators.length === 0) {
      return undefined;
    }

    // Get current workload for each moderator
    const moderatorWorkloads = await Promise.all(
      moderators.map(async (moderator) => {
        const assignedReports = await prisma.corruptionReport.count({
          where: {
            assignedTo: moderator.id,
            status: { in: ['UNDER_REVIEW', 'INVESTIGATING'] },
          },
        });
        
        return {
          moderatorId: moderator.id,
          workload: assignedReports,
        };
      })
    );

    // Sort by workload (ascending) to find least busy moderator
    moderatorWorkloads.sort((a, b) => a.workload - b.workload);

    // For high priority, assign to the least busy moderator
    if (priority === 'HIGH') {
      return moderatorWorkloads[0].moderatorId;
    }

    // For medium/low priority, use round-robin among moderators with low workload
    const availableModerators = moderatorWorkloads.filter(m => m.workload < 10);
    if (availableModerators.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableModerators.length);
      return availableModerators[randomIndex].moderatorId;
    }

    // Fallback to least busy moderator
    return moderatorWorkloads[0].moderatorId;

  } catch (error) {
    logger.error('Failed to find best moderator for assignment:', error);
    return undefined;
  }
}

// Notify moderators about high-priority reports
async function notifyModerators(report: any, triageResult: any): Promise<void> {
  try {
    const { Queue } = require('bullmq');
    const { bullRedis } = require('../config/redis');
    const notificationQueue = new Queue('notifications', { connection: bullRedis });

    // Get all moderators and admins
    const moderators = await prisma.user.findMany({
      where: {
        role: { in: ['MODERATOR', 'ADMIN'] },
        isActive: true,
      },
    });

    // Queue notifications
    for (const moderator of moderators) {
      await notificationQueue.add('send-notification', {
        userId: moderator.id,
        type: 'email',
        template: 'high-priority-report',
        data: {
          reportId: report.id,
          title: report.title,
          department: report.department,
          priority: triageResult.priority,
          reasoning: triageResult.reasoning.join('; '),
          moderatorName: `${moderator.firstName} ${moderator.lastName}`,
        },
      });
    }

    logger.info(`Notified ${moderators.length} moderators about high-priority report ${report.id}`);

  } catch (error) {
    logger.error('Failed to notify moderators about high-priority report:', error);
  }
}