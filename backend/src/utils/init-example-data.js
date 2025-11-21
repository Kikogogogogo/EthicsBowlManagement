/**
 * Initialize Example Tournament Data
 * This script checks if the example "Tie-Breaking Test Tournament" exists.
 * If not, it creates it automatically on server startup.
 * This ensures all deployed instances have the example data available.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EXAMPLE_EVENT_NAME = 'Tie-Breaking Test Tournament';
const TEAM_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const TOTAL_ROUNDS = 5;

// Match definitions
const MATCHES = [
  // === ROUND 1 ===
  { round: 1, teamA: 'A', teamB: 'D', votesA: 2, votesB: 1, diffA: 15 },
  { round: 1, teamA: 'B', teamB: 'E', votesA: 2.5, votesB: 0.5, diffA: 22 },
  { round: 1, teamA: 'C', teamB: 'F', votesA: 3, votesB: 0, diffA: 18 },
  { round: 1, teamA: 'G', teamB: 'H', votesA: 1.5, votesB: 1.5, diffA: 0 }, // Tie!
  
  // === ROUND 2 ===
  { round: 2, teamA: 'A', teamB: 'E', votesA: 1, votesB: 2, diffA: -10 },
  { round: 2, teamA: 'B', teamB: 'F', votesA: 2, votesB: 1, diffA: 14 },
  { round: 2, teamA: 'C', teamB: 'D', votesA: 1, votesB: 2, diffA: -12 },
  
  // === ROUND 3 ===
  { round: 3, teamA: 'A', teamB: 'F', votesA: 2.5, votesB: 0.5, diffA: 20 },
  { round: 3, teamA: 'B', teamB: 'D', votesA: 2, votesB: 1, diffA: 11 },
  { round: 3, teamA: 'C', teamB: 'E', votesA: 2, votesB: 1, diffA: 11 },
  
  // === ROUND 4 ===
  { round: 4, teamA: 'A', teamB: 'B', votesA: 1.5, votesB: 1.5, diffA: 0 }, // Tie
  { round: 4, teamA: 'C', teamB: 'D', votesA: 2, votesB: 1, diffA: 8 },
  { round: 4, teamA: 'E', teamB: 'F', votesA: 2, votesB: 1, diffA: 16 },
  
  // === ROUND 5 ===
  { round: 5, teamA: 'A', teamB: 'C', votesA: 2, votesB: 1, diffA: 9 },
  { round: 5, teamA: 'B', teamB: 'E', votesA: 1, votesB: 2, diffA: -8 },
  { round: 5, teamA: 'D', teamB: 'F', votesA: 1.5, votesB: 1.5, diffA: 0 }, // Tie
];

/**
 * Check if example tournament already exists
 */
async function exampleTournamentExists() {
  const existingEvent = await prisma.event.findFirst({
    where: { name: EXAMPLE_EVENT_NAME }
  });
  return !!existingEvent;
}

/**
 * Create the example tournament with all data
 */
