const { PrismaClient } = require('@prisma/client');
const { USER_ROLES } = require('../src/constants/enums');

const prisma = new PrismaClient();

// Test user configuration
const TEST_USERS_CONFIG = {
  admins: {
    count: 2,
    role: USER_ROLES.ADMIN,
    prefix: 'Admin'
  },
  judges: {
    count: 3,
    role: USER_ROLES.JUDGE,
    prefix: 'Judge'
  },
  moderators: {
    count: 3,
    role: USER_ROLES.MODERATOR,
    prefix: 'Moderator'
  }
};

// Generate specific names for test users
function generateTestUserName(roleType, index) {
  const rolePrefix = roleType.charAt(0).toUpperCase() + roleType.slice(1, -1); // Remove 's' from end
  const numberWords = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  
  return {
    firstName: rolePrefix,
    lastName: numberWords[index - 1]
  };
}

// Generate test users
async function generateTestUsers() {
  console.log('🧪 Starting virtual test user generation...');
  
  try {
    const createdUsers = [];
    
    // Generate test users for different roles
    for (const [roleType, config] of Object.entries(TEST_USERS_CONFIG)) {
      console.log(`\n📝 Creating ${config.role} users (${config.count} users)...`);
      
      for (let i = 1; i <= config.count; i++) {
        const { firstName, lastName } = generateTestUserName(roleType, i);
        const email = `test.${roleType.toLowerCase()}.${i}@virtual.test`;
        const googleId = `virtual_${roleType}_${i}_${Date.now()}`;
        
        try {
          const user = await prisma.user.upsert({
            where: { email },
            update: {
              isActive: true,
              role: config.role,
              firstName,
              lastName,
              isEmailVerified: true,
              lastLoginAt: new Date(),
            },
            create: {
              email,
              firstName,
              lastName,
              role: config.role,
              googleId,
              isEmailVerified: true,
              isActive: true,
              lastLoginAt: new Date(),
            },
          });
          
          createdUsers.push({
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            isActive: user.isActive
          });
          
          console.log(`  ✅ ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
        } catch (error) {
          console.error(`  ❌ Failed to create user: ${email}`, error.message);
        }
      }
    }
    
    console.log('\n🎉 Virtual test user generation completed!');
    console.log(`📊 Total created: ${createdUsers.length} users`);
    
    // Group users by role for display
    const usersByRole = createdUsers.reduce((acc, user) => {
      if (!acc[user.role]) acc[user.role] = [];
      acc[user.role].push(user);
      return acc;
    }, {});
    
    console.log('\n📋 User list:');
    for (const [role, users] of Object.entries(usersByRole)) {
      console.log(`\n${role.toUpperCase()} (${users.length} users):`);
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.email})`);
      });
    }
    
    console.log('\n💡 Usage instructions:');
    console.log('1. These are virtual test users, no real Google accounts needed');
    console.log('2. All users are pre-activated and ready to use');
    console.log('3. Use different browser profiles to test different accounts');
    console.log('4. Or use incognito mode to test multiple accounts simultaneously');
    console.log('5. Visit http://localhost:3000/#test-users to view the test user interface');
    
    return createdUsers;
  } catch (error) {
    console.error('❌ Error generating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Clean up test users
async function cleanupTestUsers() {
  console.log('🧹 Cleaning up virtual test users...');
  
  try {
    const result = await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@virtual.test'
        }
      }
    });
    
    console.log(`✅ Deleted ${result.count} virtual test users`);
  } catch (error) {
    console.error('❌ Error cleaning up test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// List all virtual users
async function listTestUsers() {
  console.log('📋 Listing all virtual test users...');
  
  try {
    const users = await prisma.user.findMany({
      where: {
        email: {
          contains: '@virtual.test'
        }
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true
      },
      orderBy: [
        { role: 'asc' },
        { firstName: 'asc' }
      ]
    });
    
    if (users.length === 0) {
      console.log('❌ No virtual test users found');
      return;
    }
    
    console.log(`\n📊 Found ${users.length} virtual test users:`);
    
    const usersByRole = users.reduce((acc, user) => {
      if (!acc[user.role]) acc[user.role] = [];
      acc[user.role].push(user);
      return acc;
    }, {});
    
    for (const [role, roleUsers] of Object.entries(usersByRole)) {
      console.log(`\n${role.toUpperCase()} (${roleUsers.length} users):`);
      roleUsers.forEach(user => {
        const lastLogin = user.lastLoginAt ? 
          new Date(user.lastLoginAt).toLocaleString() : 'Never logged in';
        console.log(`  - ${user.firstName} ${user.lastName} (${user.email}) - Last login: ${lastLogin}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error listing test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 主函数
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'generate':
      await generateTestUsers();
      break;
    case 'cleanup':
      await cleanupTestUsers();
      break;
    case 'list':
      await listTestUsers();
      break;
    default:
      console.log('🧪 Virtual Test User Generator');
      console.log('');
      console.log('Usage:');
      console.log('  node generate-test-users.js generate  # Generate virtual test users');
      console.log('  node generate-test-users.js cleanup  # Clean up virtual test users');
      console.log('  node generate-test-users.js list     # List all virtual test users');
      console.log('');
      console.log('Generation config:');
      console.log(`  - ${TEST_USERS_CONFIG.admins.count} admins (${TEST_USERS_CONFIG.admins.role})`);
      console.log(`  - ${TEST_USERS_CONFIG.judges.count} judges (${TEST_USERS_CONFIG.judges.role})`);
      console.log(`  - ${TEST_USERS_CONFIG.moderators.count} moderators (${TEST_USERS_CONFIG.moderators.role})`);
      console.log('');
      console.log('💡 Tips:');
      console.log('  - After generation, manage test users through the web interface');
      console.log('  - Visit http://localhost:3000/#test-users to view the test user interface');
      break;
  }
}

main().catch(console.error);
