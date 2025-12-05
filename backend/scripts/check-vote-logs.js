const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVoteLogs() {
  try {
    console.log('📊 Checking vote_logs table...\n');
    
    const eventId = 'e2bfeee1-cd99-4b47-bc49-5776cf1eb448';
    
    const voteLogs = await prisma.voteLog.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${voteLogs.length} vote log(s) for event ${eventId}:\n`);
    
    for (const log of voteLogs) {
      const team = await prisma.team.findUnique({
        where: { id: log.teamId },
        select: { name: true }
      });
      
      console.log('---');
      console.log(`ID: ${log.id}`);
      console.log(`Team: ${team?.name || 'Unknown'}`);
      console.log(`Adjustment: ${log.adjustment > 0 ? '+' : ''}${log.adjustment}`);
      console.log(`Admin: ${log.adminName}`);
      console.log(`Time: ${log.createdAt.toLocaleString()}`);
      console.log(`Reason: ${log.reason || 'N/A'}`);
    }
    
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkVoteLogs();








