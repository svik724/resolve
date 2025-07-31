#!/bin/bash

echo "🚀 Starting Logs Distributor Demo..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build and start the services
echo "🐳 Starting services with Docker Compose..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

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
echo "📈 To run load test:"
echo "   npm run load-test"
echo ""
echo "🛑 To stop the demo:"
echo "   docker-compose down" 