const path = require('path');
const colors = require('colors');

// Set NODE_ENV if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

console.log('🚀 Starting Smart Study Platform...'.cyan.bold);
console.log(`📂 Root Directory: ${__dirname}`.gray);
console.log(`🌍 Environment: ${process.env.NODE_ENV}`.gray);

// Start the backend server
try {
  console.log('🔧 Loading backend server...'.yellow);
  require('./backend/server');
} catch (error) {
  console.error('❌ Failed to start backend server:'.red.bold);
  console.error(error.message);
  process.exit(1);
}
