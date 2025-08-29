// User and Authentication Types
export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  CITIZEN = 'CITIZEN',
  ADVOCATE = 'ADVOCATE',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR'
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

// Case Types
export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  court: string;
  status: CaseStatus;
  nextHearing?: string;
  lastHearing?: string;
  description?: string;
  parties: string[];
  createdAt: string;
  updatedAt: string;
}

export enum CaseStatus {
  PENDING = 'PENDING',
  ONGOING = 'ONGOING',
  ADJOURNED = 'ADJOURNED',
  DISPOSED = 'DISPOSED',
  DISMISSED = 'DISMISSED'
}

export interface CaseSearchParams {
  query?: string;
  status?: CaseStatus;
  court?: string;
  fromDate?: string;
  toDate?: string;
}

// SOS Types
export interface SosIncident {
  id: string;
  userId: string;
  location: {
    lat: number;
    lng: number;
  };
  address?: string;
  description?: string;
  status: SosStatus;
  priority: SosPriority;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export enum SosStatus {
  ACTIVE = 'ACTIVE',
  DISPATCHED = 'DISPATCHED',
  RESOLVED = 'RESOLVED',
  FALSE_ALARM = 'FALSE_ALARM'
}

export enum SosPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface SosRequest {
  location: {
    lat: number;
    lng: number;
  };
  address?: string;
  description?: string;
  priority?: SosPriority;
}

// Chat Types
export interface ChatSession {
  id: string;
  title?: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  content: string;
  role: MessageRole;
  createdAt: string;
}

export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM'
}

export interface MessageRequest {
  content: string;
  role?: MessageRole;
}

// Report Types
export interface CorruptionReport {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  location: string;
  incidentDate: string;
  status: ReportStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  resolution?: string;
}

export enum ReportStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  INVESTIGATING = 'INVESTIGATING',
  ACTION_TAKEN = 'ACTION_TAKEN',
  CLOSED = 'CLOSED',
  DISMISSED = 'DISMISSED'
}

export interface ReportRequest {
  title: string;
  description: string;
  category: string;
  location: string;
  incidentDate: string;
  isAnonymous?: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: any;
}