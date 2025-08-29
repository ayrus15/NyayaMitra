import { MediaAsset, UploadStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { s3Client, generateUploadUrl, generateDownloadUrl, getPublicUrl } from '../config/s3';
import { DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { 
  MediaUploadRequest,
  MediaUploadResponse,
  NotFoundError,
  ValidationError
} from '../types';
import { generateS3Key, generateId } from '../utils';
import { logger } from '../config/logger';

export class MediaService {
  // Generate presigned upload URLs for multiple files
  async generateUploadUrls(
    files: MediaUploadRequest[],
    folder: string,
    userId: string,
    entityId?: string,
    entityType?: 'sos' | 'report'
  ): Promise<MediaUploadResponse[]> {
    // Validate files
    this.validateFiles(files);

    const uploadResponses: MediaUploadResponse[] = [];

    for (const file of files) {
      const uploadId = generateId('upload');
      const s3Key = generateS3Key(folder, file.filename, userId);
      
      // Generate pre-signed URL
      const uploadUrl = await generateUploadUrl(s3Key, file.contentType, 3600);

      // Create pending media asset record
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          id: uploadId,
          filename: file.filename,
          originalName: file.filename,
          mimeType: file.contentType,
          size: file.size,
          s3Key,
          s3Url: getPublicUrl(s3Key),
          uploadStatus: UploadStatus.PENDING,
          sosIncidentId: entityType === 'sos' ? entityId : null,
          corruptionReportId: entityType === 'report' ? entityId : null,
        },
      });

      uploadResponses.push({
        uploadId,
        uploadUrl,
      });
    }

    logger.info(`Generated ${uploadResponses.length} upload URLs for folder ${folder}`);
    return uploadResponses;
  }

  // Complete upload process and mark files as completed
  async completeUpload(uploadIds: string[]): Promise<MediaAsset[]> {
    // Verify all uploads exist and are pending
    const mediaAssets = await prisma.mediaAsset.findMany({
      where: {
        id: { in: uploadIds },
        uploadStatus: UploadStatus.PENDING,
      },
    });

    if (mediaAssets.length !== uploadIds.length) {
      throw new NotFoundError('Some upload IDs not found or already completed');
    }

    // Verify files actually exist in S3
    const verifiedAssets: MediaAsset[] = [];
    
    for (const asset of mediaAssets) {
      try {
        await s3Client.send(new HeadObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: asset.s3Key,
        }));
        
        verifiedAssets.push(asset);
      } catch (error) {
        logger.warn(`File ${asset.s3Key} not found in S3, marking as failed`);
        await prisma.mediaAsset.update({
          where: { id: asset.id },
          data: { uploadStatus: UploadStatus.FAILED },
        });
      }
    }

    // Update status to completed for verified assets
    if (verifiedAssets.length > 0) {
      await prisma.mediaAsset.updateMany({
        where: {
          id: { in: verifiedAssets.map(a => a.id) },
        },
        data: {
          uploadStatus: UploadStatus.COMPLETED,
          updatedAt: new Date(),
        },
      });
    }

    logger.info(`Completed upload for ${verifiedAssets.length} files`);
    return verifiedAssets;
  }

  // Get media asset by ID
  async getMediaAssetById(assetId: string): Promise<MediaAsset> {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundError('Media asset not found');
    }

    return asset;
  }

  // Generate download URL for a media asset
  async generateDownloadUrl(assetId: string, expiresIn = 3600): Promise<string> {
    const asset = await this.getMediaAssetById(assetId);

    if (asset.uploadStatus !== UploadStatus.COMPLETED) {
      throw new ValidationError('File is not available for download');
    }

    return await generateDownloadUrl(asset.s3Key, expiresIn);
  }

  // Delete media asset
  async deleteMediaAsset(assetId: string): Promise<void> {
    const asset = await this.getMediaAssetById(assetId);

    try {
      // Delete from S3
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: asset.s3Key,
      }));

      // Delete from database
      await prisma.mediaAsset.delete({
        where: { id: assetId },
      });

      logger.info(`Deleted media asset ${assetId} from S3 and database`);
    } catch (error) {
      logger.error(`Failed to delete media asset ${assetId}:`, error);
      throw new Error('Failed to delete media asset');
    }
  }

  // Get media assets for an entity
  async getMediaAssetsByEntity(
    entityId: string,
    entityType: 'sos' | 'report'
  ): Promise<MediaAsset[]> {
    const where = entityType === 'sos' 
      ? { sosIncidentId: entityId }
      : { corruptionReportId: entityId };

    return await prisma.mediaAsset.findMany({
      where: {
        ...where,
        uploadStatus: UploadStatus.COMPLETED,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Clean up failed or abandoned uploads (background job)
  async cleanupAbandonedUploads(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Find abandoned pending uploads
    const abandonedUploads = await prisma.mediaAsset.findMany({
      where: {
        uploadStatus: UploadStatus.PENDING,
        createdAt: { lt: cutoffDate },
      },
    });

    for (const upload of abandonedUploads) {
      try {
        // Try to delete from S3 (might not exist)
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: upload.s3Key,
        }));
      } catch (error) {
        // Ignore S3 errors - file might not exist
      }

      // Delete from database
      await prisma.mediaAsset.delete({
        where: { id: upload.id },
      });
    }

    logger.info(`Cleaned up ${abandonedUploads.length} abandoned uploads`);
  }

  // Get storage statistics
  async getStorageStatistics(): Promise<{
    totalFiles: number;
    totalSize: number;
    byStatus: Record<UploadStatus, number>;
    byType: { type: string; count: number; size: number }[];
  }> {
    const [
      totalStats,
      statusCounts,
      typeCounts
    ] = await Promise.all([
      prisma.mediaAsset.aggregate({
        _count: true,
        _sum: { size: true },
        where: { uploadStatus: UploadStatus.COMPLETED },
      }),
      prisma.mediaAsset.groupBy({
        by: ['uploadStatus'],
        _count: true,
      }),
      prisma.mediaAsset.groupBy({
        by: ['mimeType'],
        _count: true,
        _sum: { size: true },
        where: { uploadStatus: UploadStatus.COMPLETED },
      }),
    ]);

    const byStatus = statusCounts.reduce((acc, item) => {
      acc[item.uploadStatus] = item._count;
      return acc;
    }, {} as Record<UploadStatus, number>);

    const byType = typeCounts.map(item => ({
      type: item.mimeType,
      count: item._count,
      size: item._sum.size || 0,
    }));

    return {
      totalFiles: totalStats._count,
      totalSize: totalStats._sum.size || 0,
      byStatus,
      byType,
    };
  }

  // Private helper methods
  private validateFiles(files: MediaUploadRequest[]): void {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'video/mp4', 'video/quicktime', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    const maxFiles = 10;

    if (files.length > maxFiles) {
      throw new ValidationError(`Maximum ${maxFiles} files allowed per upload`);
    }

    for (const file of files) {
      if (!file.filename || !file.contentType) {
        throw new ValidationError('Filename and content type are required');
      }

      if (!allowedTypes.includes(file.contentType)) {
        throw new ValidationError(`File type ${file.contentType} not allowed`);
      }

      if (file.size > maxFileSize) {
        throw new ValidationError(`File ${file.filename} exceeds maximum size of 100MB`);
      }

      if (file.size <= 0) {
        throw new ValidationError(`File ${file.filename} is empty`);
      }

      // Validate filename
      if (file.filename.length > 255) {
        throw new ValidationError('Filename is too long');
      }

      if (!/^[a-zA-Z0-9._-]+$/.test(file.filename)) {
        throw new ValidationError('Filename contains invalid characters');
      }
    }
  }

  // Get file type category
  private getFileCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('text/')) return 'text';
    if (mimeType.includes('document')) return 'document';
    return 'other';
  }
}

export const mediaService = new MediaService();