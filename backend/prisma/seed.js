const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create admin user (your account) - only user that remains
    const adminUser = await prisma.user.upsert({
      where: { email: 'hiphoorykiko@gmail.com' },
      update: {
        isActive: true,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        isEmailVerified: true,
        lastLoginAt: new Date(),
      },
      create: {
        email: 'hiphoorykiko@gmail.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        googleId: 'seed_google_id_admin', // Temporary, will be replaced on first login
        isEmailVerified: true,
        isActive: true,
        lastLoginAt: new Date(),
      },
    });

    console.log('✅ Admin user created/updated:', adminUser.email);

    // Create sample judge and moderator users
    const judgesData = [
      {
        email: 'judge1@university.edu',
        firstName: 'Emily',
        lastName: 'Chen',
        role: 'judge',
        googleId: 'seed_google_id_judge1',
      },
      {
        email: 'judge2@college.edu',
        firstName: 'Michael',
        lastName: 'Rodriguez',
        role: 'judge',
        googleId: 'seed_google_id_judge2',
      },
      {
        email: 'judge3@institute.edu',
        firstName: 'Sarah',
        lastName: 'Thompson',
        role: 'judge',
        googleId: 'seed_google_id_judge3',
      },
      {
        email: 'judge4@academy.edu',
        firstName: 'David',
        lastName: 'Kim',
        role: 'judge',
        googleId: 'seed_google_id_judge4',
      },
      {
        email: 'judge5@school.edu',
        firstName: 'Jennifer',
        lastName: 'Davis',
        role: 'judge',
        googleId: 'seed_google_id_judge5',
      },
      {
        email: 'judge6@ethics.edu',
        firstName: 'Robert',
        lastName: 'Wilson',
        role: 'judge',
        googleId: 'seed_google_id_judge6',
      },
      {
        email: 'judge7@philosophy.edu',
        firstName: 'Lisa',
        lastName: 'Anderson',
        role: 'judge',
        googleId: 'seed_google_id_judge7',
      },
      {
        email: 'judge8@moral.edu',
        firstName: 'James',
        lastName: 'Miller',
        role: 'judge',
        googleId: 'seed_google_id_judge8',
      }
    ];

    const moderatorsData = [
      {
        email: 'moderator1@university.edu',
        firstName: 'Professor',
        lastName: 'Martinez',
        role: 'moderator',
        googleId: 'seed_google_id_mod1',
      },
      {
        email: 'moderator2@college.edu',
        firstName: 'Dr. Angela',
        lastName: 'Foster',
        role: 'moderator',
        googleId: 'seed_google_id_mod2',
      },
      {
        email: 'moderator3@institute.edu',
        firstName: 'Prof. Kevin',
        lastName: 'Chang',
        role: 'moderator',
        googleId: 'seed_google_id_mod3',
      },
      {
        email: 'moderator4@academy.edu',
        firstName: 'Dr. Nicole',
        lastName: 'Johnson',
        role: 'moderator',
        googleId: 'seed_google_id_mod4',
      },
      {
        email: 'moderator5@school.edu',
        firstName: 'Prof. Mark',
        lastName: 'Taylor',
        role: 'moderator',
        googleId: 'seed_google_id_mod5',
      }
    ];

    // Create judges
    const createdJudges = [];
    for (const judgeData of judgesData) {
      const judge = await prisma.user.upsert({
        where: { email: judgeData.email },
        update: {
          isActive: true,
          role: judgeData.role,
          firstName: judgeData.firstName,
          lastName: judgeData.lastName,
          isEmailVerified: true,
          lastLoginAt: new Date(),
        },
        create: {
          email: judgeData.email,
          firstName: judgeData.firstName,
          lastName: judgeData.lastName,
          role: judgeData.role,
          googleId: judgeData.googleId,
          isEmailVerified: true,
          isActive: true,
          lastLoginAt: new Date(),
        },
      });
      createdJudges.push(judge);
      console.log(`✅ Judge created/updated: ${judge.firstName} ${judge.lastName} (${judge.email})`);
    }

    // Create moderators
    const createdModerators = [];
    for (const moderatorData of moderatorsData) {
      const moderator = await prisma.user.upsert({
        where: { email: moderatorData.email },
        update: {
          isActive: true,
          role: moderatorData.role,
          firstName: moderatorData.firstName,
          lastName: moderatorData.lastName,
          isEmailVerified: true,
          lastLoginAt: new Date(),
        },
        create: {
          email: moderatorData.email,
          firstName: moderatorData.firstName,
          lastName: moderatorData.lastName,
          role: moderatorData.role,
          googleId: moderatorData.googleId,
          isEmailVerified: true,
          isActive: true,
          lastLoginAt: new Date(),
        },
      });
      createdModerators.push(moderator);
      console.log(`✅ Moderator created/updated: ${moderator.firstName} ${moderator.lastName} (${moderator.email})`);
    }

    // Create multiple sample events with different statuses
    const eventScoringCriteria = JSON.stringify({
      presentationMaxScore: 100,
      commentaryMaxScore: 100,
      criteria: {
        clarity: { weight: 0.3, description: 'Clarity of argument and presentation' },
        analysis: { weight: 0.4, description: 'Depth of ethical analysis' },
        engagement: { weight: 0.3, description: 'Engagement with opposing arguments' }
      }
    });

    const eventsData = [
      {
        id: 'event-draft-2024',
        name: 'Regional Ethics Bowl 2024',
        description: 'Annual regional ethics bowl competition - still in preparation',
        totalRounds: 4,
        currentRound: 1,
        status: 'draft',
        eventDate: new Date('2024-03-15'),
        startDate: new Date('2024-03-15'),
        endDate: new Date('2024-03-16'),
        location: 'University Convention Center',
        maxTeams: 32,
        scoringCriteria: eventScoringCriteria,
      },
      {
        id: 'event-active-spring',
        name: 'Spring Ethics Challenge 2024',
        description: 'Active spring semester ethics competition',
        totalRounds: 3,
        currentRound: 2,
        status: 'active',
        eventDate: new Date('2024-01-20'),
        startDate: new Date('2024-01-20'),
        endDate: new Date('2024-01-21'),
        location: 'College Auditorium',
        maxTeams: 16,
        scoringCriteria: eventScoringCriteria,
      },
      {
        id: 'event-completed-fall',
        name: 'Fall Ethics Tournament 2023',
        description: 'Completed fall semester tournament',
        totalRounds: 5,
        currentRound: 5,
        status: 'completed',
        eventDate: new Date('2023-11-10'),
        startDate: new Date('2023-11-10'),
        endDate: new Date('2023-11-12'),
        location: 'High School Gymnasium',
        maxTeams: 24,
        scoringCriteria: eventScoringCriteria,
      },
      {
        id: 'event-national-prep',
        name: 'National Championship Prep',
        description: 'Preparation event for national championship',
        totalRounds: 6,
        currentRound: 1,
        status: 'draft',
        eventDate: new Date('2024-04-01'),
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-04-03'),
        location: 'National Conference Center',
        maxTeams: 48,
        scoringCriteria: JSON.stringify({
          presentationMaxScore: 120,
          commentaryMaxScore: 120,
          criteria: {
            argumentation: { weight: 0.35, description: 'Quality of ethical argumentation' },
            reasoning: { weight: 0.35, description: 'Logical reasoning and consistency' },
            response: { weight: 0.3, description: 'Response to questions and challenges' }
          }
        }),
      },
      {
        id: 'event-mini-tournament',
        name: 'Mini Ethics Tournament',
        description: 'Small-scale tournament for new participants',
        totalRounds: 2,
        currentRound: 1,
        status: 'active',
        eventDate: new Date('2024-02-05'),
        startDate: new Date('2024-02-05'),
        endDate: new Date('2024-02-05'),
        location: 'Community Center',
        maxTeams: 8,
        scoringCriteria: JSON.stringify({
          presentationMaxScore: 80,
          commentaryMaxScore: 80,
          simplified: true
        }),
      },
      {
        id: 'event-test-deletable',
        name: 'Test Event (Deletable)',
        description: 'This is a test event that can be safely deleted - no teams or matches',
        totalRounds: 3,
        currentRound: 1,
        status: 'draft',
        eventDate: new Date('2024-12-01'),
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-02'),
        location: 'Test Venue',
        maxTeams: 16,
        scoringCriteria: eventScoringCriteria,
      }
    ];

    const createdEvents = [];
    for (const eventData of eventsData) {
      const event = await prisma.event.upsert({
        where: { id: eventData.id },
        update: {
          ...eventData,
          createdBy: adminUser.id,
        },
        create: {
          ...eventData,
          createdBy: adminUser.id,
        },
      });
      createdEvents.push(event);
      console.log(`✅ Event created/updated: ${event.name} (${event.status})`);
    }

    // Create sample teams for different events
    const teamsData = [
      // Teams for Regional Ethics Bowl 2024 (draft)
      {
        name: 'Team Alpha',
        school: 'University of Excellence',
        coachName: 'Dr. Alice Brown',
        coachEmail: 'alice.brown@uoe.edu',
        eventId: createdEvents[0].id, // Regional Ethics Bowl 2024
      },
      {
        name: 'Team Beta',
        school: 'College of Innovation',
        coachName: 'Prof. Bob Davis',
        coachEmail: 'bob.davis@coi.edu',
        eventId: createdEvents[0].id,
      },
      {
        name: 'Team Gamma',
        school: 'Institute of Ethics',
        coachName: 'Dr. Carol White',
        coachEmail: 'carol.white@ioe.edu',
        eventId: createdEvents[0].id,
      },
      {
        name: 'Team Delta',
        school: 'Academy of Philosophy',
        coachName: 'Prof. David Green',
        coachEmail: 'david.green@aop.edu',
        eventId: createdEvents[0].id,
      },
      // Teams for Spring Ethics Challenge 2024 (active)
      {
        name: 'Spring Warriors',
        school: 'State University',
        coachName: 'Dr. Emma Wilson',
        coachEmail: 'emma.wilson@su.edu',
        eventId: createdEvents[1].id, // Spring Ethics Challenge 2024
      },
      {
        name: 'Ethics Pioneers',
        school: 'Community College',
        coachName: 'Prof. James Taylor',
        coachEmail: 'james.taylor@cc.edu',
        eventId: createdEvents[1].id,
      },
      {
        name: 'Moral Compass',
        school: 'Technical Institute',
        coachName: 'Dr. Lisa Chen',
        coachEmail: 'lisa.chen@ti.edu',
        eventId: createdEvents[1].id,
      },
      // Teams for completed Fall Tournament 2023
      {
        name: 'Fall Champions',
        school: 'Metropolitan University',
        coachName: 'Prof. Robert Martinez',
        coachEmail: 'robert.martinez@mu.edu',
        eventId: createdEvents[2].id, // Fall Ethics Tournament 2023
      },
      {
        name: 'Autumn Scholars',
        school: 'Liberal Arts College',
        coachName: 'Dr. Sarah Johnson',
        coachEmail: 'sarah.johnson@lac.edu',
        eventId: createdEvents[2].id,
      },
      // Teams for Mini Tournament (active)
      {
        name: 'Rookie Squad',
        school: 'High School Academy',
        coachName: 'Ms. Jennifer Adams',
        coachEmail: 'jennifer.adams@hsa.edu',
        eventId: createdEvents[4].id, // Mini Ethics Tournament
      },
      {
        name: 'New Debaters',
        school: 'Prep School',
        coachName: 'Mr. Michael Brown',
        coachEmail: 'michael.brown@prep.edu',
        eventId: createdEvents[4].id,
      },
    ];

    const createdTeams = [];
    for (const teamData of teamsData) {
      const team = await prisma.team.upsert({
        where: { 
          id: `team-${teamData.name.toLowerCase().replace(/\s+/g, '-')}`
        },
        update: teamData,
        create: {
          id: `team-${teamData.name.toLowerCase().replace(/\s+/g, '-')}`,
          ...teamData,
        },
      });
      createdTeams.push(team);
      console.log(`✅ Team created/updated: ${team.name} (${team.school})`);
    }

    // Create sample pre-approved emails
    const preApprovedEmailsData = [
      {
        email: 'newjudge@university.edu',
        role: 'judge',
        notes: 'Pre-approved ethics professor from University',
      },
      {
        email: 'moderator@college.edu',
        role: 'moderator',
        notes: 'Experienced debate moderator',
      },
      {
        email: 'admin@school.edu',
        role: 'admin',
        notes: 'School administrator with ethics background',
      },
      {
        email: 'teacher1@highschool.edu',
        role: 'judge',
        notes: 'High school ethics teacher',
      },
      {
        email: 'professor@institute.edu',
        role: 'judge',
        notes: 'Philosophy professor specializing in ethics',
      },
    ];

    for (const preApprovedData of preApprovedEmailsData) {
      const preApprovedEmail = await prisma.preApprovedEmail.upsert({
        where: { email: preApprovedData.email },
        update: {
          role: preApprovedData.role,
          notes: preApprovedData.notes,
        },
        create: {
          email: preApprovedData.email,
          role: preApprovedData.role,
          notes: preApprovedData.notes,
          createdBy: adminUser.id,
        },
      });
      console.log(`✅ Pre-approved email created/updated: ${preApprovedEmail.email} (${preApprovedEmail.role})`);
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`👤 Admin user: ${adminUser.email} (isActive: ${adminUser.isActive})`);
    console.log(`👨‍⚖️ Judges created: ${createdJudges.length}`);
    console.log(`🎯 Moderators created: ${createdModerators.length}`);
    console.log(`📅 Events created: ${createdEvents.length}`);
    console.log(`   - Draft events: ${createdEvents.filter(e => e.status === 'draft').length}`);
    console.log(`   - Active events: ${createdEvents.filter(e => e.status === 'active').length}`);
    console.log(`   - Completed events: ${createdEvents.filter(e => e.status === 'completed').length}`);
    console.log(`🏆 Teams created: ${createdTeams.length}`);
    console.log(`📧 Pre-approved emails created: ${preApprovedEmailsData.length}`);
    console.log('\n👥 Total active users:');
    console.log(`   - 1 Admin: ${adminUser.firstName} ${adminUser.lastName}`);
    console.log(`   - ${createdJudges.length} Judges: ${createdJudges.map(j => j.firstName + ' ' + j.lastName).join(', ')}`);
    console.log(`   - ${createdModerators.length} Moderators: ${createdModerators.map(m => m.firstName + ' ' + m.lastName).join(', ')}`);
    console.log('\n🚀 You can now log in with your Google account and test the system!');
    console.log('📝 New users with pre-approved emails will be automatically activated upon first login.');
    console.log('🎮 All active users are ready for assignment to matches and events!');
    console.log('\n💡 Test Features:');
    console.log('   - Create matches with multiple judges (2-3 required)');
    console.log('   - Assign moderators to matches');
    console.log('   - Delete scheduled matches');
    console.log('   - All users are immediately available for selection!');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 