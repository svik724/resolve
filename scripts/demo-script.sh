#!/bin/bash

# Demo script for video recording
# This script demonstrates the key features of the logs distributor

echo "🎬 Logs Distributor Demo Script"
echo "==============================="
echo ""

# Function to pause and show step
demo_step() {
    echo "📋 STEP: $1"
    echo "Command: $2"
    echo "Press Enter to continue..."
    read
    echo "🔍 Executing: $2"
    eval "$2"
    echo ""
    echo "✅ Step completed. Press Enter for next step..."
    read
    echo ""
}

# Check if system is running
echo "First, make sure the system is running:"
echo "  Local: ./scripts/start-local.sh"
echo "  Docker: ./scripts/start-docker.sh"
echo ""
read -p "Press Enter when system is running..."
echo ""

# Demo steps
demo_step "Check system health" "curl -s http://localhost:3000/health | python3 -m json.tool"

demo_step "View analyzer configuration" "curl -s http://localhost:3000/analyzers | python3 -m json.tool"

demo_step "Send a simple log packet" "curl -X POST http://localhost:3000/logs -H 'Content-Type: application/json' -d '{\"emitterId\": \"demo-service\", \"messages\": [{\"level\": \"info\", \"message\": \"Demo log message\"}]}' | python3 -m json.tool"

demo_step "Check distribution statistics (1 packet)" "curl -s http://localhost:3000/stats | python3 -m json.tool"

echo "📊 Now sending 50 packets to demonstrate weighted distribution..."
echo "This may take a moment..."
for i in {1..50}; do
    curl -s -X POST http://localhost:3000/logs \
        -H 'Content-Type: application/json' \
        -d "{\"emitterId\": \"load-test-$i\", \"messages\": [{\"level\": \"info\", \"message\": \"Load test message $i\"}]}" > /dev/null
    if [ $((i % 10)) -eq 0 ]; then
        echo "  Sent $i packets..."
    fi
done
echo "✅ Sent 50 packets!"
echo ""

demo_step "View weighted distribution results" "curl -s http://localhost:3000/stats | python3 -c '
import sys, json
data = json.load(sys.stdin)
print(\"📊 WEIGHTED DISTRIBUTION RESULTS\")
print(\"=\" * 40)
total_messages = sum(analyzer[\"totalMessages\"] for analyzer in data[\"analyzers\"].values())
print(f\"Total messages processed: {total_messages}\")
print()
print(\"Per analyzer:\")
for aid, analyzer in sorted(data[\"analyzers\"].items()):
    messages = analyzer[\"totalMessages\"]
    weight = analyzer[\"weight\"]
    actual_pct = (messages / total_messages * 100) if total_messages > 0 else 0
    expected_pct = weight * 100
    print(f\"  {aid}: {messages:2d} msgs ({actual_pct:5.1f}%) | Weight: {weight} (Expected: {expected_pct:4.1f}%)\")
'"

demo_step "Check queue status" "curl -s http://localhost:3000/queue | python3 -m json.tool"

echo "🎯 FAULT TOLERANCE DEMO"
echo "Now we'll simulate an analyzer failure..."
echo ""

demo_step "Check current analyzer health" "curl -s http://localhost:3000/analyzers | python3 -c '
import sys, json
data = json.load(sys.stdin)
print(\"Analyzer Health Status:\")
for analyzer in data[\"analyzers\"]:
    status = \"🟢 ONLINE\" if analyzer[\"isOnline\"] else \"🔴 OFFLINE\"
    print(f\"  {analyzer[\"id\"]}: {status} (weight: {analyzer[\"weight\"]})\")
'"

echo "📝 Demo completed!"
echo ""
echo "💡 Additional things to show in your video:"
echo "   - View individual analyzer health: curl http://localhost:3001/health"
echo "   - Send complex packets with metadata"
echo "   - Stop/start an analyzer to show fault tolerance"
echo "   - Show Docker container status: docker-compose ps"
echo "   - View logs: docker-compose logs -f"
echo ""
echo "🎬 Video recording tips:"
echo "   - Show both local and Docker startup"
echo "   - Demonstrate the weighted distribution with 100+ packets"
echo "   - Explain the architecture diagram from the README"
echo "   - Show the code structure briefly"
echo "   - Highlight the multithreading (multiple worker processes)" 