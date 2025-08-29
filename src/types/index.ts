import { User, UserRole, CaseStatus, SosStatus, SosPriority, ReportStatus, UploadStatus, MessageRole } from '@prisma/client';

// API Request/Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication Types
export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  phone?: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

// Case Types
export interface CaseCreateRequest {
  caseNumber: string;
  title: string;
  description?: string;
  court: string;
  judge?: string;
  filingDate: string;
  nextHearing?: string;
}

export interface CaseFollowRequest {
  caseId: string;
}

// SOS Types
export interface SosCreateRequest {
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  description: string;
  priority?: SosPriority;
}

export interface SosUpdateRequest {
  status: SosStatus;
}

export interface MediaUploadRequest {
  filename: string;
  contentType: string;
  size: number;
}

export interface MediaUploadResponse {
  uploadId: string;
  uploadUrl: string;
  fields?: Record<string, string>;
}

// Corruption Report Types
export interface ReportCreateRequest {
  title: string;
  description: string;
  department: string;
  officialName?: string;
  location: string;
  incidentDate: string;
  isAnonymous?: boolean;
}

export interface ReportUpdateRequest {
  status: ReportStatus;
  assignedTo?: string;
  resolution?: string;
}

// Chat Types
export interface ChatSessionCreateRequest {
  title?: string;
}

export interface ChatMessageRequest {
  content: string;
  role: MessageRole;
}

// Queue Job Types
export interface SosDispatchJobData {
  incidentId: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  description: string;
  priority: SosPriority;
  userContact: {
    phone?: string;
    email: string;
  };
}

export interface NotificationJobData {
  userId: string;
  type: 'email' | 'sms';
  template: string;
  data: Record<string, any>;
}

export interface CaseSyncJobData {
  caseId: string;
  lastSyncAt?: Date;
}

export interface ReportTriageJobData {
  reportId: string;
  department: string;
}

// Express Request Extensions
export interface AuthenticatedRequest extends Express.Request {
  user?: AuthPayload;
}

// Error Types
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

// Utility Types
export type Pagination = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type QueryFilters = Record<string, any>;

// Export Prisma types for convenience
export {
  User,
  UserRole,
  CaseStatus,
  SosStatus,
  SosPriority,
  ReportStatus,
  UploadStatus,
  MessageRole,
} from '@prisma/client';