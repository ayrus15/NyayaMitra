import { Router } from 'express';
import { authService } from '../services';
import { 
  validateBody,
  validateParams,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  idParamSchema,
  authRateLimit,
  authenticateToken,
  asyncHandler,
} from '../middleware';
import { createResponse, createErrorResponse } from '../utils';
import { logger } from '../config/logger';

const router = Router();

// Apply auth rate limiting to all auth routes
router.use(authRateLimit);

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    
    logger.info(`User registered: ${result.user.email} (ID: ${result.user.id})`);
    
    res.status(201).json(createResponse(result, 'User registered successfully'));
  })
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    
    logger.info(`User logged in: ${result.user.email} (ID: ${result.user.id})`);
    
    res.json(createResponse(result, 'Login successful'));
  })
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  validateBody(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshTokens(refreshToken);
    
    logger.info('Tokens refreshed');
    
    res.json(createResponse(tokens, 'Tokens refreshed successfully'));
  })
);

/**
 * POST /api/auth/logout
 * Logout user (invalidate refresh token)
 */
router.post(
  '/logout',
  validateBody(refreshTokenSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    
    logger.info('User logged out');
    
    res.json(createResponse(null, 'Logout successful'));
  })
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get(
  '/me',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user!.userId);
    
    res.json(createResponse(user, 'Profile retrieved successfully'));
  })
);

/**
 * GET /api/auth/verify
 * Verify token (useful for frontend token validation)
 */
router.get(
  '/verify',
  authenticateToken,
  asyncHandler(async (req, res) => {
    // If we reach here, token is valid (middleware verified it)
    res.json(createResponse(req.user, 'Token is valid'));
  })
);

export default router;