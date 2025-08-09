#!/bin/bash

echo "🐳 Starting Logs Distributor Demo (Docker Mode)..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    echo ""
    echo "💡 To install Docker:"
    echo "   - Download Docker Desktop from: https://www.docker.com/products/docker-desktop"
    echo "   - No account required for local development"
    echo "   - Or use the local version: ./scripts/start-local.sh"
    exit 1
fi

echo "✅ Docker is running"

# Clean up any existing containers
echo "🧹 Cleaning up existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Remove any existing images (optional, for clean rebuild)
if [ "$1" = "--clean" ]; then
    echo "🗑️  Removing existing images for clean rebuild..."
    docker-compose down --rmi local 2>/dev/null || true
    docker system prune -f 2>/dev/null || true
fi

# Build and start the services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Check if services are running
echo "🔍 Checking service health..."

# Check distributor
max_attempts=10
attempt=1
while [ $attempt -le $max_attempts ]; do
    if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ Distributor is running on http://localhost:3000"
        break
    else
        echo "   ⏳ Attempt $attempt/$max_attempts - Waiting for distributor..."
        sleep 2
        ((attempt++))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Distributor failed to start after $max_attempts attempts"
    echo "🔍 Checking logs:"
    docker-compose logs distributor
    exit 1
fi

# Check analyzers
echo "🔬 Checking analyzers..."
for port in 3001 3002 3003 3004; do
    if curl -f -s http://localhost:$port/health > /dev/null 2>&1; then
        analyzer_id=$(curl -s http://localhost:$port/health | grep -o '"analyzer":"[^"]*"' | cut -d'"' -f4)
        echo "   ✅ Analyzer $analyzer_id running on port $port"
    else
        echo "   ❌ Analyzer on port $port failed to start"
    fi
done

# Get analyzer status from distributor
echo "📊 Checking analyzer registration..."
curl -s http://localhost:3000/analyzers | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('Registered analyzers:')
    for analyzer in data['analyzers']:
        status = '🟢' if analyzer['isOnline'] else '🔴'
        print(f'  {status} {analyzer[\"id\"]}: weight={analyzer[\"weight\"]}, online={analyzer[\"isOnline\"]}')
except:
    print('Could not parse analyzer status')
" 2>/dev/null || echo "   ⚠️  Could not get analyzer status (this is normal on first startup)"

echo ""
echo "🎉 Docker demo is ready!"
echo ""
echo "📊 Available endpoints:"
echo "   - Distributor: http://localhost:3000"
echo "   - Health check: http://localhost:3000/health"
echo "   - Statistics: http://localhost:3000/stats"
echo "   - Queue status: http://localhost:3000/queue"
echo "   - Analyzer status: http://localhost:3000/analyzers"
echo ""
echo "🧪 Quick test:"
echo "   curl -X POST http://localhost:3000/logs \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"emitterId\": \"docker-test\", \"messages\": [{\"level\": \"info\", \"message\": \"Docker test\"}]}'"
echo ""
echo "📈 Test weighted distribution:"
echo "   for i in {1..20}; do"
echo "     curl -s -X POST http://localhost:3000/logs \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d \"{\\\"emitterId\\\": \\\"test-\$i\\\", \\\"messages\\\": [{\\\"level\\\": \\\"info\\\", \\\"message\\\": \\\"Test \$i\\\"}]}\" > /dev/null"
echo "   done"
echo "   curl -s http://localhost:3000/stats | python3 -m json.tool"
echo ""
echo "📋 Docker commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop services: docker-compose down"
echo "   - Restart: docker-compose restart"
echo "   - Clean rebuild: ./scripts/start-docker.sh --clean"
echo ""
echo "💡 For local development without Docker: ./scripts/start-local.sh" 