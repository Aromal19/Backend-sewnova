#!/usr/bin/env node

/**
 * SewNova All Services Startup Script
 * Starts all microservices and runs a reverse proxy API gateway
 * that routes traffic from a single public port to each internal service.
 *
 * On Render (or any single-port host), the gateway listens on process.env.PORT
 * and routes by path prefix:
 *   /auth/api/*        → auth-service     (internal port 3001)
 *   /customer/api/*    → customer-service  (internal port 3002)
 *   /admin/api/*       → admin-service     (internal port 3003)
 *   /design/api/*      → design-service    (internal port 3004)
 *   /tailor/api/*      → tailor-service    (internal port 3005)
 *   /vendor/api/*      → vendor-service    (internal port 3006)
 *   /payment/api/*     → payment-service   (internal port 3007)
 *   /delivery/api/*    → delivery-service  (internal port 3008)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// ---------------------------------------------------------------------------
// Service configurations
// ---------------------------------------------------------------------------
const services = [
  {
    name: 'Auth Service',
    key: 'auth',
    path: './auth-service',
    command: 'npm',
    args: ['start'],
    port: 3001,
    color: '\x1b[36m' // Cyan
  },
  {
    name: 'Customer Service',
    key: 'customer',
    path: './customer-service',
    command: 'npm',
    args: ['start'],
    port: 3002,
    color: '\x1b[32m' // Green
  },
  {
    name: 'Admin Service',
    key: 'admin',
    path: './admin-service',
    command: 'npm',
    args: ['start'],
    port: 3003,
    color: '\x1b[33m' // Yellow
  },
  {
    name: 'Design Service',
    key: 'design',
    path: './design-service',
    command: 'npm',
    args: ['start'],
    port: 3004,
    color: '\x1b[35m' // Magenta
  },
  {
    name: 'Tailor Service',
    key: 'tailor',
    path: './tailor-service',
    command: 'npm',
    args: ['start'],
    port: 3005,
    color: '\x1b[31m' // Red
  },
  {
    name: 'Vendor Service',
    key: 'vendor',
    path: './vendor-service',
    command: 'npm',
    args: ['start'],
    port: 3006,
    color: '\x1b[34m' // Blue
  },
  {
    name: 'Payment Service',
    key: 'payment',
    path: './payment-service',
    command: 'npm',
    args: ['start'],
    port: 3007,
    color: '\x1b[96m' // Bright Cyan
  },
  {
    name: 'Delivery Service',
    key: 'delivery',
    path: './delivery-service',
    command: 'node',
    args: ['server.js'],
    port: 3008,
    color: '\x1b[95m' // Bright Magenta
  }
];

const runningServices = new Map();

function log(serviceName, message, color = '\x1b[37m') {
  const timestamp = new Date().toLocaleTimeString();
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

    log(service.name, ` 🚀 Starting service on internal port ${service.port}...`, service.color);

    // Force each service to listen on its assigned internal port
    const env = {
      ...process.env,
      PORT: String(service.port)
    };

    const child = spawn(service.command, service.args, {
      cwd: servicePath,
      stdio: 'pipe',
      shell: true,
      env
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
      log(service.name, ` ✅ Service started on internal port ${service.port}`, service.color);
      resolve(child);
    }, 2000);
  });
}

// ---------------------------------------------------------------------------
// API Gateway / Reverse Proxy — uses only Node.js built-ins (no extra deps)
// ---------------------------------------------------------------------------
function startGateway() {
  const GATEWAY_PORT = parseInt(process.env.PORT, 10) || 10000;

  // Build a lookup: key → port
  const serviceMap = {};
  for (const s of services) {
    serviceMap[s.key] = s.port;
  }

  // Allowed origins for CORS
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://frontend-sewnova.vercel.app',
    'https://sewnova.vercel.app'
  ];

  function isOriginAllowed(origin) {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    // Allow any *.vercel.app subdomain
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
    return false;
  }

  const gateway = http.createServer((req, res) => {
    const origin = req.headers.origin || '';

    // ---- CORS headers ----
    if (isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // ---- Health check for the gateway itself ----
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'OK',
        service: 'SewNova API Gateway',
        services: Object.keys(serviceMap),
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // ---- Route: /<service-key>/api/... → localhost:<port>/api/... ----
    // Also support /<service-key>/health → localhost:<port>/health
    const match = req.url.match(/^\/([a-z]+)(\/.*)/);
    if (!match) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unknown route. Use /<service>/api/...' }));
      return;
    }

    const serviceKey = match[1];
    const downstreamPath = match[2]; // e.g. /api/auth/login

    const targetPort = serviceMap[serviceKey];
    if (!targetPort) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: `Unknown service: ${serviceKey}`,
        available: Object.keys(serviceMap)
      }));
      return;
    }

    // Proxy the request to the internal service
    const proxyOptions = {
      hostname: '127.0.0.1',
      port: targetPort,
      path: downstreamPath,
      method: req.method,
      headers: { ...req.headers, host: `127.0.0.1:${targetPort}` }
    };

    const proxyReq = http.request(proxyOptions, (proxyRes) => {
      // Copy CORS headers onto proxied response
      const headers = { ...proxyRes.headers };
      if (isOriginAllowed(origin)) {
        headers['access-control-allow-origin'] = origin || '*';
        headers['access-control-allow-credentials'] = 'true';
      }
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      log('Gateway', ` ❌ Proxy error → ${serviceKey}:${targetPort}: ${err.message}`, '\x1b[31m');
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Service ${serviceKey} is unavailable`, detail: err.message }));
    });

    // Pipe the incoming request body to the proxy
    req.pipe(proxyReq, { end: true });
  });

  gateway.listen(GATEWAY_PORT, () => {
    log('Gateway', ` 🌐 API Gateway running on port ${GATEWAY_PORT}`, '\x1b[1m\x1b[36m');
    log('Gateway', ` 📡 Routing:`, '\x1b[37m');
    for (const s of services) {
      log('Gateway', `    /${s.key}/api/* → localhost:${s.port}`, '\x1b[37m');
    }
  });
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------
function stopAllServices() {
  log('System', ' 🛑 Stopping all services...', '\x1b[31m');

  for (const [name, proc] of runningServices) {
    log(name, ' 🛑 Stopping service...', '\x1b[31m');
    proc.kill('SIGTERM');
  }

  setTimeout(() => {
    log('System', ' ✅ All services stopped', '\x1b[32m');
    process.exit(0);
  }, 2000);
}

async function startAllServices() {
  console.log('\x1b[1m\x1b[36m🚀 SewNova All Services Startup\x1b[0m');
  console.log('='.repeat(50));

  // Handle graceful shutdown
  process.on('SIGINT', stopAllServices);
  process.on('SIGTERM', stopAllServices);

  try {
    // Start services sequentially to avoid port conflicts
    for (const service of services) {
      try {
        await startService(service);
        // Small delay between services
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        log(service.name, ` ❌ Failed to start: ${error.message}`, '\x1b[31m');
        // Continue with other services
      }
    }

    // Start the API gateway AFTER all services are up
    startGateway();

    log('System', ' 🎉 All services started successfully!', '\x1b[32m');
    log('System', ' 📝 Press Ctrl+C to stop all services', '\x1b[37m');

    // Keep the process alive
    process.stdin.resume();

  } catch (error) {
    log('System', ` ❌ Startup failed: ${error.message}`, '\x1b[31m');
    process.exit(1);
  }
}

// Check if we're in the right directory (look for any service folder)
if (!fs.existsSync('./auth-service')) {
  console.log('\x1b[31m❌ Please run this script from the backend root directory\x1b[0m');
  process.exit(1);
}

// Start all services
startAllServices();
