import axios, { AxiosResponse } from 'axios';
import {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  CaseSearchParams,
  Case,
  SosRequest,
  SosIncident,
  ChatSession,
  ChatMessage,
  MessageRequest,
  ReportRequest,
  CorruptionReport
} from '../types';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: LoginCredentials): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/login', credentials),

  register: (userData: RegisterData): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/register', userData),

  getCurrentUser: (): Promise<AxiosResponse<{ user: User }>> =>
    api.get('/auth/me'),

  refreshToken: (refreshToken: string): Promise<AxiosResponse<{ tokens: any }>> =>
    api.post('/auth/refresh', { refreshToken }),

  logout: (): Promise<AxiosResponse<any>> =>
    api.post('/auth/logout'),
};

// Case API
export const caseAPI = {
  searchCases: (params: CaseSearchParams): Promise<AxiosResponse<{ cases: Case[] }>> =>
    api.get('/cases/search', { params }),

  followCase: (caseId: string): Promise<AxiosResponse<any>> =>
    api.post('/cases/follow', { caseId }),

  unfollowCase: (caseId: string): Promise<AxiosResponse<any>> =>
    api.delete(`/cases/follow/${caseId}`),

  getFollowedCases: (): Promise<AxiosResponse<{ cases: Case[] }>> =>
    api.get('/cases/followed'),

  getCaseById: (caseId: string): Promise<AxiosResponse<{ case: Case }>> =>
    api.get(`/cases/${caseId}`),
};

// SOS API
export const sosAPI = {
  createSos: (sosData: SosRequest): Promise<AxiosResponse<{ incident: SosIncident }>> =>
    api.post('/sos/create', sosData),

  updateLocation: (incidentId: string, location: { lat: number; lng: number }): Promise<AxiosResponse<{ incident: SosIncident }>> =>
    api.put(`/sos/${incidentId}/location`, { location }),

  cancelSos: (incidentId: string): Promise<AxiosResponse<{ incident: SosIncident }>> =>
    api.post(`/sos/${incidentId}/cancel`),

  getHistory: (): Promise<AxiosResponse<{ incidents: SosIncident[] }>> =>
    api.get('/sos/history'),

  getActiveIncident: (): Promise<AxiosResponse<{ incident: SosIncident | null }>> =>
    api.get('/sos/active'),
};

// Chat API
export const chatAPI = {
  createSession: (title?: string): Promise<AxiosResponse<{ session: ChatSession }>> =>
    api.post('/chat/sessions', { title }),

  getSessions: (): Promise<AxiosResponse<{ sessions: ChatSession[] }>> =>
    api.get('/chat/sessions'),

  getSessionMessages: (sessionId: string): Promise<AxiosResponse<{ messages: ChatMessage[] }>> =>
    api.get(`/chat/sessions/${sessionId}/messages`),

  sendMessage: (sessionId: string, message: MessageRequest): Promise<AxiosResponse<{ 
    userMessage: ChatMessage; 
    assistantMessage: ChatMessage;
  }>> =>
    api.post(`/chat/sessions/${sessionId}/messages`, message),

  updateSession: (sessionId: string, data: { title?: string; isActive?: boolean }): Promise<AxiosResponse<{ session: ChatSession }>> =>
    api.put(`/chat/sessions/${sessionId}`, data),

  deleteSession: (sessionId: string): Promise<AxiosResponse<any>> =>
    api.delete(`/chat/sessions/${sessionId}`),
};

// Report API
export const reportAPI = {
  submitReport: (reportData: ReportRequest): Promise<AxiosResponse<{ report: CorruptionReport }>> =>
    api.post('/reports', reportData),

  getReports: (): Promise<AxiosResponse<{ reports: CorruptionReport[] }>> =>
    api.get('/reports'),

  getReportById: (reportId: string): Promise<AxiosResponse<{ report: CorruptionReport }>> =>
    api.get(`/reports/${reportId}`),

  updateReportStatus: (reportId: string, status: string): Promise<AxiosResponse<{ report: CorruptionReport }>> =>
    api.put(`/reports/${reportId}/status`, { status }),

  deleteReport: (reportId: string): Promise<AxiosResponse<any>> =>
    api.delete(`/reports/${reportId}`),
};

// Media/File upload API
export const mediaAPI = {
  uploadFiles: (files: FileList): Promise<AxiosResponse<{ urls: string[] }>> => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    return api.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getPresignedUrl: (filename: string, contentType: string): Promise<AxiosResponse<{ uploadUrl: string; fileUrl: string }>> =>
    api.post('/media/presigned-url', { filename, contentType }),
};

export default api;