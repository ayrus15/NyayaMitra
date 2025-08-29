import { SosIncident, MediaAsset, SosStatus, SosPriority } from '@prisma/client';
import { prisma } from '../config/database';
import { 
  SosCreateRequest,
  SosUpdateRequest,
  MediaUploadRequest,
  MediaUploadResponse,
  NotFoundError,
  AuthorizationError,
  ValidationError,
  Pagination,
  SosDispatchJobData
} from '../types';
import { calculateOffset, generateS3Key, generateId } from '../utils';
import { generateUploadUrl, getPublicUrl } from '../config/s3';
import { logger } from '../config/logger';
import { Queue } from 'bullmq';
import { bullRedis } from '../config/redis';

// BullMQ queue for SOS dispatch
const sosDispatchQueue = new Queue('sos-dispatch', { connection: bullRedis });
const notificationQueue = new Queue('notifications', { connection: bullRedis });

export class SosService {
  // Create SOS incident
  async createSosIncident(userId: string, data: SosCreateRequest): Promise<SosIncident> {
    const { location, description, priority = SosPriority.MEDIUM } = data;

    // Validate location
    if (!location.lat || !location.lng || !location.address) {
      throw new ValidationError('Valid location with coordinates and address is required');
    }

    if (location.lat < -90 || location.lat > 90) {
      throw new ValidationError('Invalid latitude');
    }

    if (location.lng < -180 || location.lng > 180) {
      throw new ValidationError('Invalid longitude');
    }

    // Create SOS incident
    const incident = await prisma.sosIncident.create({
      data: {
        userId,
        location,
        description,
        priority,
        status: SosStatus.PENDING,
      },
    });

    // Get user info for dispatch
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true, firstName: true, lastName: true },
    });

    // Dispatch to authorities (background job)
    const dispatchData: SosDispatchJobData = {
      incidentId: incident.id,
      location,
      description,
      priority,
      userContact: {
        email: user!.email,
        phone: user?.phone,
      },
    };

    await sosDispatchQueue.add('dispatch-sos', dispatchData, {
      priority: this.getPriorityWeight(priority),
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    logger.info(`SOS incident ${incident.id} created and dispatched for user ${userId}`);
    return incident;
  }

  // Get SOS incident by ID
  async getSosIncidentById(incidentId: string, userId?: string): Promise<SosIncident & { mediaAssets: MediaAsset[] }> {
    const incident = await prisma.sosIncident.findUnique({
      where: { id: incidentId },
      include: {
        mediaAssets: true,
        user: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
      },
    });

    if (!incident) {
      throw new NotFoundError('SOS incident not found');
    }

    // Check authorization - user can only see their own incidents unless admin/moderator
    if (userId && incident.userId !== userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
        throw new AuthorizationError('Access denied');
      }
    }

    return incident;
  }

  // Update SOS incident status (admin/moderator only)
  async updateSosStatus(
    incidentId: string,
    data: SosUpdateRequest,
    updatedBy: string
  ): Promise<SosIncident> {
    // Verify incident exists
    const incident = await prisma.sosIncident.findUnique({
      where: { id: incidentId },
      include: { user: true },
    });

    if (!incident) {
      throw new NotFoundError('SOS incident not found');
    }

    // Update status
    const updatedIncident = await prisma.sosIncident.update({
      where: { id: incidentId },
      data: {
        status: data.status,
        updatedAt: new Date(),
      },
    });

    // Send notification to user about status update
    await notificationQueue.add('send-notification', {
      userId: incident.userId,
      type: 'email',
      template: 'sos-status-update',
      data: {
        incidentId,
        status: data.status,
        userName: `${incident.user.firstName} ${incident.user.lastName}`,
      },
    });

    logger.info(`SOS incident ${incidentId} status updated to ${data.status} by ${updatedBy}`);
    return updatedIncident;
  }

  // Generate pre-signed URLs for media upload
  async generateMediaUploadUrls(
    incidentId: string,
    files: MediaUploadRequest[],
    userId: string
  ): Promise<MediaUploadResponse[]> {
    // Verify incident exists and user owns it
    const incident = await prisma.sosIncident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new NotFoundError('SOS incident not found');
    }

    if (incident.userId !== userId) {
      throw new AuthorizationError('Access denied');
    }

    // Validate files
    const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime', 'audio/mpeg', 'audio/wav'];
    const maxFileSize = 50 * 1024 * 1024; // 50MB

    for (const file of files) {
      if (!allowedTypes.includes(file.contentType)) {
        throw new ValidationError(`File type ${file.contentType} not allowed`);
      }
      if (file.size > maxFileSize) {
        throw new ValidationError(`File ${file.filename} exceeds maximum size of 50MB`);
      }
    }

    // Generate upload URLs and create media asset records
    const uploadResponses: MediaUploadResponse[] = [];

    for (const file of files) {
      const uploadId = generateId('upload');
      const s3Key = generateS3Key('sos', file.filename, userId);
      
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
          sosIncidentId: incidentId,
        },
      });

      uploadResponses.push({
        uploadId,
        uploadUrl,
      });
    }

    logger.info(`Generated ${uploadResponses.length} upload URLs for SOS incident ${incidentId}`);
    return uploadResponses;
  }

  // Complete media upload process
  async completeMediaUpload(incidentId: string, uploadIds: string[], userId: string): Promise<void> {
    // Verify incident ownership
    const incident = await prisma.sosIncident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new NotFoundError('SOS incident not found');
    }

    if (incident.userId !== userId) {
      throw new AuthorizationError('Access denied');
    }

    // Update media assets status
    await prisma.mediaAsset.updateMany({
      where: {
        id: { in: uploadIds },
        sosIncidentId: incidentId,
      },
      data: {
        uploadStatus: 'COMPLETED',
        updatedAt: new Date(),
      },
    });

    // Update incident timestamp
    await prisma.sosIncident.update({
      where: { id: incidentId },
      data: { updatedAt: new Date() },
    });

    logger.info(`Completed media upload for SOS incident ${incidentId}, ${uploadIds.length} files`);
  }

  // Get user's SOS incidents
  async getUserSosIncidents(
    userId: string,
    pagination: Pagination
  ): Promise<{ incidents: (SosIncident & { mediaAssets: MediaAsset[] })[]; total: number }> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const offset = calculateOffset(page, limit);

    const [incidents, total] = await Promise.all([
      prisma.sosIncident.findMany({
        where: { userId },
        include: {
          mediaAssets: {
            where: { uploadStatus: 'COMPLETED' },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit,
      }),
      prisma.sosIncident.count({
        where: { userId },
      }),
    ]);

    return { incidents, total };
  }

  // Get all SOS incidents (admin/moderator only)
  async getAllSosIncidents(
    pagination: Pagination,
    filters: { status?: SosStatus; priority?: SosPriority } = {}
  ): Promise<{ incidents: (SosIncident & { mediaAssets: MediaAsset[] })[]; total: number }> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const offset = calculateOffset(page, limit);

    // Build where clause
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;

    const [incidents, total] = await Promise.all([
      prisma.sosIncident.findMany({
        where,
        include: {
          mediaAssets: {
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
      prisma.sosIncident.count({ where }),
    ]);

    return { incidents, total };
  }

  // Get SOS statistics (admin dashboard)
  async getSosStatistics(): Promise<{
    total: number;
    byStatus: Record<SosStatus, number>;
    byPriority: Record<SosPriority, number>;
    recent24h: number;
  }> {
    const [
      total,
      statusCounts,
      priorityCounts,
      recent24h
    ] = await Promise.all([
      prisma.sosIncident.count(),
      prisma.sosIncident.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.sosIncident.groupBy({
        by: ['priority'],
        _count: true,
      }),
      prisma.sosIncident.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const byStatus = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<SosStatus, number>);

    const byPriority = priorityCounts.reduce((acc, item) => {
      acc[item.priority] = item._count;
      return acc;
    }, {} as Record<SosPriority, number>);

    return { total, byStatus, byPriority, recent24h };
  }

  // Private helper methods
  private getPriorityWeight(priority: SosPriority): number {
    switch (priority) {
      case SosPriority.CRITICAL: return 1;
      case SosPriority.HIGH: return 2;
      case SosPriority.MEDIUM: return 3;
      case SosPriority.LOW: return 4;
      default: return 3;
    }
  }
}

export const sosService = new SosService();