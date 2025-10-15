#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting SewNova Admin Service...');

// Set environment variables
process.env.PORT = process.env.PORT || '3007';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sewnova';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'admin-super-secret-jwt-key-2024';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Start the server
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

server.on('error', (err) => {
  console.error('❌ Failed to start admin service:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Admin service exited with code ${code}`);
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down admin service...');
  server.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down admin service...');
  server.kill('SIGTERM');
  process.exit(0);
});
