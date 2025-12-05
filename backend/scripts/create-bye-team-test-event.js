/**
 * Create a test event with 11 teams and 5 rounds to test bye team functionality
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🎯 Creating Bye Team Test Event\n');

  try {
    // Get an admin user
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!admin) {
      throw new Error('No admin user found. Please create an admin user first.');
    }

    console.log(`✅ Using admin: ${admin.firstName} ${admin.lastName} (${admin.email})\n`);

    // Create event
    console.log('📅 Creating event...');
    const event = await prisma.event.create({
      data: {
        name: 'Bye Team Test Tournament (11 Teams)',
        description: 'Test event with 11 teams to verify bye team functionality',
        totalRounds: 5,
        currentRound: 1,
        status: 'active',
        createdBy: admin.id,
        scoringCriteria: JSON.stringify({
          criteria: [
            { name: 'Clarity', maxScore: 10 },
            { name: 'Thoughtfulness', maxScore: 10 },
            { name: 'Focus', maxScore: 10 },
            { name: 'Avoidance of Fallacies', maxScore: 10 },
            { name: 'Responsiveness', maxScore: 10 }
          ],
          commentQuestionsCount: 3
        })
      }
    });

    console.log(`✅ Event created: ${event.name} (ID: ${event.id.substring(0, 8)}...)\n`);

    // Create 11 teams
    console.log('👥 Creating 11 teams...');
    const teamNames = [
      'Alpha Team',
      'Beta Team',
      'Gamma Team',
      'Delta Team',
      'Epsilon Team',
      'Zeta Team',
      'Eta Team',
      'Theta Team',
      'Iota Team',
      'Kappa Team',
      'Lambda Team'
    ];

    const teams = [];
    for (let i = 0; i < teamNames.length; i++) {
      const team = await prisma.team.create({
        data: {
          name: teamNames[i],
          school: `School ${String.fromCharCode(65 + i)}`, // School A, School B, etc.
          eventId: event.id,
          coachName: `Coach ${i + 1}`,
          coachEmail: `coach${i + 1}@example.com`
        }
      });
      teams.push(team);
      console.log(`  ✓ Created: ${team.name}`);
    }

    console.log(`\n✅ Created ${teams.length} teams\n`);

    // Create bye matches for each round
    // With 11 teams, we need 5 matches per round + 1 bye team
    console.log('🔄 Creating partial round-robin schedule with bye teams...\n');

    // Simple algorithm: each team gets a bye once in rounds 1-5
    // We'll rotate which team gets the bye
    for (let round = 1; round <= 5; round++) {
      console.log(`Round ${round}:`);
      
      // Determine bye team for this round (simple rotation)
      // Team index = (round - 1) % 11
      const byeTeamIndex = (round - 1) % teams.length;
      const byeTeam = teams[byeTeamIndex];
      
      console.log(`  🎯 Bye Team: ${byeTeam.name}`);

      // Create bye match
      const byeMatch = await prisma.match.create({
        data: {
          eventId: event.id,
          roundNumber: round,
          teamAId: byeTeam.id,
          teamBId: null, // null indicates bye
          status: 'completed',
          winnerId: byeTeam.id,
          room: `Bye`
        }
      });

      console.log(`     ✓ Bye match created (ID: ${byeMatch.id.substring(0, 8)}...)`);

      // Create regular matches for remaining teams
      const availableTeams = teams.filter((_, idx) => idx !== byeTeamIndex);
      
      // Create 5 matches (10 teams / 2)
      const numMatches = Math.floor(availableTeams.length / 2);
      
      for (let matchNum = 0; matchNum < numMatches; matchNum++) {
        const teamAIdx = matchNum * 2;
        const teamBIdx = matchNum * 2 + 1;
        
        if (teamAIdx < availableTeams.length && teamBIdx < availableTeams.length) {
          const teamA = availableTeams[teamAIdx];
          const teamB = availableTeams[teamBIdx];
          
          const match = await prisma.match.create({
            data: {
              eventId: event.id,
              roundNumber: round,
              teamAId: teamA.id,
              teamBId: teamB.id,
              status: 'draft',
              room: `Room ${matchNum + 1}`
            }
          });

          console.log(`     Match ${matchNum + 1}: ${teamA.name} vs ${teamB.name}`);
        }
      }
      
      console.log('');
    }

    console.log('✅ Round-robin schedule created with bye teams\n');

    // Calculate and store bye team score differentials
    console.log('📊 Initializing bye team score differentials...');
    const EventService = require('../src/services/event.service');
    const eventService = new EventService();
    await eventService.recalculateByeMatchScores(event.id);
    console.log('✅ Bye team scores initialized\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 SUCCESS! Test event created successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n📋 Event Details:`);
    console.log(`   Event ID: ${event.id}`);
    console.log(`   Event Name: ${event.name}`);
    console.log(`   Total Teams: ${teams.length} (ODD - bye teams needed)`);
    console.log(`   Total Rounds: ${event.totalRounds}`);
    console.log(`   Matches per Round: 5 regular + 1 bye`);
    console.log(`\n🔗 Access the event in the UI:`);
    console.log(`   Navigate to the event workspace and click on the "Bye Team" button`);
    console.log(`   next to each round title to view bye team information.`);
    console.log(`\n📝 Bye Team Schedule:`);
    
    for (let round = 1; round <= 5; round++) {
      const byeTeamIndex = (round - 1) % teams.length;
      const byeTeam = teams[byeTeamIndex];
      console.log(`   Round ${round}: ${byeTeam.name} (bye)`);
    }
    
    console.log(`\n💡 Next Steps:`);
    console.log(`   1. Open the event in the UI`);
    console.log(`   2. Click "Bye Team" button on any round to see bye team info`);
    console.log(`   3. Complete some matches to see score differential update`);
    console.log(`   4. Check that bye team score diff changes from +3.0 to average\n`);

  } catch (error) {
    console.error('❌ Error creating test event:', error);
    throw error;
  }
}

main()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Script failed:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });


