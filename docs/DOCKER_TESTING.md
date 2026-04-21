# Docker Container Testing Guide

This guide explains how to test the Aspera Browser Docker container.

## Prerequisites

- Docker installed (version 20.10+) **OR** Podman (version 3.0+)
- Docker Compose / Podman Compose installed (version 2.0+)
- Port 8080 available on your machine

**Note for Podman users:** Podman is fully compatible with Docker commands. Simply replace `docker` with `podman` and `docker-compose` with `podman-compose` in all commands below. Podman doesn't show the legacy builder deprecation warning.

## 1. Build Tests

### Test Docker Build

```bash
# Build the Docker image with buildx/BuildKit
docker buildx build --load -t aspera-browser:test .

# Verify the image was created
docker images | grep aspera-browser
```

**Note:** If `docker buildx` is not available, install or enable the Docker buildx component first:
<https://docs.docker.com/go/buildx/>

```

### Test Multi-Stage Build

```bash
# Build with no cache to see all steps
docker buildx build --load --no-cache -t aspera-browser:test .

# Check image size (should be ~50-100MB)
docker images aspera-browser:test --format "{{.Size}}"
```

## 2. Startup Tests

### Start with Docker

```bash
# Start the container
docker run -d \
  --name aspera-browser-test \
  -p 8080:80 \
  aspera-browser:test

# Verify the container is running
docker ps | grep aspera-browser-test

# View logs
docker logs aspera-browser-test

# Follow logs in real-time
docker logs -f aspera-browser-test
```

### Start with Docker Compose

```bash
# Start with docker-compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f aspera-browser
```

## 3. Functional Tests

### Test Health Check

```bash
# Manual test of health endpoint
curl http://localhost:8080/health

# Should return: "healthy"

# Check Docker healthcheck status
docker inspect aspera-browser-test --format='{{.State.Health.Status}}'

# With docker-compose
docker-compose ps
# The "Status" column should display "healthy"
```

### Test Web Application

```bash
# Test main page
curl -I http://localhost:8080/

# Should return HTTP 200

# Test with wget
wget --spider http://localhost:8080/

# Open in browser
open http://localhost:8080  # macOS
xdg-open http://localhost:8080  # Linux
start http://localhost:8080  # Windows
```

### Test Security Headers

```bash
# Check security headers
curl -I http://localhost:8080/ | grep -E "X-Frame-Options|X-Content-Type-Options|X-XSS-Protection"

# Should display:
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
```

### Test Gzip Compression

```bash
# Verify gzip is enabled
curl -H "Accept-Encoding: gzip" -I http://localhost:8080/ | grep "Content-Encoding"

# Should display: Content-Encoding: gzip
```

### Test SPA Routing

```bash
# Test a non-existent route (should return index.html)
curl -I http://localhost:8080/some/random/route

# Should return HTTP 200 (not 404)
```

## 4. Performance Tests

### Basic Load Test

```bash
# Install Apache Bench if needed
# macOS: brew install httpd
# Ubuntu: sudo apt-get install apache2-utils

# Test with 1000 requests, 10 concurrent connections
ab -n 1000 -c 10 http://localhost:8080/

# Test health endpoint
ab -n 10000 -c 100 http://localhost:8080/health
```

### Memory and CPU Test

```bash
# Monitor resource usage
docker stats aspera-browser-test

# With docker-compose
docker-compose stats

# Limit resources (optional)
docker run -d \
  --name aspera-browser-test \
  --memory="256m" \
  --cpus="0.5" \
  -p 8080:80 \
  aspera-browser:test
```

## 5. Log Tests

### Check Nginx Logs

```bash
# Access the container
docker exec -it aspera-browser-test sh

# Inside the container, check nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Exit the container
exit
```

### Test Access Logs

```bash
# Generate traffic
for i in {1..10}; do curl -s http://localhost:8080/ > /dev/null; done

# View logs
docker logs aspera-browser-test
```

## 6. Static File Tests

### Check Container Contents

```bash
# List files in the container
docker exec aspera-browser-test ls -la /usr/share/nginx/html/

# Verify index.html exists
docker exec aspera-browser-test cat /usr/share/nginx/html/index.html

# Check assets
docker exec aspera-browser-test ls -la /usr/share/nginx/html/assets/
```

### Test Asset Caching

```bash
# Check cache headers for assets
curl -I http://localhost:8080/assets/index.js | grep "Cache-Control"

# Should display: Cache-Control: public, immutable
```

## 7. Restart and Resilience Tests

### Test Restart

```bash
# Restart the container
docker restart aspera-browser-test

