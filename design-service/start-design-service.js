#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting SewNova Design Service...\n');

// Start the server
const serverProcess = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// Handle server process events
serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(code);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Design Service...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Design Service...');
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

console.log('✅ Design Service started successfully!');
console.log('📡 Health check: http://localhost:3006/health');
console.log('🎨 Designs API: http://localhost:3006/api/designs');
console.log('\nPress Ctrl+C to stop the service');
