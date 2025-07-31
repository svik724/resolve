const express = require('express');
const app = express();

const PORT = 3004;
const ANALYZER_ID = 'A4';

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    analyzer: ANALYZER_ID,
    timestamp: new Date().toISOString()
  });
});

// Log processing endpoint
app.post('/logs', (req, res) => {
  const { id, emitterId, messages, metadata } = req.body;
  
  console.log(`[${ANALYZER_ID}] Received packet ${id} from ${emitterId} with ${messages.length} messages`);
  
  // Simulate processing time
  setTimeout(() => {
    console.log(`[${ANALYZER_ID}] Processed packet ${id}`);
  }, Math.random() * 100);

  res.json({
    success: true,
    analyzer: ANALYZER_ID,
    packetId: id,
    processedAt: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Mock Analyzer ${ANALYZER_ID} running on port ${PORT}`);
}); 