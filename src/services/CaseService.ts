import { Case, CaseEvent, CaseFollow, EventType } from '@prisma/client';
import { prisma } from '../config/database';
import { 
  CaseCreateRequest,
  CaseFollowRequest,
  NotFoundError,
  ConflictError,
  Pagination,
  QueryFilters
} from '../types';
import { calculateOffset } from '../utils';
import { logger } from '../config/logger';

export class CaseService {
  // Get case by ID with events
  async getCaseById(caseId: string): Promise<Case & { events: CaseEvent[] }> {
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        events: {
          orderBy: { eventDate: 'desc' },
        },
      },
    });

    if (!caseRecord) {
      throw new NotFoundError('Case not found');
    }

    return caseRecord;
  }

  // Get case by case number
  async getCaseByCaseNumber(caseNumber: string): Promise<Case & { events: CaseEvent[] }> {
    const caseRecord = await prisma.case.findUnique({
      where: { caseNumber },
      include: {
        events: {
          orderBy: { eventDate: 'desc' },
        },
      },
    });

    if (!caseRecord) {
      throw new NotFoundError('Case not found');
    }

    return caseRecord;
  }

  // Follow a case
  async followCase(userId: string, data: CaseFollowRequest): Promise<CaseFollow> {
    const { caseId } = data;

    // Check if case exists
    const caseExists = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseExists) {
      throw new NotFoundError('Case not found');
    }

    // Check if already following
    const existingFollow = await prisma.caseFollow.findUnique({
      where: {
        userId_caseId: {
          userId,
          caseId,
        },
      },
    });

    if (existingFollow) {
      throw new ConflictError('Already following this case');
    }

    // Create follow relationship
    const follow = await prisma.caseFollow.create({
      data: {
        userId,
        caseId,
      },
    });

    logger.info(`User ${userId} started following case ${caseId}`);
    return follow;
  }

  // Unfollow a case
  async unfollowCase(userId: string, caseId: string): Promise<void> {
    const follow = await prisma.caseFollow.findUnique({
      where: {
        userId_caseId: {
          userId,
          caseId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundError('Not following this case');
    }

    await prisma.caseFollow.delete({
      where: { id: follow.id },
    });

    logger.info(`User ${userId} unfollowed case ${caseId}`);
  }

  // Get user's followed cases
  async getUserFollowedCases(
    userId: string,
    pagination: Pagination
  ): Promise<{ cases: (Case & { events: CaseEvent[] })[]; total: number }> {
    const { page = 1, limit = 10, sortBy = 'updatedAt', sortOrder = 'desc' } = pagination;
    const offset = calculateOffset(page, limit);

    const [follows, total] = await Promise.all([
      prisma.caseFollow.findMany({
        where: { userId },
        include: {
          case: {
            include: {
              events: {
                orderBy: { eventDate: 'desc' },
                take: 3, // Get latest 3 events for preview
              },
            },
          },
        },
        orderBy: {
          case: { [sortBy]: sortOrder },
        },
        skip: offset,
        take: limit,
      }),
      prisma.caseFollow.count({
        where: { userId },
      }),
    ]);

    const cases = follows.map(follow => follow.case);
    return { cases, total };
  }

  // Get case events timeline
  async getCaseEvents(
    caseId: string,
    pagination: Pagination
  ): Promise<{ events: CaseEvent[]; total: number }> {
    const { page = 1, limit = 20, sortOrder = 'desc' } = pagination;
    const offset = calculateOffset(page, limit);

    // Verify case exists
    const caseExists = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseExists) {
      throw new NotFoundError('Case not found');
    }

    const [events, total] = await Promise.all([
      prisma.caseEvent.findMany({
        where: { caseId },
        orderBy: { eventDate: sortOrder },
        skip: offset,
        take: limit,
      }),
      prisma.caseEvent.count({
        where: { caseId },
      }),
    ]);

    return { events, total };
  }

  // Search cases (mock implementation - would integrate with external API)
  async searchCases(
    query: string,
    filters: QueryFilters = {},
    pagination: Pagination
  ): Promise<{ cases: Case[]; total: number }> {
    const { page = 1, limit = 10, sortBy = 'updatedAt', sortOrder = 'desc' } = pagination;
    const offset = calculateOffset(page, limit);

    // Build where clause
    const where: any = {
      AND: [
        // Text search
        query ? {
          OR: [
            { caseNumber: { contains: query, mode: 'insensitive' } },
            { title: { contains: query, mode: 'insensitive' } },
            { court: { contains: query, mode: 'insensitive' } },
            { judge: { contains: query, mode: 'insensitive' } },
          ],
        } : {},
        // Filters
        filters.status ? { status: filters.status } : {},
        filters.court ? { court: { contains: filters.court, mode: 'insensitive' } } : {},
        filters.fromDate ? { filingDate: { gte: new Date(filters.fromDate) } } : {},
        filters.toDate ? { filingDate: { lte: new Date(filters.toDate) } } : {},
      ].filter(condition => Object.keys(condition).length > 0),
    };

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit,
      }),
      prisma.case.count({ where }),
    ]);

    return { cases, total };
  }

  // Create case (admin function - for testing/seeding)
  async createCase(data: CaseCreateRequest): Promise<Case> {
    const existingCase = await prisma.case.findUnique({
      where: { caseNumber: data.caseNumber },
    });

    if (existingCase) {
      throw new ConflictError('Case with this number already exists');
    }

    const caseRecord = await prisma.case.create({
      data: {
        caseNumber: data.caseNumber,
        title: data.title,
        description: data.description,
        court: data.court,
        judge: data.judge,
        filingDate: new Date(data.filingDate),
        nextHearing: data.nextHearing ? new Date(data.nextHearing) : undefined,
      },
    });

    logger.info(`Created new case: ${caseRecord.caseNumber}`);
    return caseRecord;
  }

  // Add case event (admin function)
  async addCaseEvent(
    caseId: string,
    eventData: {
      title: string;
      description: string;
      eventDate: string;
      eventType: EventType;
    }
  ): Promise<CaseEvent> {
    // Verify case exists
    const caseExists = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseExists) {
      throw new NotFoundError('Case not found');
    }

    const event = await prisma.caseEvent.create({
      data: {
        caseId,
        title: eventData.title,
        description: eventData.description,
        eventDate: new Date(eventData.eventDate),
        eventType: eventData.eventType,
      },
    });

    // Update case's last updated timestamp
    await prisma.case.update({
      where: { id: caseId },
      data: { updatedAt: new Date() },
    });

    logger.info(`Added event ${event.id} to case ${caseId}`);
    return event;
  }

  // Sync case data from external API (background job function)
  async syncCaseFromExternalAPI(caseNumber: string): Promise<Case | null> {
    try {
      // Mock external API call
      // In real implementation, this would call the actual legal database API
      logger.info(`Syncing case data for ${caseNumber} from external API`);
      
      // Simulate API response
      const externalData = {
        caseNumber,
        title: `Legal Case ${caseNumber}`,
        court: 'District Court',
        status: 'ONGOING',
        nextHearing: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      };

      // Update or create case
      const caseRecord = await prisma.case.upsert({
        where: { caseNumber },
        update: {
          title: externalData.title,
          court: externalData.court,
          nextHearing: externalData.nextHearing,
          updatedAt: new Date(),
        },
        create: {
          caseNumber: externalData.caseNumber,
          title: externalData.title,
          court: externalData.court,
          filingDate: new Date(), // Default to today if not provided
          nextHearing: externalData.nextHearing,
        },
      });

      return caseRecord;
    } catch (error) {
      logger.error(`Failed to sync case ${caseNumber}:`, error);
      return null;
    }
  }
}

export const caseService = new CaseService();