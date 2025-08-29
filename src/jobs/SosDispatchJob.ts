import { Job } from 'bullmq';
import { prisma } from '../config/database';
import { logger, jobLogger } from '../config/logger';
import { SosDispatchJobData } from '../types';

export const processSosDispatch = async (job: Job<SosDispatchJobData>) => {
  const startTime = Date.now();
  const { incidentId, location, description, priority, userContact } = job.data;

  jobLogger.started('SOS Dispatch', job.id!, job.data);

  try {
    // Simulate dispatching to emergency services
    // In real implementation, this would:
    // 1. Call police station APIs
    // 2. Send SMS to emergency contacts
    // 3. Integrate with emergency response systems
    
    logger.info(`Dispatching SOS incident ${incidentId} to emergency services`, {
      location,
      priority,
      contact: userContact,
    });

    // Mock dispatch to multiple services based on priority
    const services = [];
    
    if (priority === 'CRITICAL' || priority === 'HIGH') {
      services.push('Police', 'Medical', 'Fire Department');
    } else if (priority === 'MEDIUM') {
      services.push('Police');
    } else {
      services.push('Local Security');
    }

    // Simulate API calls to emergency services
    for (const service of services) {
      await simulateEmergencyServiceCall(service, {
        incidentId,
        location,
        description,
        priority,
        contact: userContact,
      });
    }

    // Update incident status to acknowledged
    await prisma.sosIncident.update({
      where: { id: incidentId },
      data: { 
        status: 'ACKNOWLEDGED',
        updatedAt: new Date(),
      },
    });

    const duration = Date.now() - startTime;
    jobLogger.completed('SOS Dispatch', job.id!, duration, { servicesNotified: services });

    return { success: true, servicesNotified: services };

  } catch (error) {
    const duration = Date.now() - startTime;
    jobLogger.failed('SOS Dispatch', job.id!, error as Error, duration);
    
    // Update incident status to indicate dispatch failure
    await prisma.sosIncident.update({
      where: { id: incidentId },
      data: { 
        status: 'PENDING', // Keep as pending for retry
        updatedAt: new Date(),
      },
    });

    throw error;
  }
};

// Mock function to simulate emergency service API calls
async function simulateEmergencyServiceCall(
  service: string,
  data: {
    incidentId: string;
    location: any;
    description: string;
    priority: string;
    contact: any;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Simulate network delay
    setTimeout(() => {
      // Simulate 95% success rate
      if (Math.random() < 0.95) {
        logger.info(`Successfully notified ${service}`, {
          incidentId: data.incidentId,
          service,
        });
        resolve();
      } else {
        reject(new Error(`Failed to notify ${service}`));
      }
    }, Math.random() * 2000 + 500); // 500-2500ms delay
  });
}