/**
 * Clean up test tournament data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up test tournament data...\n');

  // Find and delete the test event
  const event = await prisma.event.findFirst({
    where: { name: 'Official Partial Round-Robin Example' }
  });

  if (!event) {
    console.log('✅ No test event found. Database is clean!');
    return;
  }

  console.log(`📋 Found test event: ${event.name} (ID: ${event.id})`);
  console.log('   Deleting related data...');

  // Delete in correct order to avoid foreign key constraints
  
  // 1. Delete scores
  const deletedScores = await prisma.score.deleteMany({
    where: {
      match: {
        eventId: event.id
      }
    }
  });
  console.log(`   ✓ Deleted ${deletedScores.count} scores`);

  // 2. Delete match assignments
  const deletedAssignments = await prisma.matchAssignment.deleteMany({
    where: {
      match: {
        eventId: event.id
      }
    }
  });
  console.log(`   ✓ Deleted ${deletedAssignments.count} match assignments`);

  // 3. Delete matches
  const deletedMatches = await prisma.match.deleteMany({
    where: { eventId: event.id }
  });
  console.log(`   ✓ Deleted ${deletedMatches.count} matches`);

  // 4. Delete teams
  const deletedTeams = await prisma.team.deleteMany({
    where: { eventId: event.id }
  });
  console.log(`   ✓ Deleted ${deletedTeams.count} teams`);

  // 5. Finally delete the event
  await prisma.event.delete({
    where: { id: event.id }
  });

  console.log('✅ Test event and all related data deleted successfully!');
  console.log('\n💡 Now you can run: node scripts/seed-official-tournament.js');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

