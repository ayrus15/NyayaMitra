import { PrismaClient, UserRole, CaseStatus, EventType, SosStatus, ReportStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create users with different roles
  const hashedPassword = await bcrypt.hash('password123', 12);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@nyayamitra.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: UserRole.ADMIN,
      phone: '+911234567890',
    },
  });

  const moderatorUser = await prisma.user.create({
    data: {
      email: 'moderator@nyayamitra.com',
      password: hashedPassword,
      firstName: 'Report',
      lastName: 'Moderator',
      role: UserRole.MODERATOR,
      phone: '+911234567891',
    },
  });

  const advocateUser = await prisma.user.create({
    data: {
      email: 'advocate@nyayamitra.com',
      password: hashedPassword,
      firstName: 'Legal',
      lastName: 'Advocate',
      role: UserRole.ADVOCATE,
      phone: '+911234567892',
    },
  });

  const citizenUser1 = await prisma.user.create({
    data: {
      email: 'citizen1@example.com',
      password: hashedPassword,
      firstName: 'Rahul',
      lastName: 'Sharma',
      role: UserRole.CITIZEN,
      phone: '+911234567893',
    },
  });

  const citizenUser2 = await prisma.user.create({
    data: {
      email: 'citizen2@example.com',
      password: hashedPassword,
      firstName: 'Priya',
      lastName: 'Singh',
      role: UserRole.CITIZEN,
      phone: '+911234567894',
    },
  });

  console.log('Created users');

  // Create sample cases
  const case1 = await prisma.case.create({
    data: {
      caseNumber: 'CRL/2024/001',
      title: 'State vs. Corruption in Municipal Corporation',
      description: 'Case regarding corruption in tender allocation for city infrastructure projects.',
      court: 'Delhi High Court',
      judge: 'Justice A.K. Sharma',
      status: CaseStatus.ONGOING,
      filingDate: new Date('2024-01-15'),
      nextHearing: new Date('2024-12-15'),
    },
  });

  const case2 = await prisma.case.create({
    data: {
      caseNumber: 'CIV/2024/102',
      title: 'Property Dispute - Sector 62 Noida',
      description: 'Civil dispute regarding property ownership and documentation in Noida.',
      court: 'District Court Gautam Budh Nagar',
      judge: 'Justice B.K. Verma',
      status: CaseStatus.PENDING,
      filingDate: new Date('2024-02-20'),
      nextHearing: new Date('2024-12-20'),
    },
  });

  const case3 = await prisma.case.create({
    data: {
      caseNumber: 'CRL/2024/203',
      title: 'Police Brutality Case - Connaught Place',
      description: 'Criminal case filed against police officials for excessive use of force.',
      court: 'Sessions Court Delhi',
      judge: 'Justice C.D. Gupta',
      status: CaseStatus.ADJOURNED,
      filingDate: new Date('2024-03-10'),
      nextHearing: new Date('2024-12-25'),
    },
  });

  console.log('Created sample cases');

  // Create case events
  await prisma.caseEvent.createMany({
    data: [
      {
        caseId: case1.id,
        title: 'First Hearing Completed',
        description: 'Initial hearing conducted, evidence collection ordered.',
        eventDate: new Date('2024-02-15'),
        eventType: EventType.HEARING,
      },
      {
        caseId: case1.id,
        title: 'Evidence Submission',
        description: 'Prosecution submitted documentary evidence.',
        eventDate: new Date('2024-03-01'),
        eventType: EventType.ORDER,
      },
      {
        caseId: case2.id,
        title: 'Case Filed',
        description: 'Civil suit filed in district court.',
        eventDate: new Date('2024-02-20'),
        eventType: EventType.NOTICE,
      },
      {
        caseId: case3.id,
        title: 'Hearing Adjourned',
        description: 'Hearing adjourned due to non-availability of key witness.',
        eventDate: new Date('2024-04-15'),
        eventType: EventType.ADJOURNMENT,
      },
    ],
  });

  console.log('Created case events');

  // Create case follows
  await prisma.caseFollow.createMany({
    data: [
      { userId: citizenUser1.id, caseId: case1.id },
      { userId: citizenUser1.id, caseId: case3.id },
      { userId: citizenUser2.id, caseId: case2.id },
      { userId: advocateUser.id, caseId: case1.id },
      { userId: advocateUser.id, caseId: case2.id },
      { userId: advocateUser.id, caseId: case3.id },
    ],
  });

  console.log('Created case follows');

  // Create sample SOS incidents
  await prisma.sosIncident.createMany({
    data: [
      {
        userId: citizenUser1.id,
        location: {
          lat: 28.6139,
          lng: 77.2090,
          address: 'Connaught Place, New Delhi, Delhi 110001',
        },
        description: 'Witnessed a road accident, need immediate medical assistance.',
        status: SosStatus.RESOLVED,
        priority: 'HIGH',
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-10'),
      },
      {
        userId: citizenUser2.id,
        location: {
          lat: 28.7041,
          lng: 77.1025,
          address: 'Rohini Sector 18, New Delhi, Delhi 110089',
        },
        description: 'Domestic violence incident in neighboring apartment.',
        status: SosStatus.IN_PROGRESS,
        priority: 'CRITICAL',
        createdAt: new Date('2024-11-20'),
        updatedAt: new Date('2024-11-20'),
      },
    ],
  });

  console.log('Created SOS incidents');

  // Create sample corruption reports
  const report1 = await prisma.corruptionReport.create({
    data: {
      userId: citizenUser1.id,
      title: 'Bribery in License Approval Process',
      description: 'Municipal office demanding bribe for business license approval. Officer asked for Rs. 50,000 for expedited processing of a legitimate application.',
      department: 'Municipal Corporation',
      officialName: 'Mr. R.K. Gupta (License Officer)',
      location: 'Municipal Corporation Office, Civic Center',
      incidentDate: new Date('2024-11-15'),
      status: ReportStatus.INVESTIGATING,
      isAnonymous: false,
    },
  });

  const report2 = await prisma.corruptionReport.create({
    data: {
      userId: citizenUser2.id,
      title: 'Irregularities in Government Tender Process',
      description: 'Observed suspicious activities in the tender process for road construction. The same contractor wins all tenders despite higher quotes.',
      department: 'Public Works Department',
      officialName: 'Anonymous',
      location: 'PWD Office, District Center',
      incidentDate: new Date('2024-10-20'),
      status: ReportStatus.UNDER_REVIEW,
      isAnonymous: true,
      assignedTo: moderatorUser.id,
    },
  });

  console.log('Created corruption reports');

  // Create sample chat sessions
  const chatSession1 = await prisma.chatSession.create({
    data: {
      userId: citizenUser1.id,
      title: 'Property Rights Query',
      isActive: true,
    },
  });

  const chatSession2 = await prisma.chatSession.create({
    data: {
      userId: citizenUser2.id,
      title: 'Domestic Violence Legal Help',
      isActive: false,
    },
  });

  console.log('Created chat sessions');

  // Create sample chat messages
  await prisma.chatMessage.createMany({
    data: [
      {
        sessionId: chatSession1.id,
        content: 'Hello! I need help understanding property rights in India.',
        role: 'USER',
      },
      {
        sessionId: chatSession1.id,
        content: 'I can help you understand property rights in India. Property rights are fundamental rights that allow you to own, use, and dispose of property. What specific aspect would you like to know about?',
        role: 'ASSISTANT',
      },
      {
        sessionId: chatSession1.id,
        content: 'Can my landlord evict me without proper notice?',
        role: 'USER',
      },
      {
        sessionId: chatSession1.id,
        content: 'No, your landlord cannot evict you without proper notice. Under the Rent Control Act, landlords must provide written notice and follow due process. The notice period varies by state but is typically 15-30 days.',
        role: 'ASSISTANT',
      },
      {
        sessionId: chatSession2.id,
        content: 'I need help with domestic violence laws.',
        role: 'USER',
      },
      {
        sessionId: chatSession2.id,
        content: 'I understand this is a serious matter. The Protection of Women from Domestic Violence Act, 2005 provides comprehensive protection. You can file a complaint with the police or approach a magistrate directly. Would you like information about immediate help resources?',
        role: 'ASSISTANT',
      },
    ],
  });

  console.log('Created chat messages');

  console.log('Database seeding completed successfully!');
  console.log('\nSample accounts created:');
  console.log('Admin: admin@nyayamitra.com / password123');
  console.log('Moderator: moderator@nyayamitra.com / password123');
  console.log('Advocate: advocate@nyayamitra.com / password123');
  console.log('Citizen 1: citizen1@example.com / password123');
  console.log('Citizen 2: citizen2@example.com / password123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });