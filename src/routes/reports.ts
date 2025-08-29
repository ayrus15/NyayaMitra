import { Router } from 'express';
import { reportService } from '../services';
import {
  authenticateToken,
  requireAdminOrModerator,
  validateParams,
  validateQuery,
  validateBody,
  idParamSchema,
  paginationSchema,
  reportCreateSchema,
  reportUpdateSchema,
  mediaUploadSchema,
  mediaCompleteSchema,
  asyncHandler,
} from '../middleware';
import { createResponse, createPaginatedResponse, parsePagination } from '../utils';
import { logger } from '../config/logger';
import { z } from 'zod';

const router = Router();

// All report routes require authentication
router.use(authenticateToken);

/**
 * GET /api/reports/my-reports
 * Get user's reports
 */
router.get(
  '/my-reports',
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { reports, total } = await reportService.getUserReports(req.user!.userId, pagination);
    
    res.json(createPaginatedResponse(
      reports,
      { ...pagination, total },
      'User reports retrieved successfully'
    ));
  })
);

/**
 * GET /api/reports/admin/all
 * Get all reports (admin/moderator only)
 */
router.get(
  '/admin/all',
  requireAdminOrModerator,
  validateQuery(paginationSchema.merge(reportFiltersSchema)),
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { status, department, assignedTo, fromDate, toDate, ...queryParams } = req.query as any;
    const filters = { status, department, assignedTo, fromDate, toDate };
    
    const { reports, total } = await reportService.getAllReports(pagination, filters);
    
    res.json(createPaginatedResponse(
      reports,
      { ...pagination, total },
      'All reports retrieved successfully'
    ));
  })
);

/**
 * GET /api/reports/admin/statistics
 * Get report statistics (admin/moderator only)
 */
router.get(
  '/admin/statistics',
  requireAdminOrModerator,
  asyncHandler(async (req, res) => {
    const statistics = await reportService.getReportStatistics();
    
    res.json(createResponse(statistics, 'Report statistics retrieved successfully'));
  })
);

/**
 * GET /api/reports/department/:department
 * Get reports by department (for advocates/moderators)
 */
router.get(
  '/department/:department',
  validateParams(z.object({ department: z.string().min(1) })),
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { reports, total } = await reportService.getReportsByDepartment(
      req.params.department,
      pagination
    );
    
    res.json(createPaginatedResponse(
      reports,
      { ...pagination, total },
      `Reports for ${req.params.department} department retrieved successfully`
    ));
  })
);

// Report filters schema
const reportFiltersSchema = z.object({
  status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'INVESTIGATING', 'ACTION_TAKEN', 'CLOSED', 'DISMISSED']).optional(),
  department: z.string().optional(),
  assignedTo: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

/**
 * POST /api/reports
 * Create new corruption report
 */
router.post(
  '/',
  validateBody(reportCreateSchema),
  asyncHandler(async (req, res) => {
    const report = await reportService.createReport(req.user!.userId, req.body);
    
    logger.info(`Corruption report ${report.id} created by user ${req.user!.userId}`, {
      department: report.department,
      isAnonymous: report.isAnonymous,
    });
    
    res.status(201).json(createResponse(report, 'Corruption report submitted successfully'));
  })
);

/**
 * GET /api/reports/:id
 * Get report details
 */
router.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const report = await reportService.getReportById(
      req.params.id,
      req.user!.userId,
      req.user!.role
    );
    
    res.json(createResponse(report, 'Report retrieved successfully'));
  })
);

/**
 * PATCH /api/reports/:id/status
 * Update report status (admin/moderator only)
 */
router.patch(
  '/:id/status',
  requireAdminOrModerator,
  validateParams(idParamSchema),
  validateBody(reportUpdateSchema),
  asyncHandler(async (req, res) => {
    const report = await reportService.updateReportStatus(
      req.params.id,
      req.body,
      req.user!.userId
    );
    
    logger.info(`Report ${req.params.id} status updated to ${req.body.status} by ${req.user!.userId}`);
    
    res.json(createResponse(report, 'Report status updated successfully'));
  })
);

/**
 * POST /api/reports/:id/evidence/upload-urls
 * Get pre-signed URLs for evidence upload
 */
router.post(
  '/:id/evidence/upload-urls',
  validateParams(idParamSchema),
  validateBody(mediaUploadSchema),
  asyncHandler(async (req, res) => {
    const uploadUrls = await reportService.generateEvidenceUploadUrls(
      req.params.id,
      req.body.files,
      req.user!.userId
    );
    
    logger.info(`Generated ${uploadUrls.length} evidence upload URLs for report ${req.params.id}`);
    
    res.json(createResponse(uploadUrls, 'Evidence upload URLs generated successfully'));
  })
);

/**
 * POST /api/reports/:id/evidence/complete
 * Complete evidence upload process
 */
router.post(
  '/:id/evidence/complete',
  validateParams(idParamSchema),
  validateBody(mediaCompleteSchema),
  asyncHandler(async (req, res) => {
    await reportService.completeEvidenceUpload(
      req.params.id,
      req.body.uploadIds,
      req.user!.userId
    );
    
    logger.info(`Completed evidence upload for report ${req.params.id}`);
    
    res.json(createResponse(null, 'Evidence upload completed successfully'));
  })
);

export default router;