const cluster = require('cluster');
const os = require('os');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const DistributionService = require('./src/services/DistributionService');
const LogPacket = require('./src/models/LogPacket');
const LogMessage = require('./src/models/LogMessage');

// Configuration
const PORT = process.env.PORT || 3000;
const WORKER_COUNT = process.env.WORKER_COUNT || os.cpus().length;

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Analyzer configuration (from the requirements)
// Use Docker hostnames in Docker environment, localhost otherwise
const isDocker = process.env.NODE_ENV === 'docker';
const ANALYZERS = [
  { id: 'A1', endpoint: `http://${isDocker ? 'analyzer1' : 'localhost'}:3001`, weight: 0.1 },
  { id: 'A2', endpoint: `http://${isDocker ? 'analyzer2' : 'localhost'}:3002`, weight: 0.4 },
  { id: 'A3', endpoint: `http://${isDocker ? 'analyzer3' : 'localhost'}:3003`, weight: 0.2 },
  { id: 'A4', endpoint: `http://${isDocker ? 'analyzer4' : 'localhost'}:3004`, weight: 0.3 }
];

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
  console.log(`Starting ${WORKER_COUNT} workers...`);

  // Fork workers
  for (let i = 0; i < WORKER_COUNT; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    // Replace the dead worker
    cluster.fork();
  });

  // Monitor cluster health
  setInterval(() => {
    const workers = Object.keys(cluster.workers);
    console.log(`Active workers: ${workers.length}`);
  }, 30000);

} else {
  // Worker process
  const app = express();
  const distributionService = new DistributionService();

  // Initialize analyzers
  distributionService.initializeAnalyzers(ANALYZERS);

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(limiter);

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Worker ${process.pid}`);
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      worker: process.pid,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Main endpoint to receive log packets
  app.post('/logs', async (req, res) => {
    try {
      const { emitterId, messages, metadata } = req.body;

      // Validate input
      if (!emitterId || !messages || !Array.isArray(messages)) {
        return res.status(400).json({
          error: 'Invalid request body. Required: emitterId, messages (array)'
        });
      }

      // Create log messages
      const logMessages = messages.map(msg => {
        return new LogMessage(
          msg.timestamp,
          msg.level,
          msg.message,
          msg.source || emitterId,
          msg.metadata || {}
        );
      });

      // Create log packet
      const logPacket = new LogPacket(emitterId, logMessages, metadata);

      // Distribute the packet
      const result = await distributionService.distributePacket(logPacket);

      res.status(202).json({
        success: true,
        packetId: result.packetId,
        messageCount: result.messageCount,
        status: result.status,
        worker: process.pid
      });

    } catch (error) {
      console.error('Error processing log packet:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  // Statistics endpoint
  app.get('/stats', (req, res) => {
    const stats = distributionService.getStats();
    res.json({
      ...stats,
      worker: process.pid,
      timestamp: new Date().toISOString()
    });
  });

  // Queue status endpoint
  app.get('/queue', (req, res) => {
    const queueStatus = distributionService.getQueueStatus();
    res.json({
      ...queueStatus,
      worker: process.pid,
      timestamp: new Date().toISOString()
    });
  });

  // Analyzer status endpoint
  app.get('/analyzers', (req, res) => {
    const analyzers = distributionService.analyzerManager.getAllAnalyzers();
    res.json({
      analyzers: analyzers.map(analyzer => ({
        id: analyzer.id,
        endpoint: analyzer.endpoint,
        weight: analyzer.weight,
        isOnline: analyzer.isOnline,
        consecutiveFailures: analyzer.consecutiveFailures,
        lastHealthCheck: analyzer.lastHealthCheck
      })),
      worker: process.pid,
      timestamp: new Date().toISOString()
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log(`Worker ${process.pid} received SIGTERM`);
    distributionService.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log(`Worker ${process.pid} received SIGINT`);
    distributionService.stop();
    process.exit(0);
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} started on port ${PORT}`);
  });
} 