/**
 * Seed script for Testing Partial Round-Robin Tie-Breaking
 * Creates a simplified 6-team, 5-round tournament to test tie-breaking rules
 * 
 * Expected Results:
 *   - Teams A, B: ~3-3.5 wins (close for tie-breaking)
 *   - Teams C, D: ~2 wins  
 *   - Teams E, F: ~1-2 wins
 * 
 * Usage: node scripts/seed-official-tournament.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TEAM_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const TOTAL_ROUNDS = 5;

// Match list - votesA > votesB means A wins, votesA < votesB means B wins
const MATCHES = [
  // === ROUND 1 ===
  { round: 1, teamA: 'A', teamB: 'D', votesA: 2, votesB: 1, diffA: 15 },    // A wins (1.0)
  { round: 1, teamA: 'B', teamB: 'E', votesA: 2.5, votesB: 0.5, diffA: 22 },  // B wins (1.0)
  { round: 1, teamA: 'C', teamB: 'F', votesA: 3, votesB: 0, diffA: 18 },    // C wins (1.0)
  { round: 1, teamA: 'G', teamB: 'H', votesA: 1.5, votesB: 1.5, diffA: 0 }, // Tie! G and H both get 0.5 wins, 1.5 votes, 0 diff
  
  // === ROUND 2 ===
  { round: 2, teamA: 'A', teamB: 'E', votesA: 1, votesB: 2, diffA: -10 },   // E wins (A: 1.0, E: 1.0)
  { round: 2, teamA: 'B', teamB: 'F', votesA: 2, votesB: 1, diffA: 14 },    // B wins (B: 2.0)
  { round: 2, teamA: 'C', teamB: 'D', votesA: 1, votesB: 2, diffA: -12 },   // D wins (C: 1.0, D: 1.0)
  // G and H don't play
  
  // === ROUND 3 ===
  { round: 3, teamA: 'A', teamB: 'F', votesA: 2.5, votesB: 0.5, diffA: 20 }, // A wins (A: 2.0)
  { round: 3, teamA: 'B', teamB: 'D', votesA: 2, votesB: 1, diffA: 11 },    // B wins (B: 3.0)
  { round: 3, teamA: 'C', teamB: 'E', votesA: 2, votesB: 1, diffA: 11 },    // C wins (C: 2.0)
  // G and H don't play
  
  // === ROUND 4 ===
  { round: 4, teamA: 'A', teamB: 'B', votesA: 1.5, votesB: 1.5, diffA: 0 }, // Tie (A: 2.5, B: 3.5)
  { round: 4, teamA: 'C', teamB: 'D', votesA: 2, votesB: 1, diffA: 8 },    // C wins (C: 3.0, D: 1.0)
  { round: 4, teamA: 'E', teamB: 'F', votesA: 2, votesB: 1, diffA: 16 },    // E wins (E: 2.0, F: 0.0)
  // G and H don't play
  
  // === ROUND 5 ===
  { round: 5, teamA: 'A', teamB: 'C', votesA: 2, votesB: 1, diffA: 9 },     // A wins (A: 3.5)
  { round: 5, teamA: 'B', teamB: 'E', votesA: 1, votesB: 2, diffA: -8 },    // E wins (B: 3.5, E: 3.0)
  { round: 5, teamA: 'D', teamB: 'F', votesA: 1.5, votesB: 1.5, diffA: 0 }, // Tie (D: 1.5, F: 0.5)
  // G and H don't play
];

// Final expected wins:
// A: 1.0 + 0.0 + 1.0 + 0.5 + 1.0 = 3.5 wins
// B: 1.0 + 1.0 + 1.0 + 0.5 + 0.0 = 3.5 wins (tied with A!)
// C: 1.0 + 0.0 + 1.0 + 1.0 + 0.0 = 3.0 wins
// D: 0.0 + 1.0 + 0.0 + 0.0 + 0.5 = 1.5 wins
// E: 0.0 + 1.0 + 0.0 + 1.0 + 1.0 = 3.0 wins (tied with C!)
// F: 0.0 + 0.0 + 0.0 + 0.0 + 0.5 = 0.5 wins
// G: 0.5 wins (only played H in R1, tied) - 1 match, 1.5 votes, 0 diff
// H: 0.5 wins (only played G in R1, tied) - 1 match, 1.5 votes, 0 diff
// 
// G and H are PERFECTLY IDENTICAL:
// - Same wins: 0.5
// - Same total matches: 1
// - Same votes: 1.5
// - Same score diff: 0
// - Same opponents: only each other (H for G, G for H)
// - Same opponents' result: 0.5 (each other's wins)
// - This will exhaust ALL tie-breakers and trigger: COIN FLIP! 🪙

async function main() {
  console.log('🚀 Seeding Partial Round-Robin Tournament with Coin Flip Test\n');
  console.log('📋 This tournament tests ALL tie-breaking rules:\n');
  console.log('   • A, B tied at 3.5 wins (resolved by score diff)');
  console.log('   • C, E tied at 3.0 wins (resolved by h2h or votes)');
  console.log('   • G, H tied at 0.5 wins with IDENTICAL stats → triggers COIN FLIP! 🪙\n');

  try {
    // Get or create admin
    let admin = await prisma.user.findFirst({ where: { role: 'admin', isActive: true } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          email: 'admin@ethicsbowl.com',
          googleId: 'admin-google-id-test',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          isActive: true
        }
      });
    }

    // Create or find judges
    const judges = [];
    for (let i = 1; i <= 3; i++) {
      const judge = await prisma.user.upsert({
        where: { email: `judge${i}@test.com` },
        update: {},
        create: {
          email: `judge${i}@test.com`,
          googleId: `judge${i}-google-id`,
          firstName: 'Judge',
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
        name: 'Tie-Breaking Test Tournament',
        description: '8 teams, 5 rounds - Testing ALL tie-breaking rules including coin flip',
        totalRounds: TOTAL_ROUNDS,
        currentRound: TOTAL_ROUNDS,
        status: 'active',
        createdBy: admin.id,
        scoringCriteria: JSON.stringify({
          maxScore: 100,
          criteria: ['Clarity', 'Relevance', 'Thoughtfulness']
        })
      }
    });

    console.log(`✅ Created event: ${event.name} (ID: ${event.id})\n`);

    // Create teams
    const teamMap = {};
    for (const name of TEAM_NAMES) {
      const team = await prisma.team.create({
        data: {
          name: `Team ${name}`,
          eventId: event.id,
          school: `School ${name}`,
          coachName: `Coach ${name}`,
          coachEmail: `coach${name.toLowerCase()}@school.com`
        }
      });
      teamMap[name] = team.id;
    }

    console.log(`✅ Created ${TEAM_NAMES.length} teams\n`);

    // Create all matches
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

      // Assign judges
      for (let i = 0; i < 3; i++) {
        await prisma.matchAssignment.create({
          data: {
            matchId: match.id,
            judgeId: judges[i].id,
            judgeNumber: i + 1
          }
        });
      }

      // Generate scores based on votes
      const baseScore = 80;
      const judgeVotes = [];
      
      // Determine vote distribution for 3 judges
      if (m.votesA === m.votesB) {
        // Equal votes - all tie
        judgeVotes.push('tie', 'tie', 'tie');
      } else if (m.votesA > m.votesB) {
        // A wins more votes
        const fullVotesA = Math.floor(m.votesA);
        const fullVotesB = Math.floor(m.votesB);
        const hasHalfVote = (m.votesA % 1 !== 0) || (m.votesB % 1 !== 0);
        
        for (let i = 0; i < fullVotesA; i++) judgeVotes.push('A');
        for (let i = 0; i < fullVotesB; i++) judgeVotes.push('B');
        if (hasHalfVote) judgeVotes.push('tie');
      } else {
        // B wins more votes
        const fullVotesA = Math.floor(m.votesA);
        const fullVotesB = Math.floor(m.votesB);
        const hasHalfVote = (m.votesA % 1 !== 0) || (m.votesB % 1 !== 0);
        
        for (let i = 0; i < fullVotesA; i++) judgeVotes.push('A');
        for (let i = 0; i < fullVotesB; i++) judgeVotes.push('B');
        if (hasHalfVote) judgeVotes.push('tie');
      }
      
      // Create scores for each judge
      for (let i = 0; i < 3; i++) {
        let scoreA, scoreB;
        const vote = judgeVotes[i] || 'tie';
        
        if (vote === 'A') {
          scoreA = baseScore + 10;
          scoreB = baseScore - 10;
        } else if (vote === 'B') {
          scoreA = baseScore - 10;
          scoreB = baseScore + 10;
        } else {
          scoreA = baseScore;
          scoreB = baseScore;
        }
        
        // Adjust for score differential
        if (m.diffA !== 0) {
          const adjustment = m.diffA / 6;
          scoreA += adjustment;
          scoreB -= adjustment;
        }

        // Match event's scoringCriteria structure (5 criteria, each worth 20 points)
        const criteriaScoreA = Math.round((scoreA / 5) * 10) / 10;
        const criteriaScoreB = Math.round((scoreB / 5) * 10) / 10;
        
        // Comment scores (3 questions, average them)
        const commentScoreA = Math.round((scoreA / 3) * 10) / 10;
        const commentScoreB = Math.round((scoreB / 3) * 10) / 10;

        // Create score for Team A
        await prisma.score.create({
          data: {
            matchId: match.id,
            judgeId: judges[i].id,
            teamId: teamMap[m.teamA],
            criteriaScores: JSON.stringify({
              clarity: criteriaScoreA,
              depth: criteriaScoreA,
              accuracy: criteriaScoreA,
              organization: criteriaScoreA,
              respect: criteriaScoreA
            }),
            commentScores: JSON.stringify([commentScoreA, commentScoreA, commentScoreA]),
            isSubmitted: true,
            submittedAt: new Date()
          }
        });
        
        // Create score for Team B
        await prisma.score.create({
          data: {
            matchId: match.id,
            judgeId: judges[i].id,
            teamId: teamMap[m.teamB],
            criteriaScores: JSON.stringify({
              clarity: criteriaScoreB,
              depth: criteriaScoreB,
              accuracy: criteriaScoreB,
              organization: criteriaScoreB,
              respect: criteriaScoreB
            }),
            commentScores: JSON.stringify([commentScoreB, commentScoreB, commentScoreB]),
            isSubmitted: true,
            submittedAt: new Date()
          }
        });
      }

      console.log(`✅ Round ${m.round}: ${m.teamA} vs ${m.teamB} - votes ${m.votesA}:${m.votesB}`);
    }

    console.log(`\n🎉 Successfully seeded ${MATCHES.length} completed matches!`);
    console.log(`\n🔍 Check the standings to verify tie-breaking logic.`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