# Verify it restarts correctly
docker ps | grep aspera-browser-test

# With docker-compose
docker-compose restart
```

### Test Crash Recovery

```bash
# Stop nginx in the container (simulates a crash)
docker exec aspera-browser-test pkill nginx

# Verify the container restarts automatically (if restart policy is configured)
docker ps -a | grep aspera-browser-test
```

## 8. Cleanup Tests

### Stop and Remove

```bash
# Stop the container
docker stop aspera-browser-test

# Remove the container
docker rm aspera-browser-test

# With docker-compose
docker-compose down

# Also remove volumes (if applicable)
docker-compose down -v

# Remove the image
docker rmi aspera-browser:test
```

## 9. Automated Test Script

Create a `test-container.sh` script to automate tests:

```bash
#!/bin/bash

echo "🚀 Starting Docker container tests..."

# Build
echo "📦 Building image..."
docker buildx build --load -t aspera-browser:test . || exit 1

# Start
echo "▶️  Starting container..."
docker run -d --name aspera-browser-test -p 8080:80 aspera-browser:test || exit 1

# Wait for container to be ready
echo "⏳ Waiting for startup..."
sleep 5

# Test health check
echo "🏥 Testing health check..."
HEALTH=$(curl -s http://localhost:8080/health)
if [ "$HEALTH" != "healthy" ]; then
    echo "❌ Health check failed"
    docker logs aspera-browser-test
    docker stop aspera-browser-test
    docker rm aspera-browser-test
    exit 1
fi
echo "✅ Health check OK"

# Test main page
echo "🌐 Testing main page..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/)
if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ Main page failed (HTTP $HTTP_CODE)"
    docker stop aspera-browser-test
    docker rm aspera-browser-test
    exit 1
fi
echo "✅ Main page OK"

# Test security headers
echo "🔒 Testing security headers..."
HEADERS=$(curl -s -I http://localhost:8080/)
if ! echo "$HEADERS" | grep -q "X-Frame-Options"; then
    echo "❌ Security headers missing"
    docker stop aspera-browser-test
    docker rm aspera-browser-test
    exit 1
fi
echo "✅ Security headers OK"

# Cleanup
echo "🧹 Cleaning up..."
docker stop aspera-browser-test
docker rm aspera-browser-test

echo "✅ All tests passed successfully!"
```

## 10. Docker Compose Tests

### Complete Test with Docker Compose

```bash
# Build and start
docker compose up -d --build

# Wait for service to be healthy
timeout 60 bash -c 'until docker compose ps | grep -q "healthy"; do sleep 2; done'

# Tests
curl http://localhost:8080/health
curl -I http://localhost:8080/

# Stop
docker compose down
```

## Test Checklist

- [ ] Image builds without errors
- [ ] Container starts correctly
- [ ] Health check returns "healthy"
- [ ] Main page is accessible (HTTP 200)
- [ ] Security headers are present
- [ ] Gzip compression works
- [ ] SPA routing works (no 404s)
- [ ] Static assets are served with proper cache
- [ ] Logs are accessible
- [ ] Container restarts correctly
- [ ] Resources (CPU/RAM) are reasonable

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs aspera-browser-test

# Verify nginx configuration
docker exec aspera-browser-test nginx -t
```

### Port Already in Use

```bash
# Find which process is using port 8080
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# Use a different port
docker run -d --name aspera-browser-test -p 8081:80 aspera-browser:test
```

### Health Check Fails

```bash
# Check if wget is available in the container
docker exec aspera-browser-test which wget

# Manually test health check
docker exec aspera-browser-test wget --quiet --tries=1 --spider http://localhost/health
```

## Quick Start

To quickly test the container:

**With Docker:**

```bash
# Build and run
docker buildx build --load -t aspera-browser:test . && \
docker run -d --name aspera-browser-test -p 8080:80 aspera-browser:test

# Wait a few seconds
sleep 5

# Test
curl http://localhost:8080/health
open http://localhost:8080

# Cleanup when done
docker stop aspera-browser-test && docker rm aspera-browser-test
```

**With Podman:**

```bash
# Build and run
podman build -t aspera-browser:test . && \
podman run -d --name aspera-browser-test -p 8080:80 aspera-browser:test

# Wait a few seconds
sleep 5

# Test
curl http://localhost:8080/health
open http://localhost:8080

# Cleanup when done
podman stop aspera-browser-test && podman rm aspera-browser-test
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
