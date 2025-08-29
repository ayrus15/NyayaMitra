import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ValidationError } from '../types';
import { logger } from '../config/logger';

// Generic validation middleware factory
export const validateSchema = (schema: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // Validate request params
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      // Validate request query
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Validation error:', { errors: errorMessages, body: req.body });

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errorMessages,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error('Unexpected validation error:', error);
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          timestamp: new Date().toISOString(),
        });
      }
    }
  };
};

// Common validation schemas

// Pagination schema
export const paginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? Math.min(parseInt(val, 10), 100) : 10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ID parameter schema
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

// User ID parameter schema
export const userIdParamSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

// Auth validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  phone: z.string().optional().refine(val => !val || /^\+?[\d\s\-\(\)]{10,}$/.test(val), {
    message: 'Invalid phone number format',
  }),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  role: z.enum(['CITIZEN', 'ADVOCATE', 'ADMIN', 'MODERATOR']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Case validation schemas
export const caseFollowSchema = z.object({
  caseId: z.string().min(1, 'Case ID is required'),
});

export const caseSearchSchema = z.object({
  query: z.string().optional(),
  status: z.enum(['PENDING', 'ONGOING', 'ADJOURNED', 'DISPOSED', 'DISMISSED']).optional(),
  court: z.string().optional(),
  fromDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), {
    message: 'Invalid from date',
  }),
  toDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), {
    message: 'Invalid to date',
  }),
});

// SOS validation schemas
export const sosCreateSchema = z.object({
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().min(1, 'Address is required'),
  }),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

export const sosUpdateSchema = z.object({
  status: z.enum(['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED']),
});

// Report validation schemas
export const reportCreateSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(200, 'Title too long'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  department: z.string().min(1, 'Department is required').max(100, 'Department name too long'),
  officialName: z.string().optional().refine(val => !val || val.length <= 100, {
    message: 'Official name too long',
  }),
  location: z.string().min(1, 'Location is required').max(200, 'Location too long'),
  incidentDate: z.string().refine(val => !isNaN(Date.parse(val)) && new Date(val) <= new Date(), {
    message: 'Invalid incident date or date is in the future',
  }),
  isAnonymous: z.boolean().optional(),
});

export const reportUpdateSchema = z.object({
  status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'INVESTIGATING', 'ACTION_TAKEN', 'CLOSED', 'DISMISSED']),
  assignedTo: z.string().optional(),
  resolution: z.string().optional(),
});

// Chat validation schemas
export const chatSessionCreateSchema = z.object({
  title: z.string().optional().refine(val => !val || val.length <= 100, {
    message: 'Title too long',
  }),
});

export const chatMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(4000, 'Message too long'),
  role: z.enum(['USER', 'ASSISTANT', 'SYSTEM']).optional(),
});

export const chatSessionUpdateSchema = z.object({
  title: z.string().optional().refine(val => !val || val.length <= 100, {
    message: 'Title too long',
  }),
  isActive: z.boolean().optional(),
});

// Media upload validation schemas
export const mediaUploadSchema = z.object({
  files: z.array(z.object({
    filename: z.string().min(1, 'Filename is required').max(255, 'Filename too long'),
    contentType: z.string().min(1, 'Content type is required'),
    size: z.number().min(1, 'File size must be greater than 0').max(100 * 1024 * 1024, 'File too large (max 100MB)'),
  })).min(1, 'At least one file is required').max(10, 'Maximum 10 files allowed'),
});

export const mediaCompleteSchema = z.object({
  uploadIds: z.array(z.string().min(1)).min(1, 'At least one upload ID is required'),
});

// Convenience validators
export const validateBody = (schema: ZodSchema) => validateSchema({ body: schema });
export const validateParams = (schema: ZodSchema) => validateSchema({ params: schema });
export const validateQuery = (schema: ZodSchema) => validateSchema({ query: schema });
export const validateAll = (body?: ZodSchema, params?: ZodSchema, query?: ZodSchema) =>
  validateSchema({ body, params, query });