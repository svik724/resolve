# 🎬 Video Demo Recording Guide

## 📋 Pre-Recording Checklist

### ✅ Setup Requirements
- [ ] **Node.js 18+** installed
- [ ] **Docker Desktop** installed (free, no account needed)
- [ ] **Terminal/Command Prompt** ready
- [ ] **Screen recording software** (QuickTime, OBS, etc.)
- [ ] **Browser** open for viewing endpoints

### ✅ Project Preparation
```bash
# Clone/navigate to project
cd /path/to/logs-distributor

# Install dependencies
npm install

# Make scripts executable
chmod +x scripts/*.sh
```

---

## 🎯 Video Structure (Recommended 10-15 minutes)

### **Segment 1: Introduction (2 minutes)**
**What to show:**
- Brief overview of the system architecture
- Explain the problem: "High-throughput logs need to be distributed to analyzers proportionally"
- Show the requirements diagram/description

**Script outline:**
> "This is a high-throughput logs distributor built with Node.js Express. It receives log packets from emitters and distributes them to analyzers based on weighted routing. The system handles failures, provides health monitoring, and uses multithreading for performance."

### **Segment 2: Local Demo (4 minutes)**
```bash
# Start local demo
./scripts/start-local.sh

# Wait for services to start, then demonstrate:
```

**What to show:**
1. **Startup process** - Multiple services starting
2. **Health checks** - All analyzers online
3. **Send test packets** - Show API usage
4. **Weighted distribution** - Prove proportional routing
5. **Real-time monitoring** - Stats endpoints

### **Segment 3: Docker Demo (4 minutes)**
```bash
# Stop local services first
# Start Docker demo
./scripts/start-docker.sh

# Show Docker-specific features:
docker-compose ps
docker-compose logs -f distributor
```

**What to show:**
1. **Docker startup** - Container orchestration
2. **Service networking** - Inter-container communication
3. **Scaling demonstration** - Production-like environment
4. **Container management** - Docker commands

### **Segment 4: Technical Deep Dive (3 minutes)**
**What to show:**
1. **Code structure** - Key files and architecture
2. **Multithreading** - Cluster module implementation
3. **Fault tolerance** - Health checks and retry logic
4. **Performance** - High-throughput design

### **Segment 5: Advanced Features (2 minutes)**
**What to show:**
1. **Fault tolerance** - Stop/start an analyzer
2. **Load testing** - High volume packet sending
3. **Monitoring** - Real-time statistics
4. **Queue management** - Processing status

---

## 🎬 Step-by-Step Recording Script

### **Option A: Interactive Demo**
Use the provided demo script:
```bash
./scripts/demo-script.sh
```
This script will guide you through each step with pauses.

### **Option B: Manual Demo**
Follow these exact commands:

#### **Local Environment Demo**
```bash
# 1. Start services
./scripts/start-local.sh

# 2. Check health
curl -s http://localhost:3000/health | python3 -m json.tool

# 3. View analyzers
curl -s http://localhost:3000/analyzers | python3 -m json.tool

# 4. Send test packet
curl -X POST http://localhost:3000/logs \
  -H 'Content-Type: application/json' \
  -d '{"emitterId": "demo", "messages": [{"level": "info", "message": "Demo test"}]}'

# 5. Test weighted distribution
for i in {1..50}; do
  curl -s -X POST http://localhost:3000/logs \
    -H 'Content-Type: application/json' \
    -d "{\"emitterId\": \"test-$i\", \"messages\": [{\"level\": \"info\", \"message\": \"Test $i\"}]}" > /dev/null
done

# 6. Check distribution results
curl -s http://localhost:3000/stats | python3 -c "
import sys, json
data = json.load(sys.stdin)
total = sum(a['totalMessages'] for a in data['analyzers'].values())
print('Distribution Results:')
for aid, analyzer in sorted(data['analyzers'].items()):
    msgs = analyzer['totalMessages']
    weight = analyzer['weight']
    actual = (msgs/total*100) if total > 0 else 0
    expected = weight * 100
    print(f'  {aid}: {msgs:2d} msgs ({actual:5.1f}%) | Expected: {expected:4.1f}%')
"
```

#### **Docker Environment Demo**
```bash
# 1. Stop local services (Ctrl+C)

# 2. Start Docker services
./scripts/start-docker.sh

# 3. Show container status
docker-compose ps

# 4. View logs
docker-compose logs distributor | tail -10

# 5. Test same functionality as local
curl -s http://localhost:3000/health | python3 -m json.tool

# 6. Stop services
docker-compose down
```

---

## 💡 Video Recording Tips

### **Technical Setup**
- **Screen resolution**: 1920x1080 minimum
- **Font size**: Large enough to read in compressed video
- **Terminal theme**: High contrast (dark background, light text)
- **Multiple terminals**: Show services running in background

### **Presentation Tips**
- **Speak clearly**: Explain what you're doing and why
- **Pause between commands**: Let output be visible
- **Highlight key numbers**: Point out the weighted distribution percentages
- **Show both modes**: Demonstrate local AND Docker deployment

### **Key Points to Emphasize**
1. **Multithreading**: "Multiple worker processes handle requests in parallel"
2. **Weighted Distribution**: "A2 gets 40% of traffic, A4 gets 30%, etc."
3. **Fault Tolerance**: "System continues operating when analyzers fail"
4. **High Throughput**: "Non-blocking, queue-based processing"
5. **Production Ready**: "Docker containers, health checks, monitoring"

### **Common Gotchas**
- **Wait for startup**: Services need 5-10 seconds to fully start
- **Small sample sizes**: Need 50+ packets to see good distribution
- **Port conflicts**: Kill existing processes if ports are busy
- **Docker startup time**: Containers take longer to start than local

---

## 🚀 No Docker Account Required!

**Important for your video**: Emphasize that:
- **Docker Desktop is free** for local development
- **No Docker Hub account needed** - everything runs locally
- **Alternative option available** - Local Node.js version works perfectly

---

## 📊 Expected Demo Results

When working correctly, you should see:
- **A1 (weight 0.1)**: ~10% of messages
- **A2 (weight 0.4)**: ~40% of messages  
- **A3 (weight 0.2)**: ~20% of messages
- **A4 (weight 0.3)**: ~30% of messages

The distribution gets more accurate with higher packet counts!

---

## 🎯 Demo Success Criteria

Your video should demonstrate:
- ✅ System starts successfully in both local and Docker modes
- ✅ Health checks show all services online
- ✅ Weighted distribution works (proportional message routing)
- ✅ Real-time monitoring and statistics
- ✅ High-throughput processing (queue management)
- ✅ Professional production-ready setup

**Good luck with your video! 🎬** 