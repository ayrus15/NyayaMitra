import crypto from 'crypto';
import { ApiResponse, PaginatedResponse, Pagination } from '../types';

// Generate unique ID
export const generateId = (prefix?: string): string => {
  const id = crypto.randomBytes(16).toString('hex');
  return prefix ? `${prefix}_${id}` : id;
};

// Generate secure random string
export const generateSecureString = (length = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

// Create API response
export const createResponse = <T>(
  data?: T,
  message?: string,
  success = true
): ApiResponse<T> => ({
  success,
  data,
  message,
  timestamp: new Date().toISOString(),
});

// Create error response
export const createErrorResponse = (
  error: string,
  message?: string
): ApiResponse => ({
  success: false,
  error,
  message,
  timestamp: new Date().toISOString(),
});

// Create paginated response
export const createPaginatedResponse = <T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  message?: string
): PaginatedResponse<T> => ({
  success: true,
  data,
  message,
  pagination: {
    ...pagination,
    totalPages: Math.ceil(pagination.total / pagination.limit),
  },
  timestamp: new Date().toISOString(),
});

// Parse pagination parameters
export const parsePagination = (query: any): Pagination => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const sortBy = query.sortBy as string;
  const sortOrder = (query.sortOrder === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

  return { page, limit, sortBy, sortOrder };
};

// Calculate offset for database queries
export const calculateOffset = (page: number, limit: number): number => {
  return (page - 1) * limit;
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone format (basic)
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

// Sanitize filename for S3
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};

// Generate S3 key
export const generateS3Key = (
  folder: string,
  filename: string,
  userId?: string
): string => {
  const timestamp = Date.now();
  const sanitized = sanitizeFilename(filename);
  const userPrefix = userId ? `${userId}/` : '';
  
  return `${folder}/${userPrefix}${timestamp}_${sanitized}`;
};

// Parse location coordinates
export const parseLocation = (locationString: string): { lat: number; lng: number } | null => {
  try {
    const coords = locationString.split(',').map(c => parseFloat(c.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      return { lat: coords[0], lng: coords[1] };
    }
  } catch (error) {
    // Invalid format
  }
  return null;
};

// Format date for display
export const formatDate = (date: Date | string, format = 'YYYY-MM-DD'): string => {
  const d = new Date(date);
  
  if (format === 'YYYY-MM-DD') {
    return d.toISOString().split('T')[0];
  }
  
  if (format === 'DD/MM/YYYY') {
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${d.getFullYear()}`;
  }
  
  return d.toISOString();
};

// Sleep utility for testing/delays
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Remove undefined/null values from object
export const cleanObject = (obj: Record<string, any>): Record<string, any> => {
  const cleaned: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
};

// Mask sensitive data for logging
export const maskSensitiveData = (data: any): any => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const masked = { ...data };
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];
  
  for (const key in masked) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      masked[key] = '***masked***';
    }
  }
  
  return masked;
};