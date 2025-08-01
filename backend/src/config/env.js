require('dotenv').config();

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'FRONTEND_URL'
];

// Validate required environment variables
function validateEnv() {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(envVar => console.error(`   - ${envVar}`));
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set');
}

const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  databaseUrl: process.env.DATABASE_URL,
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // Google OAuth configuration
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  },
  
  // API configuration
  api: {
    prefix: '/api/v1',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'development' ? 10000 : 500, // Much more lenient for development
    },
  },
  
  // Security configuration
  cors: {
    origin: process.env.CORS_ORIGIN ? 
      process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
      [
        'http://localhost:3000',
        'http://localhost:8080',
        'https://ethics-bowl-management2025.vercel.app', 
      ],
    credentials: true,
  },
  
  // Application configuration
  app: {
    name: 'Ethics Bowl Scoring Platform',
    version: '1.0.0',
  },
  
  // Frontend configuration
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:8080',
  },
};

module.exports = {
  config,
  validateEnv
}; 