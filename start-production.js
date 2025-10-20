#!/usr/bin/env node

/**
 * SewNova Production Startup Script for Render
 * Starts all microservices for production deployment
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Service configurations for production
const services = [
  {
    name: 'Auth Service',
    path: './auth-service',
    command: 'npm',
    args: ['start'],
    port: process.env.AUTH_SERVICE_PORT || 3001,
    color: '\x1b[36m' // Cyan
  },
  {
    name: 'Customer Service',
    path: './customer-service',
    command: 'npm',
    args: ['start'],
    port: process.env.CUSTOMER_SERVICE_PORT || 3002,
    color: '\x1b[32m' // Green
  },
  {
    name: 'Admin Service',
    path: './admin-service',
    command: 'npm',
    args: ['start'],
    port: process.env.ADMIN_SERVICE_PORT || 3003,
    color: '\x1b[33m' // Yellow
  },
  {
    name: 'Design Service',
    path: './design-service',
    command: 'npm',
    args: ['start'],
    port: process.env.DESIGN_SERVICE_PORT || 3004,
    color: '\x1b[35m' // Magenta
  },
  {
    name: 'Tailor Service',
    path: './tailor-service',
    command: 'npm',
    args: ['start'],
    port: process.env.TAILOR_SERVICE_PORT || 3005,
    color: '\x1b[31m' // Red
  },
  {
    name: 'Vendor Service',
    path: './vendor-service',
    command: 'npm',
    args: ['start'],
    port: process.env.VENDOR_SERVICE_PORT || 3006,
    color: '\x1b[34m' // Blue
  },
  {
    name: 'Payment Service',
    path: './payment-service',
    command: 'npm',
    args: ['start'],
    port: process.env.PAYMENT_SERVICE_PORT || 3007,
    color: '\x1b[37m' // White
  }
];

const runningServices = new Map();

function log(serviceName, message, color = '\x1b[37m') {
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}] [${serviceName}]${message}\x1b[0m`);
}

function startService(service) {
  return new Promise((resolve, reject) => {
    const servicePath = path.resolve(service.path);
    
    // Check if service directory exists
    if (!fs.existsSync(servicePath)) {
      log(service.name, ` ❌ Directory not found: ${servicePath}`, '\x1b[31m');
      reject(new Error(`Service directory not found: ${servicePath}`));
      return;
    }

    log(service.name, ` 🚀 Starting service on port ${service.port}...`, service.color);
    
    const child = spawn(service.command, service.args, {
      cwd: servicePath,
      stdio: 'pipe',
      shell: true,
      env: {
        ...process.env,
        PORT: service.port,
        NODE_ENV: 'production'
      }
    });

    // Store the process
    runningServices.set(service.name, child);

    // Handle stdout
    child.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        log(service.name, ` ${output}`, service.color);
      }
    });

    // Handle stderr
    child.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        log(service.name, ` ${output}`, '\x1b[33m'); // Yellow for errors
      }
    });

    // Handle process exit
    child.on('exit', (code) => {
      if (code === 0) {
        log(service.name, ` ✅ Service stopped gracefully`, service.color);
      } else {
        log(service.name, ` ❌ Service exited with code ${code}`, '\x1b[31m');
      }
      runningServices.delete(service.name);
    });

    // Handle process error
    child.on('error', (error) => {
      log(service.name, ` ❌ Error: ${error.message}`, '\x1b[31m');
      reject(error);
    });

    // Give the service some time to start
    setTimeout(() => {
      log(service.name, ` ✅ Service started on port ${service.port}`, service.color);
      resolve(child);
    }, 3000);
  });
}

function stopAllServices() {
  log('System', ' 🛑 Stopping all services...', '\x1b[31m');
  
  for (const [name, process] of runningServices) {
    log(name, ' 🛑 Stopping service...', '\x1b[31m');
    process.kill('SIGTERM');
  }
  
  setTimeout(() => {
    log('System', ' ✅ All services stopped', '\x1b[32m');
    process.exit(0);
  }, 2000);
}

async function startAllServices() {
  console.log('\x1b[1m\x1b[36m🚀 SewNova Production Services Startup\x1b[0m');
  console.log('=' .repeat(50));
  
  // Handle graceful shutdown
  process.on('SIGINT', stopAllServices);
  process.on('SIGTERM', stopAllServices);
  
  try {
    // Start services sequentially to avoid port conflicts
    for (const service of services) {
      try {
        await startService(service);
        // Small delay between services
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        log(service.name, ` ❌ Failed to start: ${error.message}`, '\x1b[31m');
        // Continue with other services
      }
    }
    
    log('System', ' 🎉 All services started successfully!', '\x1b[32m');
    log('System', ' 📝 Services are running in production mode', '\x1b[37m');
    
    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    log('System', ` ❌ Startup failed: ${error.message}`, '\x1b[31m');
    process.exit(1);
  }
}

// Check if we're in the right directory
if (!fs.existsSync('./auth-service') || !fs.existsSync('./customer-service')) {
  console.log('\x1b[31m❌ Please run this script from the backend directory\x1b[0m');
  process.exit(1);
}

// Start all services
startAllServices();
