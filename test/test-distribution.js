const DistributionService = require('../src/services/DistributionService');
const LogPacket = require('../src/models/LogPacket');
const LogMessage = require('../src/models/LogMessage');

describe('Distribution Service Tests', () => {
  let distributionService;

  beforeEach(() => {
    distributionService = new DistributionService();
    
    // Initialize test analyzers
    distributionService.initializeAnalyzers([
      { id: 'A1', endpoint: 'http://localhost:3001', weight: 0.1 },
      { id: 'A2', endpoint: 'http://localhost:3002', weight: 0.4 },
      { id: 'A3', endpoint: 'http://localhost:3003', weight: 0.2 },
      { id: 'A4', endpoint: 'http://localhost:3004', weight: 0.3 }
    ]);
  });

  test('should initialize analyzers correctly', () => {
    const analyzers = distributionService.analyzerManager.getAllAnalyzers();
    expect(analyzers).toHaveLength(4);
    
    const weights = analyzers.map(a => a.weight);
    expect(weights).toEqual([0.1, 0.4, 0.2, 0.3]);
  });

  test('should create log packet correctly', () => {
    const messages = [
      new LogMessage(new Date(), 'info', 'Test message 1', 'test-service'),
      new LogMessage(new Date(), 'error', 'Test message 2', 'test-service')
    ];

    const packet = new LogPacket('test-emitter', messages);
    
    expect(packet.emitterId).toBe('test-emitter');
    expect(packet.getMessageCount()).toBe(2);
    expect(packet.messages).toHaveLength(2);
  });

  test('should select analyzer based on weights', () => {
    const selections = {};
    const iterations = 10000;

    for (let i = 0; i < iterations; i++) {
      const analyzer = distributionService.analyzerManager.selectAnalyzer();
      selections[analyzer.id] = (selections[analyzer.id] || 0) + 1;
    }

    // Check that distribution roughly matches weights
    const total = iterations;
    const tolerance = 0.05; // 5% tolerance

    expect(selections.A1 / total).toBeCloseTo(0.1, 1);
    expect(selections.A2 / total).toBeCloseTo(0.4, 1);
    expect(selections.A3 / total).toBeCloseTo(0.2, 1);
    expect(selections.A4 / total).toBeCloseTo(0.3, 1);
  });

  test('should handle analyzer failures', () => {
    const analyzer = distributionService.analyzerManager.analyzers.get('A1');
    expect(analyzer.isOnline).toBe(true);

    distributionService.analyzerManager.markAnalyzerOffline('A1');
    expect(analyzer.isOnline).toBe(false);
    expect(analyzer.consecutiveFailures).toBe(1);
  });

  test('should recover analyzer after going offline', () => {
    distributionService.analyzerManager.markAnalyzerOffline('A1');
    expect(distributionService.analyzerManager.analyzers.get('A1').isOnline).toBe(false);

    distributionService.analyzerManager.markAnalyzerOnline('A1');
    expect(distributionService.analyzerManager.analyzers.get('A1').isOnline).toBe(true);
    expect(distributionService.analyzerManager.analyzers.get('A1').consecutiveFailures).toBe(0);
  });

  test('should get distribution statistics', () => {
    const stats = distributionService.getStats();
    
    expect(stats).toHaveProperty('queueLength');
    expect(stats).toHaveProperty('isProcessing');
    expect(stats).toHaveProperty('analyzers');
    expect(stats).toHaveProperty('totalAnalyzers');
    expect(stats.totalAnalyzers).toBe(4);
  });
}); 