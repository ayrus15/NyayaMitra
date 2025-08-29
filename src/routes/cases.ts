import { Router } from 'express';
import { caseService } from '../services';
import {
  authenticateToken,
  optionalAuthentication,
  validateParams,
  validateQuery,
  validateBody,
  idParamSchema,
  paginationSchema,
  caseFollowSchema,
  caseSearchSchema,
  asyncHandler,
} from '../middleware';
import { createResponse, createPaginatedResponse, parsePagination } from '../utils';
import { logger } from '../config/logger';

const router = Router();

/**
 * GET /api/cases/followed
 * Get user's followed cases
 */
router.get(
  '/followed',
  authenticateToken,
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { cases, total } = await caseService.getUserFollowedCases(req.user!.userId, pagination);
    
    res.json(createPaginatedResponse(
      cases,
      { ...pagination, total },
      'Followed cases retrieved successfully'
    ));
  })
);

/**
 * GET /api/cases/search
 * Search cases with filters
 */
router.get(
  '/search',
  optionalAuthentication,
  validateQuery(caseSearchSchema.merge(paginationSchema)),
  asyncHandler(async (req, res) => {
    const { query, ...filters } = req.query as any;
    const pagination = parsePagination(req.query);
    
    const { cases, total } = await caseService.searchCases(query, filters, pagination);
    
    res.json(createPaginatedResponse(
      cases,
      { ...pagination, total },
      'Cases retrieved successfully'
    ));
  })
);

/**
 * GET /api/cases/:id
 * Get case details by ID
 */
router.get(
  '/:id',
  optionalAuthentication,
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const caseData = await caseService.getCaseById(req.params.id);
    
    res.json(createResponse(caseData, 'Case details retrieved successfully'));
  })
);

/**
 * GET /api/cases/:id/events
 * Get case events timeline
 */
router.get(
  '/:id/events',
  optionalAuthentication,
  validateParams(idParamSchema),
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { events, total } = await caseService.getCaseEvents(req.params.id, pagination);
    
    res.json(createPaginatedResponse(
      events,
      { ...pagination, total },
      'Case events retrieved successfully'
    ));
  })
);

/**
 * POST /api/cases/follow
 * Follow a case for updates
 */
router.post(
  '/follow',
  authenticateToken,
  validateBody(caseFollowSchema),
  asyncHandler(async (req, res) => {
    const follow = await caseService.followCase(req.user!.userId, req.body);
    
    logger.info(`User ${req.user!.userId} followed case ${req.body.caseId}`);
    
    res.status(201).json(createResponse(follow, 'Case followed successfully'));
  })
);

/**
 * DELETE /api/cases/:id/follow
 * Unfollow a case
 */
router.delete(
  '/:id/follow',
  authenticateToken,
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    await caseService.unfollowCase(req.user!.userId, req.params.id);
    
    logger.info(`User ${req.user!.userId} unfollowed case ${req.params.id}`);
    
    res.json(createResponse(null, 'Case unfollowed successfully'));
  })
);

export default router;