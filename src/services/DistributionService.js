const AnalyzerManager = require('./AnalyzerManager');
const LogPacket = require('../models/LogPacket');

/**
 * High-throughput distribution service for log packets
 */
class DistributionService {
  constructor() {
    this.analyzerManager = new AnalyzerManager();
    this.distributionQueue = [];
    this.isProcessing = false;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.batchSize = 10; // Process multiple packets in batches
    this.processingInterval = 50; // Process every 50ms for high throughput
  }

  /**
   * Initialize analyzers with weights
   */
  initializeAnalyzers(analyzers) {
    analyzers.forEach(({ id, endpoint, weight, options }) => {
      this.analyzerManager.addAnalyzer(id, endpoint, weight, options);
    });
  }

  /**
   * Distribute a log packet to analyzers
   */
  async distributePacket(logPacket) {
    if (!(logPacket instanceof LogPacket)) {
      throw new Error('Invalid log packet');
    }

    // Add to processing queue for high throughput
    this.distributionQueue.push({
      packet: logPacket,
      timestamp: Date.now(),
      retries: 0
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return {
      packetId: logPacket.id,
      messageCount: logPacket.getMessageCount(),
      status: 'queued'
    };
  }

  /**
   * Start the processing loop
   */
  startProcessing() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processQueue();
  }

  /**
   * Process the distribution queue
   */
  async processQueue() {
    while (this.isProcessing && this.distributionQueue.length > 0) {
      const batch = this.distributionQueue.splice(0, this.batchSize);
      
      // Process batch in parallel for high throughput
      const promises = batch.map(item => this.processPacket(item));
      
      try {
        await Promise.allSettled(promises);
      } catch (error) {
        console.error('Batch processing error:', error);
      }

      // Small delay to prevent blocking
      if (this.distributionQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.processingInterval));
      }
    }

    this.isProcessing = false;
  }

  /**
   * Process a single packet
   */
  async processPacket(queueItem) {
    const { packet, retries } = queueItem;

    try {
      // Select analyzer based on weighted distribution
      const analyzer = this.analyzerManager.selectAnalyzer();
      
      // Send packet to analyzer
      await this.sendToAnalyzer(analyzer, packet);
      
      // Update statistics
      this.analyzerManager.updateDistributionStats(analyzer.id, packet.getMessageCount());
      
      console.log(`Packet ${packet.id} distributed to analyzer ${analyzer.id}`);
      
    } catch (error) {
      console.error(`Failed to distribute packet ${packet.id}:`, error);
      
      // Retry logic
      if (retries < this.maxRetries) {
        queueItem.retries++;
        queueItem.timestamp = Date.now();
        
        // Add back to queue with exponential backoff
        setTimeout(() => {
          this.distributionQueue.unshift(queueItem);
          if (!this.isProcessing) {
            this.startProcessing();
          }
        }, this.retryDelay * Math.pow(2, retries));
      } else {
        console.error(`Packet ${packet.id} failed after ${this.maxRetries} retries`);
        // Could implement dead letter queue here
      }
    }
  }

  /**
   * Send packet to analyzer
   */
  async sendToAnalyzer(analyzer, packet) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(`${analyzer.endpoint}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Packet-ID': packet.id,
          'X-Emitter-ID': packet.emitterId
        },
        body: JSON.stringify(packet.toJSON()),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Analyzer ${analyzer.id} returned status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Mark analyzer as potentially offline
      if (error.name === 'AbortError' || error.code === 'ECONNREFUSED') {
        this.analyzerManager.markAnalyzerOffline(analyzer.id);
      }
      
      throw error;
    }
  }

  /**
   * Get distribution statistics
   */
  getStats() {
    return {
      queueLength: this.distributionQueue.length,
      isProcessing: this.isProcessing,
      analyzers: this.analyzerManager.getDistributionStats(),
      totalAnalyzers: this.analyzerManager.getAllAnalyzers().length
    };
  }

  /**
   * Stop the distribution service
   */
  stop() {
    this.isProcessing = false;
    this.analyzerManager.stopHealthCheck();
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      length: this.distributionQueue.length,
      isProcessing: this.isProcessing,
      oldestItem: this.distributionQueue.length > 0 ? this.distributionQueue[0].timestamp : null
    };
  }
}

module.exports = DistributionService; 