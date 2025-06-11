const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create admin user (your account)
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

    // Create some demo users for testing
    const demoUsers = [
      {
        email: 'judge1@example.com',
        firstName: 'John',
        lastName: 'Smith',
        role: 'judge',
        googleId: 'seed_google_id_judge1',
        isActive: true,
      },
      {
        email: 'judge2@example.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'judge',
        googleId: 'seed_google_id_judge2',
        isActive: true,
      },
      {
        email: 'moderator1@example.com',
        firstName: 'Mike',
        lastName: 'Wilson',
        role: 'moderator',
        googleId: 'seed_google_id_moderator1',
        isActive: true,
      },
      {
        email: 'pending@example.com',
        firstName: 'Pending',
        lastName: 'User',
        role: 'judge',
        googleId: 'seed_google_id_pending',
        isActive: false, // This user needs approval
      },
      // Additional judge users
      {
        email: 'nnnnnjun.yang@gmail.com',
        firstName: 'Jun',
        lastName: 'Yang',
        role: 'judge',
        googleId: 'seed_google_id_jun_yang',
        isActive: true,
      },
      {
        email: 'ethicsbowla@gmail.com',
        firstName: 'Ethics',
        lastName: 'Bowl',
        role: 'judge',
        googleId: 'seed_google_id_ethicsbowla',
        isActive: true,
      },
    ];

    for (const userData of demoUsers) {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          isActive: userData.isActive,
          role: userData.role,
          firstName: userData.firstName,
          lastName: userData.lastName,
        },
        create: {
          ...userData,
          isEmailVerified: true,
        },
      });
      console.log(`✅ Demo user created/updated: ${user.email} (${user.role})`);
    }

    // Create a sample event
    const sampleEvent = await prisma.event.upsert({
      where: { id: 'sample-event-id' },
      update: {
        name: 'Sample Ethics Bowl 2024',
        description: 'A sample ethics bowl competition for testing',
        totalRounds: 3,
        currentRound: 1,
        status: 'draft',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-03'),
        createdBy: adminUser.id,
      },
      create: {
        id: 'sample-event-id',
        name: 'Sample Ethics Bowl 2024',
        description: 'A sample ethics bowl competition for testing',
        totalRounds: 3,
        currentRound: 1,
        status: 'draft',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-03'),
        scoringCriteria: JSON.stringify({
          presentation: { min: 0, max: 100 },
          commentary: { min: 0, max: 100 }
        }),
        createdBy: adminUser.id,
      },
    });

    console.log('✅ Sample event created/updated:', sampleEvent.name);

    // Create sample teams
    const teams = [
      {
        name: 'Team Alpha',
        school: 'University of Excellence',
        coachName: 'Dr. Alice Brown',
        coachEmail: 'alice.brown@uoe.edu',
        eventId: sampleEvent.id,
      },
      {
        name: 'Team Beta',
        school: 'College of Innovation',
        coachName: 'Prof. Bob Davis',
        coachEmail: 'bob.davis@coi.edu',
        eventId: sampleEvent.id,
      },
      {
        name: 'Team Gamma',
        school: 'Institute of Ethics',
        coachName: 'Dr. Carol White',
        coachEmail: 'carol.white@ioe.edu',
        eventId: sampleEvent.id,
      },
      {
        name: 'Team Delta',
        school: 'Academy of Philosophy',
        coachName: 'Prof. David Green',
        coachEmail: 'david.green@aop.edu',
        eventId: sampleEvent.id,
      },
    ];

    for (const teamData of teams) {
      const team = await prisma.team.upsert({
        where: { 
          id: `team-${teamData.name.toLowerCase().replace(' ', '-')}`
        },
        update: teamData,
        create: {
          id: `team-${teamData.name.toLowerCase().replace(' ', '-')}`,
          ...teamData,
        },
      });
      console.log(`✅ Team created/updated: ${team.name}`);
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`👤 Admin user: ${adminUser.email} (isActive: ${adminUser.isActive})`);
    console.log(`📅 Sample event: ${sampleEvent.name}`);
    console.log(`🏆 Teams created: ${teams.length}`);
    console.log(`👥 Demo users created: ${demoUsers.length}`);
    console.log('\n🚀 You can now log in with your Google account!');

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