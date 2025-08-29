// Temporary mock for missing Prisma types - just for building the frontend
export enum UserRole {
  CITIZEN = 'CITIZEN',
  ADVOCATE = 'ADVOCATE', 
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR'
}

export enum CaseStatus {
  PENDING = 'PENDING',
  ONGOING = 'ONGOING',
  ADJOURNED = 'ADJOURNED',
  DISPOSED = 'DISPOSED',
  DISMISSED = 'DISMISSED'
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

export enum ReportStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  INVESTIGATING = 'INVESTIGATING',
  ACTION_TAKEN = 'ACTION_TAKEN',
  CLOSED = 'CLOSED',
  DISMISSED = 'DISMISSED'
}

export enum UploadStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM'
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}