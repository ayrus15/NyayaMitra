import { Router } from 'express';
import { sosService } from '../services';
import {
  authenticateToken,
  requireAdminOrModerator,
  validateParams,
  validateQuery,
  validateBody,
  idParamSchema,
  paginationSchema,
  sosCreateSchema,
  sosUpdateSchema,
  mediaUploadSchema,
  mediaCompleteSchema,
  sosRateLimit,
  asyncHandler,
} from '../middleware';
import { createResponse, createPaginatedResponse, parsePagination } from '../utils';
import { logger } from '../config/logger';
import { z } from 'zod';

const router = Router();

// All SOS routes require authentication
router.use(authenticateToken);

/**
 * GET /api/sos/my-incidents
 * Get user's SOS incidents
 */
router.get(
  '/my-incidents',
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { incidents, total } = await sosService.getUserSosIncidents(req.user!.userId, pagination);
    
    res.json(createPaginatedResponse(
      incidents,
      { ...pagination, total },
      'User SOS incidents retrieved successfully'
    ));
  })
);

/**
 * GET /api/sos/admin/all
 * Get all SOS incidents (admin/moderator only)
 */
router.get(
  '/admin/all',
  requireAdminOrModerator,
  validateQuery(paginationSchema.merge(sosFiltersSchema)),
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { status, priority, ...queryParams } = req.query as any;
    const filters = { status, priority };
    
    const { incidents, total } = await sosService.getAllSosIncidents(pagination, filters);
    
    res.json(createPaginatedResponse(
      incidents,
      { ...pagination, total },
      'All SOS incidents retrieved successfully'
    ));
  })
);

/**
 * GET /api/sos/admin/statistics
 * Get SOS statistics (admin only)
 */
router.get(
  '/admin/statistics',
  requireAdminOrModerator,
  asyncHandler(async (req, res) => {
    const statistics = await sosService.getSosStatistics();
    
    res.json(createResponse(statistics, 'SOS statistics retrieved successfully'));
  })
);

// SOS filters schema
const sosFiltersSchema = z.object({
  status: z.enum(['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

/**
 * POST /api/sos
 * Create SOS incident
 */
router.post(
  '/',
  sosRateLimit,
  validateBody(sosCreateSchema),
  asyncHandler(async (req, res) => {
    const incident = await sosService.createSosIncident(req.user!.userId, req.body);
    
    logger.info(`SOS incident ${incident.id} created by user ${req.user!.userId}`, {
      priority: incident.priority,
      location: incident.location,
    });
    
    res.status(201).json(createResponse(incident, 'SOS incident created and dispatched'));
  })
);

/**
 * GET /api/sos/:id
 * Get SOS incident details
 */
router.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const incident = await sosService.getSosIncidentById(req.params.id, req.user!.userId);
    
    res.json(createResponse(incident, 'SOS incident retrieved successfully'));
  })
);

/**
 * PATCH /api/sos/:id/status
 * Update SOS incident status (admin/moderator only)
 */
router.patch(
  '/:id/status',
  requireAdminOrModerator,
  validateParams(idParamSchema),
  validateBody(sosUpdateSchema),
  asyncHandler(async (req, res) => {
    const incident = await sosService.updateSosStatus(
      req.params.id,
      req.body,
      req.user!.userId
    );
    
    logger.info(`SOS incident ${req.params.id} status updated to ${req.body.status} by ${req.user!.userId}`);
    
    res.json(createResponse(incident, 'SOS incident status updated successfully'));
  })
);

/**
 * POST /api/sos/:id/media/upload-urls
 * Get pre-signed URLs for media upload
 */
router.post(
  '/:id/media/upload-urls',
  validateParams(idParamSchema),
  validateBody(mediaUploadSchema),
  asyncHandler(async (req, res) => {
    const uploadUrls = await sosService.generateMediaUploadUrls(
      req.params.id,
      req.body.files,
      req.user!.userId
    );
    
    logger.info(`Generated ${uploadUrls.length} upload URLs for SOS incident ${req.params.id}`);
    
    res.json(createResponse(uploadUrls, 'Upload URLs generated successfully'));
  })
);

/**
 * POST /api/sos/:id/media/complete
 * Complete media upload process
 */
router.post(
  '/:id/media/complete',
  validateParams(idParamSchema),
  validateBody(mediaCompleteSchema),
  asyncHandler(async (req, res) => {
    await sosService.completeMediaUpload(
      req.params.id,
      req.body.uploadIds,
      req.user!.userId
    );
    
    logger.info(`Completed media upload for SOS incident ${req.params.id}`);
    
    res.json(createResponse(null, 'Media upload completed successfully'));
  })
);

export default router;