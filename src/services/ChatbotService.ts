import { ChatSession, ChatMessage, MessageRole } from '@prisma/client';
import { prisma } from '../config/database';
import { config } from '../config';
import { 
  ChatSessionCreateRequest,
  ChatMessageRequest,
  NotFoundError,
  AuthorizationError,
  ValidationError,
  Pagination
} from '../types';
import { calculateOffset } from '../utils';
import { logger } from '../config/logger';

interface PickleaxeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface PickleaxeResponse {
  id: string;
  message: string;
  confidence: number;
  sources?: string[];
  suggestions?: string[];
}

export class ChatbotService {
  // Create new chat session
  async createChatSession(userId: string, data: ChatSessionCreateRequest): Promise<ChatSession> {
    const { title } = data;

    const session = await prisma.chatSession.create({
      data: {
        userId,
        title: title || 'New Legal Chat',
        isActive: true,
      },
    });

    // Add welcome message
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        content: 'Hello! I\'m your legal assistant. I can help you with legal questions, case information, and legal procedures. How can I assist you today?',
        role: MessageRole.ASSISTANT,
      },
    });

    logger.info(`Created new chat session ${session.id} for user ${userId}`);
    return session;
  }

  // Get chat session by ID
  async getChatSessionById(sessionId: string, userId: string): Promise<ChatSession> {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('Chat session not found');
    }

    if (session.userId !== userId) {
      throw new AuthorizationError('Access denied');
    }

    return session;
  }

  // Send message to chatbot
  async sendMessage(
    sessionId: string,
    data: ChatMessageRequest,
    userId: string
  ): Promise<{ userMessage: ChatMessage; botMessage: ChatMessage }> {
    const { content, role } = data;

    // Verify session ownership
    const session = await this.getChatSessionById(sessionId, userId);

    if (!session.isActive) {
      throw new ValidationError('Chat session is not active');
    }

    // Validate message
    if (!content.trim()) {
      throw new ValidationError('Message content cannot be empty');
    }

    if (content.length > 4000) {
      throw new ValidationError('Message content is too long (max 4000 characters)');
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        content: content.trim(),
        role: role || MessageRole.USER,
      },
    });

    // Get conversation context (last 10 messages)
    const recentMessages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Prepare context for Pickleaxe API
    const conversationContext = recentMessages
      .reverse()
      .map(msg => ({
        role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: msg.createdAt.toISOString(),
      }));

    // Call Pickleaxe API
    let botResponse: PickleaxeResponse;
    try {
      botResponse = await this.callPickleaxeAPI(content, conversationContext);
    } catch (error) {
      logger.error('Pickleaxe API error:', error);
      // Fallback response
      botResponse = {
        id: 'fallback',
        message: 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment, or contact support if the issue persists.',
        confidence: 0,
      };
    }

    // Save bot message
    const botMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        content: botResponse.message,
        role: MessageRole.ASSISTANT,
        metadata: {
          pickleaxeId: botResponse.id,
          confidence: botResponse.confidence,
          sources: botResponse.sources,
          suggestions: botResponse.suggestions,
        },
      },
    });

    // Update session
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { 
        updatedAt: new Date(),
        // Update title if it's still the default and we have enough context
        title: session.title === 'New Legal Chat' && userMessage.content.length > 10 
          ? this.generateSessionTitle(userMessage.content)
          : session.title,
      },
    });

    logger.info(`Processed message in chat session ${sessionId}`);
    return { userMessage, botMessage };
  }

  // Get chat messages for a session
  async getChatMessages(
    sessionId: string,
    userId: string,
    pagination: Pagination
  ): Promise<{ messages: ChatMessage[]; total: number }> {
    // Verify session ownership
    await this.getChatSessionById(sessionId, userId);

    const { page = 1, limit = 50, sortOrder = 'asc' } = pagination;
    const offset = calculateOffset(page, limit);

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: sortOrder },
        skip: offset,
        take: limit,
      }),
      prisma.chatMessage.count({
        where: { sessionId },
      }),
    ]);

    return { messages, total };
  }

  // Get user's chat sessions
  async getUserChatSessions(
    userId: string,
    pagination: Pagination
  ): Promise<{ sessions: (ChatSession & { _count: { messages: number } })[]; total: number }> {
    const { page = 1, limit = 20, sortOrder = 'desc' } = pagination;
    const offset = calculateOffset(page, limit);

    const [sessions, total] = await Promise.all([
      prisma.chatSession.findMany({
        where: { userId },
        include: {
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: sortOrder },
        skip: offset,
        take: limit,
      }),
      prisma.chatSession.count({
        where: { userId },
      }),
    ]);

    return { sessions, total };
  }

  // Update chat session
  async updateChatSession(
    sessionId: string,
    userId: string,
    updates: { title?: string; isActive?: boolean }
  ): Promise<ChatSession> {
    // Verify session ownership
    await this.getChatSessionById(sessionId, userId);

    const session = await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    logger.info(`Updated chat session ${sessionId}`);
    return session;
  }

  // Delete chat session
  async deleteChatSession(sessionId: string, userId: string): Promise<void> {
    // Verify session ownership
    await this.getChatSessionById(sessionId, userId);

    // Delete all messages first (cascade delete)
    await prisma.chatMessage.deleteMany({
      where: { sessionId },
    });

    // Delete session
    await prisma.chatSession.delete({
      where: { id: sessionId },
    });

    logger.info(`Deleted chat session ${sessionId}`);
  }

  // Private helper methods

  private async callPickleaxeAPI(
    message: string,
    context: PickleaxeMessage[]
  ): Promise<PickleaxeResponse> {
    const response = await fetch(`${config.pickleaxe.apiUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.pickleaxe.apiKey}`,
      },
      body: JSON.stringify({
        message,
        context: context.slice(-5), // Last 5 messages for context
        domain: 'legal',
        language: 'en',
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pickleaxe API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    return {
      id: data.id || 'unknown',
      message: data.response || data.message || 'I apologize, but I didn\'t receive a proper response. Could you please rephrase your question?',
      confidence: data.confidence || 0,
      sources: data.sources || [],
      suggestions: data.suggestions || [],
    };
  }

  private generateSessionTitle(firstMessage: string): string {
    // Simple title generation based on first message
    const title = firstMessage
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .slice(0, 5)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return title.length > 50 ? title.substring(0, 47) + '...' : title;
  }

  // Get chat statistics (admin)
  async getChatStatistics(): Promise<{
    totalSessions: number;
    totalMessages: number;
    activeSessions: number;
    avgMessagesPerSession: number;
    dailyActive: number;
  }> {
    const [
      totalSessions,
      totalMessages,
      activeSessions,
      dailyActive
    ] = await Promise.all([
      prisma.chatSession.count(),
      prisma.chatMessage.count(),
      prisma.chatSession.count({
        where: { isActive: true },
      }),
      prisma.chatSession.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const avgMessagesPerSession = totalSessions > 0 ? totalMessages / totalSessions : 0;

    return {
      totalSessions,
      totalMessages,
      activeSessions,
      avgMessagesPerSession: Math.round(avgMessagesPerSession * 100) / 100,
      dailyActive,
    };
  }
}

export const chatbotService = new ChatbotService();