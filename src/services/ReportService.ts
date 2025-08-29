import { CorruptionReport, MediaAsset, ReportStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { 
  ReportCreateRequest,
  ReportUpdateRequest,
  MediaUploadRequest,
  MediaUploadResponse,
  NotFoundError,
  AuthorizationError,
  ValidationError,
  Pagination,
  ReportTriageJobData
} from '../types';
import { calculateOffset, generateS3Key, generateId } from '../utils';
import { generateUploadUrl, getPublicUrl } from '../config/s3';
import { logger } from '../config/logger';
import { Queue } from 'bullmq';
import { bullRedis } from '../config/redis';

// BullMQ queues
const reportTriageQueue = new Queue('report-triage', { connection: bullRedis });
const notificationQueue = new Queue('notifications', { connection: bullRedis });

export class ReportService {
  // Create corruption report
  async createReport(userId: string, data: ReportCreateRequest): Promise<CorruptionReport> {
    const {
      title,
      description,
      department,
      officialName,
      location,
      incidentDate,
      isAnonymous = false,
    } = data;

    // Validate input
    if (title.length < 10) {
      throw new ValidationError('Title must be at least 10 characters long');
    }

    if (description.length < 50) {
      throw new ValidationError('Description must be at least 50 characters long');
    }

    const parsedIncidentDate = new Date(incidentDate);
    if (parsedIncidentDate > new Date()) {
      throw new ValidationError('Incident date cannot be in the future');
    }

    // Create report
    const report = await prisma.corruptionReport.create({
      data: {
        userId,
        title,
        description,
        department,
        officialName,
        location,
        incidentDate: parsedIncidentDate,
        isAnonymous,
        status: ReportStatus.SUBMITTED,
      },
    });

    // Queue for auto-triage (background job)
    const triageData: ReportTriageJobData = {
      reportId: report.id,
      department,
    };

    await reportTriageQueue.add('triage-report', triageData, {
      delay: 5000, // 5 second delay to allow for immediate evidence upload
      attempts: 3,
    });

    logger.info(`Corruption report ${report.id} created by user ${userId} (anonymous: ${isAnonymous})`);
    return report;
  }

  // Get report by ID
  async getReportById(
    reportId: string,
    userId?: string,
    userRole?: string
  ): Promise<CorruptionReport & { evidence: MediaAsset[] }> {
    const report = await prisma.corruptionReport.findUnique({
      where: { id: reportId },
      include: {
        evidence: {
          where: { uploadStatus: 'COMPLETED' },
        },
        user: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
      },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    // Check authorization
    if (userId) {
      const canView = 
        report.userId === userId || // Owner
        userRole === 'ADMIN' || // Admin
        userRole === 'MODERATOR' || // Moderator
        (userRole === 'ADVOCATE' && report.status !== 'SUBMITTED'); // Advocate (for public reports)

      if (!canView) {
        throw new AuthorizationError('Access denied');
      }
    }

    // Hide user info if report is anonymous and viewer is not admin/moderator/owner
    if (report.isAnonymous && userId !== report.userId && userRole !== 'ADMIN' && userRole !== 'MODERATOR') {
      report.user = null;
    }

    return report;
  }

  // Update report status (admin/moderator only)
  async updateReportStatus(
    reportId: string,
    data: ReportUpdateRequest,
    updatedBy: string
  ): Promise<CorruptionReport> {
    // Verify report exists
    const report = await prisma.corruptionReport.findUnique({
      where: { id: reportId },
      include: { user: true },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    // Update report
    const updatedReport = await prisma.corruptionReport.update({
      where: { id: reportId },
      data: {
        status: data.status,
        assignedTo: data.assignedTo,
        resolution: data.resolution,
        updatedAt: new Date(),
      },
    });

    // Send notification to user about status update (if not anonymous)
    if (!report.isAnonymous) {
      await notificationQueue.add('send-notification', {
        userId: report.userId,
        type: 'email',
        template: 'report-status-update',
        data: {
          reportId,
          title: report.title,
          status: data.status,
          resolution: data.resolution,
          userName: `${report.user.firstName} ${report.user.lastName}`,
        },
      });
    }

    logger.info(`Report ${reportId} status updated to ${data.status} by ${updatedBy}`);
    return updatedReport;
  }

  // Generate pre-signed URLs for evidence upload
  async generateEvidenceUploadUrls(
    reportId: string,
    files: MediaUploadRequest[],
    userId: string
  ): Promise<MediaUploadResponse[]> {
    // Verify report exists and user owns it
    const report = await prisma.corruptionReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.userId !== userId) {
      throw new AuthorizationError('Access denied');
    }

    // Validate files
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'video/mp4', 'video/quicktime',
      'audio/mpeg', 'audio/wav',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const maxFileSize = 100 * 1024 * 1024; // 100MB for evidence files

    for (const file of files) {
      if (!allowedTypes.includes(file.contentType)) {
        throw new ValidationError(`File type ${file.contentType} not allowed`);
      }
      if (file.size > maxFileSize) {
        throw new ValidationError(`File ${file.filename} exceeds maximum size of 100MB`);
      }
    }

    // Generate upload URLs and create media asset records
    const uploadResponses: MediaUploadResponse[] = [];

    for (const file of files) {
      const uploadId = generateId('evidence');
      const s3Key = generateS3Key('evidence', file.filename, userId);
      
      // Generate pre-signed URL
      const uploadUrl = await generateUploadUrl(s3Key, file.contentType, 3600); // 1 hour expiry

      // Create pending media asset record
      await prisma.mediaAsset.create({
        data: {
          id: uploadId,
          filename: file.filename,
          originalName: file.filename,
          mimeType: file.contentType,
          size: file.size,
          s3Key,
          s3Url: getPublicUrl(s3Key),
          uploadStatus: 'PENDING',
          corruptionReportId: reportId,
        },
      });

      uploadResponses.push({
        uploadId,
        uploadUrl,
      });
    }

    logger.info(`Generated ${uploadResponses.length} evidence upload URLs for report ${reportId}`);
    return uploadResponses;
  }

  // Complete evidence upload process
  async completeEvidenceUpload(reportId: string, uploadIds: string[], userId: string): Promise<void> {
    // Verify report ownership
    const report = await prisma.corruptionReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.userId !== userId) {
      throw new AuthorizationError('Access denied');
    }

    // Update media assets status
    await prisma.mediaAsset.updateMany({
      where: {
        id: { in: uploadIds },
        corruptionReportId: reportId,
      },
      data: {
        uploadStatus: 'COMPLETED',
        updatedAt: new Date(),
      },
    });

    // Update report timestamp
    await prisma.corruptionReport.update({
      where: { id: reportId },
      data: { updatedAt: new Date() },
    });

    logger.info(`Completed evidence upload for report ${reportId}, ${uploadIds.length} files`);
  }

  // Get user's reports
  async getUserReports(
    userId: string,
    pagination: Pagination
  ): Promise<{ reports: (CorruptionReport & { evidence: MediaAsset[] })[]; total: number }> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const offset = calculateOffset(page, limit);

    const [reports, total] = await Promise.all([
      prisma.corruptionReport.findMany({
        where: { userId },
        include: {
          evidence: {
            where: { uploadStatus: 'COMPLETED' },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit,
      }),
      prisma.corruptionReport.count({
        where: { userId },
      }),
    ]);

    return { reports, total };
  }

  // Get all reports (admin/moderator only)
  async getAllReports(
    pagination: Pagination,
    filters: { 
      status?: ReportStatus; 
      department?: string; 
      assignedTo?: string;
      fromDate?: string;
      toDate?: string;
    } = {}
  ): Promise<{ reports: (CorruptionReport & { evidence: MediaAsset[] })[]; total: number }> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const offset = calculateOffset(page, limit);

    // Build where clause
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.department) {
      where.department = { contains: filters.department, mode: 'insensitive' };
    }
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;
    if (filters.fromDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(filters.fromDate) };
    }
    if (filters.toDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(filters.toDate) };
    }

    const [reports, total] = await Promise.all([
      prisma.corruptionReport.findMany({
        where,
        include: {
          evidence: {
            where: { uploadStatus: 'COMPLETED' },
          },
          user: {
            select: { firstName: true, lastName: true, email: true, phone: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit,
      }),
      prisma.corruptionReport.count({ where }),
    ]);

    return { reports, total };
  }

  // Get reports by department (for advocates/moderators)
  async getReportsByDepartment(
    department: string,
    pagination: Pagination
  ): Promise<{ reports: (CorruptionReport & { evidence: MediaAsset[] })[]; total: number }> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const offset = calculateOffset(page, limit);

    const where = {
      department: { contains: department, mode: 'insensitive' },
      status: { not: ReportStatus.SUBMITTED }, // Only show reports that have been reviewed
    };

    const [reports, total] = await Promise.all([
      prisma.corruptionReport.findMany({
        where,
        include: {
          evidence: {
            where: { uploadStatus: 'COMPLETED' },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit,
      }),
      prisma.corruptionReport.count({ where }),
    ]);

    return { reports, total };
  }

  // Get report statistics (admin dashboard)
  async getReportStatistics(): Promise<{
    total: number;
    byStatus: Record<ReportStatus, number>;
    byDepartment: { department: string; count: number }[];
    recent30d: number;
    resolved: number;
  }> {
    const [
      total,
      statusCounts,
      departmentCounts,
      recent30d,
      resolved
    ] = await Promise.all([
      prisma.corruptionReport.count(),
      prisma.corruptionReport.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.corruptionReport.groupBy({
        by: ['department'],
        _count: true,
        orderBy: { _count: { department: 'desc' } },
        take: 10,
      }),
      prisma.corruptionReport.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.corruptionReport.count({
        where: {
          status: { in: [ReportStatus.ACTION_TAKEN, ReportStatus.CLOSED] },
        },
      }),
    ]);

    const byStatus = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<ReportStatus, number>);

    const byDepartment = departmentCounts.map(item => ({
      department: item.department,
      count: item._count,
    }));

    return { total, byStatus, byDepartment, recent30d, resolved };
  }

  // Auto-assign report to moderator (triage job function)
  async autoAssignReport(reportId: string): Promise<void> {
    try {
      // Find available moderator with least assignments
      const moderator = await prisma.user.findFirst({
        where: { 
          role: 'MODERATOR', 
          isActive: true 
        },
        orderBy: {
          // This would require a computed field or separate tracking
          // For now, just get the first available moderator
          createdAt: 'asc',
        },
      });

      if (moderator) {
        await prisma.corruptionReport.update({
          where: { id: reportId },
          data: {
            assignedTo: moderator.id,
            status: ReportStatus.UNDER_REVIEW,
            updatedAt: new Date(),
          },
        });

        logger.info(`Report ${reportId} auto-assigned to moderator ${moderator.id}`);
      }
    } catch (error) {
      logger.error(`Failed to auto-assign report ${reportId}:`, error);
    }
  }
}

export const reportService = new ReportService();