import { Job } from 'bullmq';
import { logger, jobLogger } from '../config/logger';
import { NotificationJobData } from '../types';
import { config } from '../config';

export const processNotification = async (job: Job<NotificationJobData>) => {
  const startTime = Date.now();
  const { userId, type, template, data } = job.data;

  jobLogger.started('Notification', job.id!, job.data);

  try {
    if (type === 'email') {
      await sendEmailNotification(userId, template, data);
    } else if (type === 'sms') {
      await sendSMSNotification(userId, template, data);
    } else {
      throw new Error(`Unsupported notification type: ${type}`);
    }

    const duration = Date.now() - startTime;
    jobLogger.completed('Notification', job.id!, duration, { userId, type, template });

    return { success: true, type, template };

  } catch (error) {
    const duration = Date.now() - startTime;
    jobLogger.failed('Notification', job.id!, error as Error, duration);
    throw error;
  }
};

// Email notification function
async function sendEmailNotification(
  userId: string,
  template: string,
  data: Record<string, any>
): Promise<void> {
  try {
    // In a real implementation, this would use a service like SendGrid, AWS SES, or Nodemailer
    const emailContent = generateEmailContent(template, data);
    
    logger.info(`Sending email notification`, {
      userId,
      template,
      subject: emailContent.subject,
    });

    // Mock email sending
    await simulateEmailSend(emailContent);

    logger.info(`Email notification sent successfully`, {
      userId,
      template,
    });

  } catch (error) {
    logger.error(`Failed to send email notification`, {
      userId,
      template,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

// SMS notification function
async function sendSMSNotification(
  userId: string,
  template: string,
  data: Record<string, any>
): Promise<void> {
  try {
    // In a real implementation, this would use Twilio or similar SMS service
    const smsContent = generateSMSContent(template, data);
    
    logger.info(`Sending SMS notification`, {
      userId,
      template,
      message: smsContent.message.substring(0, 50) + '...',
    });

    // Mock SMS sending
    await simulateSMSSend(smsContent);

    logger.info(`SMS notification sent successfully`, {
      userId,
      template,
    });

  } catch (error) {
    logger.error(`Failed to send SMS notification`, {
      userId,
      template,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

// Email content generation
function generateEmailContent(template: string, data: Record<string, any>): {
  subject: string;
  html: string;
  text: string;
} {
  switch (template) {
    case 'sos-status-update':
      return {
        subject: `SOS Incident Update - ${data.status}`,
        html: `
          <h2>SOS Incident Status Update</h2>
          <p>Dear ${data.userName},</p>
          <p>Your SOS incident has been updated:</p>
          <ul>
            <li><strong>Incident ID:</strong> ${data.incidentId}</li>
            <li><strong>Status:</strong> ${data.status}</li>
            <li><strong>Updated:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <p>If you need immediate assistance, please contact emergency services directly.</p>
          <p>Best regards,<br>NyayaMitra Team</p>
        `,
        text: `SOS Incident Update - ${data.status}\n\nDear ${data.userName},\n\nYour SOS incident ${data.incidentId} has been updated to status: ${data.status}\n\nUpdated: ${new Date().toLocaleString()}\n\nIf you need immediate assistance, please contact emergency services directly.\n\nBest regards,\nNyayaMitra Team`,
      };

    case 'report-status-update':
      return {
        subject: `Corruption Report Update - ${data.status}`,
        html: `
          <h2>Corruption Report Status Update</h2>
          <p>Dear ${data.userName},</p>
          <p>Your corruption report has been updated:</p>
          <ul>
            <li><strong>Report:</strong> ${data.title}</li>
            <li><strong>Status:</strong> ${data.status}</li>
            <li><strong>Updated:</strong> ${new Date().toLocaleString()}</li>
            ${data.resolution ? `<li><strong>Resolution:</strong> ${data.resolution}</li>` : ''}
          </ul>
          <p>Thank you for your contribution to fighting corruption.</p>
          <p>Best regards,<br>NyayaMitra Team</p>
        `,
        text: `Corruption Report Update - ${data.status}\n\nDear ${data.userName},\n\nYour corruption report "${data.title}" has been updated to status: ${data.status}\n\n${data.resolution ? `Resolution: ${data.resolution}\n` : ''}Updated: ${new Date().toLocaleString()}\n\nThank you for your contribution to fighting corruption.\n\nBest regards,\nNyayaMitra Team`,
      };

    case 'case-update':
      return {
        subject: `Case Update - ${data.caseNumber}`,
        html: `
          <h2>Case Update Notification</h2>
          <p>Dear ${data.userName},</p>
          <p>A case you are following has been updated:</p>
          <ul>
            <li><strong>Case:</strong> ${data.caseNumber} - ${data.title}</li>
            <li><strong>Update:</strong> ${data.eventTitle}</li>
            <li><strong>Date:</strong> ${new Date(data.eventDate).toLocaleDateString()}</li>
          </ul>
          <p>You can view the full details in your NyayaMitra dashboard.</p>
          <p>Best regards,<br>NyayaMitra Team</p>
        `,
        text: `Case Update - ${data.caseNumber}\n\nDear ${data.userName},\n\nA case you are following has been updated:\n\nCase: ${data.caseNumber} - ${data.title}\nUpdate: ${data.eventTitle}\nDate: ${new Date(data.eventDate).toLocaleDateString()}\n\nYou can view the full details in your NyayaMitra dashboard.\n\nBest regards,\nNyayaMitra Team`,
      };

    default:
      return {
        subject: 'NyayaMitra Notification',
        html: `<p>You have a new notification from NyayaMitra.</p>`,
        text: 'You have a new notification from NyayaMitra.',
      };
  }
}

// SMS content generation
function generateSMSContent(template: string, data: Record<string, any>): {
  message: string;
} {
  switch (template) {
    case 'sos-status-update':
      return {
        message: `NyayaMitra: Your SOS incident ${data.incidentId} status updated to ${data.status}. Updated: ${new Date().toLocaleString()}`,
      };

    case 'report-status-update':
      return {
        message: `NyayaMitra: Your corruption report status updated to ${data.status}. ${data.resolution ? `Resolution: ${data.resolution}` : ''}`,
      };

    case 'case-update':
      return {
        message: `NyayaMitra: Case ${data.caseNumber} updated - ${data.eventTitle}. Date: ${new Date(data.eventDate).toLocaleDateString()}`,
      };

    default:
      return {
        message: 'You have a new notification from NyayaMitra.',
      };
  }
}

// Mock email sending
async function simulateEmailSend(content: { subject: string; html: string; text: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate 98% success rate
      if (Math.random() < 0.98) {
        resolve();
      } else {
        reject(new Error('Email delivery failed'));
      }
    }, Math.random() * 1000 + 500); // 500-1500ms delay
  });
}

// Mock SMS sending
async function simulateSMSSend(content: { message: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate 95% success rate
      if (Math.random() < 0.95) {
        resolve();
      } else {
        reject(new Error('SMS delivery failed'));
      }
    }, Math.random() * 2000 + 1000); // 1000-3000ms delay
  });
}