#!/bin/bash

echo "🚀 Starting Logs Distributor Demo (Local Mode)..."

# Kill any existing processes on our ports
echo "🧹 Cleaning up any existing processes..."
lsof -ti:3000,3001,3002,3003,3004 | xargs kill -9 2>/dev/null || true

# Start the mock analyzers in the background
echo "🔬 Starting mock analyzers..."
node mock-analyzers/analyzer1.js &
ANALYZER1_PID=$!
echo "   ✅ Analyzer A1 started (PID: $ANALYZER1_PID)"

node mock-analyzers/analyzer2.js &
ANALYZER2_PID=$!
echo "   ✅ Analyzer A2 started (PID: $ANALYZER2_PID)"

node mock-analyzers/analyzer3.js &
ANALYZER3_PID=$!
echo "   ✅ Analyzer A3 started (PID: $ANALYZER3_PID)"

node mock-analyzers/analyzer4.js &
ANALYZER4_PID=$!
echo "   ✅ Analyzer A4 started (PID: $ANALYZER4_PID)"

# Wait a moment for analyzers to start
sleep 3

# Update analyzer endpoints for local mode
echo "🔧 Configuring for local mode..."

# Start the main distributor
echo "🌟 Starting main distributor..."
node server.js &
DISTRIBUTOR_PID=$!

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Check if services are running
echo "🔍 Checking service health..."
curl -f http://localhost:3000/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Distributor is running on http://localhost:3000"
else
    echo "❌ Distributor failed to start"
    exit 1
fi

# Check analyzers
for port in 3001 3002 3003 3004; do
    curl -f http://localhost:$port/health > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Analyzer on port $port is running"
    else
        echo "❌ Analyzer on port $port failed to start"
    fi
done

echo ""
echo "🎉 Demo is ready!"
echo ""
echo "📊 Available endpoints:"
echo "   - Distributor: http://localhost:3000"
echo "   - Health check: http://localhost:3000/health"
echo "   - Statistics: http://localhost:3000/stats"
echo "   - Queue status: http://localhost:3000/queue"
echo "   - Analyzer status: http://localhost:3000/analyzers"
echo ""
echo "🧪 To test the system:"
echo "   curl -X POST http://localhost:3000/logs \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"emitterId\": \"test\", \"messages\": [{\"level\": \"info\", \"message\": \"test\"}]}'"
echo ""
echo "🛑 To stop the demo, press Ctrl+C or run:"
echo "   kill $DISTRIBUTOR_PID $ANALYZER1_PID $ANALYZER2_PID $ANALYZER3_PID $ANALYZER4_PID"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $DISTRIBUTOR_PID $ANALYZER1_PID $ANALYZER2_PID $ANALYZER3_PID $ANALYZER4_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup SIGINT

# Keep script running
echo "📱 Press Ctrl+C to stop all services"
wait 