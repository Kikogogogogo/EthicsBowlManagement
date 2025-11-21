/**
 * Debug script to check tournament data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Debugging Tournament Data\n');

  // Find all test events with this name
  const events = await prisma.event.findMany({
    where: { name: 'Tie-Breaking Test Tournament' },
    orderBy: { createdAt: 'desc' },
    include: {
      teams: true,
      matches: {
        include: {
          assignments: true,
          scores: true
        }
      }
    }
  });

  if (events.length === 0) {
    console.log('❌ No events found!');
    return;
  }

  console.log(`✅ Found ${events.length} event(s) with this name\n`);

  // Use the most recent one with data
  const event = events.find(e => e.teams.length > 0 && e.matches.length > 0) || events[0];

  console.log(`📊 Using event: ${event.name} (ID: ${event.id.substring(0, 8)}...)`);
  console.log(`   Created: ${event.createdAt}`);
  console.log(`   Teams: ${event.teams.length}`);
  console.log(`   Matches: ${event.matches.length}\n`);

  if (event.teams.length === 0 || event.matches.length === 0) {
    console.log('⚠️  This event has no teams or matches!');
    console.log('💡 Try running: node scripts/seed-official-tournament.js\n');
    return;
  }

  // Check first match
  const match = event.matches[0];
  console.log('📋 First Match Data:');
  console.log(`   Match ID: ${match.id}`);
  console.log(`   Team A: ${match.teamAId}`);
  console.log(`   Team B: ${match.teamBId}`);
  console.log(`   Assignments: ${match.assignments.length}`);
  console.log(`   Scores: ${match.scores.length}\n`);

  if (match.assignments.length > 0) {
    console.log('👥 Assignments:');
    match.assignments.forEach((a, i) => {
      console.log(`   ${i + 1}. Judge ID: ${a.judgeId}`);
    });
    console.log();
  }

  if (match.scores.length > 0) {
    console.log('📊 Scores:');
    match.scores.forEach((s, i) => {
      const criteria = JSON.parse(s.criteriaScores);
      const comments = JSON.parse(s.commentScores);
      const criteriaTotal = Object.values(criteria).reduce((a, b) => a + b, 0);
      const commentSum = comments.reduce((a, b) => a + b, 0);
      const commentAvg = commentSum / comments.length;
      const total = criteriaTotal + commentAvg;
      console.log(`   ${i + 1}. Judge: ${s.judgeId}, Team: ${s.teamId}`);
      console.log(`      Raw criteria: ${JSON.stringify(criteria)}`);
      console.log(`      Raw comments: ${JSON.stringify(comments)}`);
      console.log(`      Criteria Total: ${criteriaTotal}, Comment Sum: ${commentSum}, Comment Avg: ${commentAvg}, Total: ${total}`);
    });
    console.log();
  }

  // Check if judge IDs match
  const assignmentJudgeIds = new Set(match.assignments.map(a => a.judgeId));
  const scoreJudgeIds = new Set(match.scores.map(s => s.judgeId));
  
  console.log('🔍 Judge ID Analysis:');
  console.log(`   Assignment Judge IDs: ${Array.from(assignmentJudgeIds).join(', ')}`);
  console.log(`   Score Judge IDs: ${Array.from(scoreJudgeIds).join(', ')}`);
  
  const matching = Array.from(assignmentJudgeIds).every(id => scoreJudgeIds.has(id));
  console.log(`   ✅ All assignment judges have scores: ${matching}\n`);

  // Check scores per team
  const teamAId = match.teamAId;
  const teamBId = match.teamBId;
  const teamAScores = match.scores.filter(s => s.teamId === teamAId);
  const teamBScores = match.scores.filter(s => s.teamId === teamBId);
  
  console.log('📈 Scores by Team:');
  console.log(`   Team A (${teamAId}): ${teamAScores.length} scores`);
  console.log(`   Team B (${teamBId}): ${teamBScores.length} scores\n`);

  // Calculate what votes should be
  console.log('🎯 Expected Votes Calculation:');
  assignmentJudgeIds.forEach(judgeId => {
    const teamAScore = teamAScores.find(s => s.judgeId === judgeId);
    const teamBScore = teamBScores.find(s => s.judgeId === judgeId);
    
    if (teamAScore && teamBScore) {
      const aTotal = calculateTotal(teamAScore);
      const bTotal = calculateTotal(teamBScore);
      const winner = aTotal > bTotal ? 'Team A' : (bTotal > aTotal ? 'Team B' : 'Tie');
      console.log(`   Judge ${judgeId}: A=${aTotal}, B=${bTotal} → ${winner}`);
    } else {
      console.log(`   Judge ${judgeId}: ❌ Missing scores!`);
    }
  });
}

function calculateTotal(score) {
  const criteria = JSON.parse(score.criteriaScores);
  const comments = JSON.parse(score.commentScores);
  const criteriaTotal = Object.values(criteria).reduce((a, b) => a + b, 0);
  const commentAvg = comments.reduce((a, b) => a + b, 0) / comments.length;
  return criteriaTotal + commentAvg;
}

main()
  .then(() => {
    console.log('\n✅ Debug complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

