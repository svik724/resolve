const EventEmitter = require('events');

/**
 * Manages analyzer health and weighted distribution
 */
class AnalyzerManager extends EventEmitter {
  constructor() {
    super();
    this.analyzers = new Map();
    this.healthCheckInterval = 5000; // 5 seconds
    this.healthCheckTimer = null;
    this.distributionStats = new Map();
  }

  /**
   * Add an analyzer with its weight
   */
  addAnalyzer(id, endpoint, weight, options = {}) {
    const analyzer = {
      id,
      endpoint,
      weight,
      isOnline: true,
      lastHealthCheck: Date.now(),
      consecutiveFailures: 0,
      maxFailures: options.maxFailures || 3,
      healthCheckTimeout: options.healthCheckTimeout || 3000,
      ...options
    };

    this.analyzers.set(id, analyzer);
    this.distributionStats.set(id, {
      totalMessages: 0,
      lastDistribution: Date.now()
    });

    console.log(`Analyzer ${id} added with weight ${weight}`);
    this.startHealthCheck();
  }

  /**
   * Remove an analyzer
   */
  removeAnalyzer(id) {
    this.analyzers.delete(id);
    this.distributionStats.delete(id);
    console.log(`Analyzer ${id} removed`);
  }

  /**
   * Get all online analyzers with their weights
   */
  getOnlineAnalyzers() {
    const onlineAnalyzers = [];
    let totalWeight = 0;

    for (const [id, analyzer] of this.analyzers) {
      if (analyzer.isOnline) {
        onlineAnalyzers.push(analyzer);
        totalWeight += analyzer.weight;
      }
    }

    return { analyzers: onlineAnalyzers, totalWeight };
  }

  /**
   * Select an analyzer based on weighted distribution
   */
  selectAnalyzer() {
    const { analyzers, totalWeight } = this.getOnlineAnalyzers();
    
    if (analyzers.length === 0) {
      throw new Error('No online analyzers available');
    }

    if (analyzers.length === 1) {
      return analyzers[0];
    }

    // Weighted random selection
    const random = Math.random() * totalWeight;
    let cumulativeWeight = 0;

    for (const analyzer of analyzers) {
      cumulativeWeight += analyzer.weight;
      if (random <= cumulativeWeight) {
        return analyzer;
      }
    }

    // Fallback to first analyzer
    return analyzers[0];
  }

  /**
   * Mark analyzer as offline
   */
  markAnalyzerOffline(id) {
    const analyzer = this.analyzers.get(id);
    if (analyzer && analyzer.isOnline) {
      analyzer.isOnline = false;
      analyzer.consecutiveFailures++;
      console.log(`Analyzer ${id} marked as offline - (failure #${analyzer.consecutiveFailures})`);
      this.emit('analyzerOffline', id);
    }
  }

  /**
   * Mark analyzer as online
   */
  markAnalyzerOnline(id) {
    const analyzer = this.analyzers.get(id);
    if (analyzer && !analyzer.isOnline) {
      analyzer.isOnline = true;
      analyzer.consecutiveFailures = 0;
      analyzer.lastHealthCheck = Date.now();
      console.log(`Analyzer ${id} marked as online`);
      this.emit('analyzerOnline', id);
    }
  }

  /**
   * Update distribution statistics
   */
  updateDistributionStats(analyzerId, messageCount = 1) {
    const stats = this.distributionStats.get(analyzerId);
    if (stats) {
      stats.totalMessages += messageCount;
      stats.lastDistribution = Date.now();
    }
  }

  /**
   * Get distribution statistics
   */
  getDistributionStats() {
    const stats = {};
    for (const [id, analyzer] of this.analyzers) {
      const distributionStats = this.distributionStats.get(id);
      stats[id] = {
        weight: analyzer.weight,
        isOnline: analyzer.isOnline,
        totalMessages: distributionStats?.totalMessages || 0,
        lastDistribution: distributionStats?.lastDistribution || null,
        consecutiveFailures: analyzer.consecutiveFailures
      };
    }
    return stats;
  }

  /**
   * Health check for analyzers
   */
  async performHealthCheck() {
    for (const [id, analyzer] of this.analyzers) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), analyzer.healthCheckTimeout);

        const response = await fetch(`${analyzer.endpoint}/health`, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' }
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          if (!analyzer.isOnline) {
            this.markAnalyzerOnline(id);
          }
          analyzer.lastHealthCheck = Date.now();
        } else {
          this.markAnalyzerOffline(id);
        }
      } catch (error) { // if the fetch doesn't return before analyzer.healthCheckTimeout, it will throw an error
        this.markAnalyzerOffline(id);
      }
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthCheck() {
    if (this.healthCheckTimer) return;

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  /**
   * Stop health checks
   */
  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Get all analyzers info
   */
  getAllAnalyzers() {
    return Array.from(this.analyzers.values());
  }
}

module.exports = AnalyzerManager; 