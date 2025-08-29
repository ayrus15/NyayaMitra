import { Router } from 'express';
import { chatbotService } from '../services';
import {
  authenticateToken,
  validateParams,
  validateQuery,
  validateBody,
  idParamSchema,
  paginationSchema,
  chatSessionCreateSchema,
  chatMessageSchema,
  chatSessionUpdateSchema,
  asyncHandler,
} from '../middleware';
import { createResponse, createPaginatedResponse, parsePagination } from '../utils';
import { logger } from '../config/logger';

const router = Router();

// All chat routes require authentication
router.use(authenticateToken);

/**
 * POST /api/chat/sessions
 * Create new chat session
 */
router.post(
  '/sessions',
  validateBody(chatSessionCreateSchema),
  asyncHandler(async (req, res) => {
    const session = await chatbotService.createChatSession(req.user!.userId, req.body);
    
    logger.info(`Created chat session ${session.id} for user ${req.user!.userId}`);
    
    res.status(201).json(createResponse(session, 'Chat session created successfully'));
  })
);

/**
 * GET /api/chat/sessions
 * Get user's chat sessions
 */
router.get(
  '/sessions',
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { sessions, total } = await chatbotService.getUserChatSessions(req.user!.userId, pagination);
    
    res.json(createPaginatedResponse(
      sessions,
      { ...pagination, total },
      'Chat sessions retrieved successfully'
    ));
  })
);

/**
 * GET /api/chat/sessions/:id
 * Get specific chat session
 */
router.get(
  '/sessions/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const session = await chatbotService.getChatSessionById(req.params.id, req.user!.userId);
    
    res.json(createResponse(session, 'Chat session retrieved successfully'));
  })
);

/**
 * PATCH /api/chat/sessions/:id
 * Update chat session (title, active status)
 */
router.patch(
  '/sessions/:id',
  validateParams(idParamSchema),
  validateBody(chatSessionUpdateSchema),
  asyncHandler(async (req, res) => {
    const session = await chatbotService.updateChatSession(
      req.params.id,
      req.user!.userId,
      req.body
    );
    
    logger.info(`Updated chat session ${req.params.id}`);
    
    res.json(createResponse(session, 'Chat session updated successfully'));
  })
);

/**
 * DELETE /api/chat/sessions/:id
 * Delete chat session
 */
router.delete(
  '/sessions/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    await chatbotService.deleteChatSession(req.params.id, req.user!.userId);
    
    logger.info(`Deleted chat session ${req.params.id}`);
    
    res.json(createResponse(null, 'Chat session deleted successfully'));
  })
);

/**
 * POST /api/chat/sessions/:id/messages
 * Send message to chatbot
 */
router.post(
  '/sessions/:id/messages',
  validateParams(idParamSchema),
  validateBody(chatMessageSchema),
  asyncHandler(async (req, res) => {
    const { userMessage, botMessage } = await chatbotService.sendMessage(
      req.params.id,
      req.body,
      req.user!.userId
    );
    
    logger.info(`Processed message in chat session ${req.params.id}`);
    
    res.json(createResponse(
      { userMessage, botMessage },
      'Message processed successfully'
    ));
  })
);

/**
 * GET /api/chat/sessions/:id/messages
 * Get chat messages for a session
 */
router.get(
  '/sessions/:id/messages',
  validateParams(idParamSchema),
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query);
    const { messages, total } = await chatbotService.getChatMessages(
      req.params.id,
      req.user!.userId,
      pagination
    );
    
    res.json(createPaginatedResponse(
      messages,
      { ...pagination, total },
      'Chat messages retrieved successfully'
    ));
  })
);

export default router;