async function createExampleTournament() {
  console.log('🎬 Creating example tournament: "Tie-Breaking Test Tournament"...');

  try {
    // Get or create admin user
    let admin = await prisma.user.upsert({
      where: { email: 'admin@ethicsbowl.com' },
      update: {},
      create: {
        email: 'admin@ethicsbowl.com',
        googleId: 'admin-google-id-example',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true
      }
    });

    // Create example judges
    const judges = [];
    for (let i = 1; i <= 3; i++) {
      const judge = await prisma.user.upsert({
        where: { email: `example.judge${i}@ethicsbowl.com` },
        update: {},
        create: {
          email: `example.judge${i}@ethicsbowl.com`,
          googleId: `example-judge-${i}-google-id`,
          firstName: `Example Judge`,
          lastName: `${i}`,
          role: 'judge',
          isActive: true
        }
      });
      judges.push(judge);
    }

    // Create event
    const event = await prisma.event.create({
      data: {
        name: EXAMPLE_EVENT_NAME,
        description: '8 teams, 5 rounds - Demonstrates all Partial Round-Robin tie-breaking rules including coin flip',
        totalRounds: TOTAL_ROUNDS,
        currentRound: TOTAL_ROUNDS,
        status: 'active',
        createdBy: admin.id,
        scoringCriteria: JSON.stringify({
          clarity: 20,
          depth: 20,
          accuracy: 20,
          organization: 20,
          respect: 20
        }),
        roundNames: JSON.stringify(Array.from({ length: TOTAL_ROUNDS }, (_, i) => `Round ${i + 1}`)),
        allowedJudges: JSON.stringify(judges.map(j => j.id)) // Fix: Convert to JSON string
      }
    });

    // Create teams
    const teamMap = {};
    for (const name of TEAM_NAMES) {
      const team = await prisma.team.create({
        data: {
          name: `Team ${name}`,
          eventId: event.id,
          school: `Example School ${name}`,
          coachName: `Coach ${name}`,
          coachEmail: `example.coach${name.toLowerCase()}@ethicsbowl.com`,
        }
      });
      teamMap[name] = team.id;
    }

    // Create matches and scores
    for (const m of MATCHES) {
      const match = await prisma.match.create({
        data: {
          eventId: event.id,
          teamAId: teamMap[m.teamA],
          teamBId: teamMap[m.teamB],
          roundNumber: m.round,
          status: 'completed',
          location: `Room ${m.round}`
        }
      });

      // Assign judges to match
      for (let i = 0; i < 3; i++) {
        await prisma.matchAssignment.create({
          data: {
            matchId: match.id,
            judgeId: judges[i].id,
            judgeNumber: i + 1
          }
        });
      }

      // Calculate and create scores
      const baseCriteriaScore = 15;
      const baseCommentScore = 10;
      const totalBaseScore = (baseCriteriaScore * 5) + (baseCommentScore * 3);

      // Distribute votes among judges
      const judgeVotes = [];
      let votesA = m.votesA;
      let votesB = m.votesB;

      for (let i = 0; i < 3; i++) {
        if (votesA >= 1) {
          judgeVotes.push('A');
          votesA--;
        } else if (votesB >= 1) {
          judgeVotes.push('B');
          votesB--;
        } else if (votesA === 0.5 || votesB === 0.5) {
          judgeVotes.push('tie');
          votesA = 0;
          votesB = 0;
        } else {
          judgeVotes.push('tie');
        }
      }

      // Create scores for each judge
      for (let i = 0; i < 3; i++) {
        let teamAScore = totalBaseScore;
        let teamBScore = totalBaseScore;
        const scoreDiffPerJudge = m.diffA / 3;

        if (judgeVotes[i] === 'A') {
          teamAScore += scoreDiffPerJudge;
          teamBScore -= scoreDiffPerJudge;
        } else if (judgeVotes[i] === 'B') {
          teamAScore -= scoreDiffPerJudge;
          teamBScore += scoreDiffPerJudge;
        }

        teamAScore = Math.max(1, teamAScore);
        teamBScore = Math.max(1, teamBScore);

        // Create score for Team A
        await prisma.score.create({
          data: {
            matchId: match.id,
            judgeId: judges[i].id,
            teamId: teamMap[m.teamA],
            criteriaScores: JSON.stringify({
              clarity: teamAScore / 5,
              depth: teamAScore / 5,
              accuracy: teamAScore / 5,
              organization: teamAScore / 5,
              respect: teamAScore / 5
            }),
            commentScores: JSON.stringify([teamAScore / 3, teamAScore / 3, teamAScore / 3]),
            isSubmitted: true,
            submittedAt: new Date(),
          }
        });

        // Create score for Team B
        await prisma.score.create({
          data: {
            matchId: match.id,
            judgeId: judges[i].id,
            teamId: teamMap[m.teamB],
            criteriaScores: JSON.stringify({
              clarity: teamBScore / 5,
              depth: teamBScore / 5,
              accuracy: teamBScore / 5,
              organization: teamBScore / 5,
              respect: teamBScore / 5
            }),
            commentScores: JSON.stringify([teamBScore / 3, teamBScore / 3, teamBScore / 3]),
            isSubmitted: true,
            submittedAt: new Date(),
          }
        });
      }
    }

    console.log('✅ Example tournament created successfully!');
    console.log(`   Event: ${EXAMPLE_EVENT_NAME}`);
    console.log(`   Teams: ${TEAM_NAMES.length}`);
    console.log(`   Matches: ${MATCHES.length}`);
    console.log(`   This tournament demonstrates:`);
    console.log(`   • Teams with different match counts (F plays 5, G/H play 1)`);
    console.log(`   • Multiple tie-breaking scenarios`);
    console.log(`   • Coin flip mechanism (Teams G and H)`);

  } catch (error) {
    console.error('❌ Error creating example tournament:', error);
    throw error;
  }
}

/**
 * Initialize example data if needed
 */
async function initializeExampleData() {
  try {
    const exists = await exampleTournamentExists();
    
    if (exists) {
      console.log('✅ Example tournament already exists, skipping creation.');
      return;
    }

    console.log('📝 Example tournament not found, creating it now...');
    await createExampleTournament();
    
  } catch (error) {
    console.error('❌ Error initializing example data:', error);
    // Don't throw - allow server to start even if example creation fails
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { initializeExampleData };

