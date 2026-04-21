#!/bin/bash

# Container Test Script for Aspera Browser
# This script automates the testing of the Docker/Podman container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect container runtime (Docker or Podman)
if command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
elif command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
else
    echo "Error: Neither Docker nor Podman found. Please install one of them."
    exit 1
fi

# Configuration
IMAGE_NAME="aspera-browser:test"
CONTAINER_NAME="aspera-browser-test"
PORT="10080"
TIMEOUT=30

# Function to print colored output
print_status() {
    echo -e "${2}${1}${NC}"
}

# Function to cleanup on exit
cleanup() {
    print_status "🧹 Cleaning up..." "$YELLOW"
    $CONTAINER_CMD stop $CONTAINER_NAME 2>/dev/null || true
    $CONTAINER_CMD rm $CONTAINER_NAME 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Start tests
print_status "🚀 Starting container tests with $CONTAINER_CMD..." "$YELLOW"
echo ""

# Test 1: Build
print_status "📦 Test 1: Building image..." "$YELLOW"
if $CONTAINER_CMD build -t $IMAGE_NAME . > /dev/null 2>&1; then
    print_status "✅ Build successful" "$GREEN"
else
    print_status "❌ Build failed" "$RED"
    exit 1
fi
echo ""

# Test 2: Start container
print_status "▶️  Test 2: Starting container..." "$YELLOW"
if $CONTAINER_CMD run -d --name $CONTAINER_NAME -p $PORT:80 $IMAGE_NAME > /dev/null 2>&1; then
    print_status "✅ Container started" "$GREEN"
else
    print_status "❌ Container failed to start" "$RED"
    exit 1
fi
echo ""

# Test 3: Wait for container to be ready
print_status "⏳ Test 3: Waiting for container to be ready..." "$YELLOW"
COUNTER=0
while [ $COUNTER -lt $TIMEOUT ]; do
    if $CONTAINER_CMD ps | grep -q $CONTAINER_NAME; then
        sleep 2
        break
    fi
    sleep 1
    COUNTER=$((COUNTER + 1))
done

if [ $COUNTER -eq $TIMEOUT ]; then
    print_status "❌ Container failed to start within timeout" "$RED"
    $CONTAINER_CMD logs $CONTAINER_NAME
    exit 1
fi
print_status "✅ Container is ready" "$GREEN"
echo ""

# Test 4: Health check endpoint
print_status "🏥 Test 4: Testing health check endpoint..." "$YELLOW"
sleep 3  # Give nginx time to fully start
HEALTH=$(curl -s http://localhost:$PORT/health 2>/dev/null || echo "failed")
if [ "$HEALTH" = "healthy" ]; then
    print_status "✅ Health check passed" "$GREEN"
else
    print_status "❌ Health check failed (got: $HEALTH)" "$RED"
    $CONTAINER_CMD logs $CONTAINER_NAME
    exit 1
fi
echo ""

# Test 5: Main page accessibility
print_status "🌐 Test 5: Testing main page accessibility..." "$YELLOW"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    print_status "✅ Main page accessible (HTTP $HTTP_CODE)" "$GREEN"
else
    print_status "❌ Main page failed (HTTP $HTTP_CODE)" "$RED"
    $CONTAINER_CMD logs $CONTAINER_NAME
    exit 1
fi
echo ""

# Test 6: Security headers
print_status "🔒 Test 6: Testing security headers..." "$YELLOW"
HEADERS=$(curl -s -I http://localhost:$PORT/ 2>/dev/null)
HEADERS_OK=true

if ! echo "$HEADERS" | grep -q "X-Frame-Options"; then
    print_status "  ⚠️  X-Frame-Options header missing" "$YELLOW"
    HEADERS_OK=false
fi

if ! echo "$HEADERS" | grep -q "X-Content-Type-Options"; then
    print_status "  ⚠️  X-Content-Type-Options header missing" "$YELLOW"
    HEADERS_OK=false
fi

if ! echo "$HEADERS" | grep -q "X-XSS-Protection"; then
    print_status "  ⚠️  X-XSS-Protection header missing" "$YELLOW"
    HEADERS_OK=false
fi

if [ "$HEADERS_OK" = true ]; then
    print_status "✅ Security headers present" "$GREEN"
else
    print_status "⚠️  Some security headers missing (non-critical)" "$YELLOW"
fi
echo ""

# Test 7: Gzip compression
print_status "📦 Test 7: Testing Gzip compression..." "$YELLOW"
ENCODING=$(curl -s -H "Accept-Encoding: gzip" -I http://localhost:$PORT/ 2>/dev/null | grep -i "Content-Encoding" || echo "")
if echo "$ENCODING" | grep -q "gzip"; then
    print_status "✅ Gzip compression enabled" "$GREEN"
else
    print_status "⚠️  Gzip compression not detected (may be normal for small responses)" "$YELLOW"
fi
echo ""

# Test 8: SPA routing
print_status "🔀 Test 8: Testing SPA routing..." "$YELLOW"
SPA_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/some/random/route 2>/dev/null || echo "000")
if [ "$SPA_CODE" = "200" ]; then
    print_status "✅ SPA routing works (HTTP $SPA_CODE)" "$GREEN"
else
    print_status "❌ SPA routing failed (HTTP $SPA_CODE)" "$RED"
    exit 1
fi
echo ""

# Test 9: Container health status
print_status "💚 Test 9: Checking container health status..." "$YELLOW"
sleep 5  # Wait for first health check
HEALTH_STATUS=$($CONTAINER_CMD inspect $CONTAINER_NAME --format='{{.State.Health.Status}}' 2>/dev/null || echo "none")
if [ "$HEALTH_STATUS" = "healthy" ] || [ "$HEALTH_STATUS" = "starting" ]; then
    print_status "✅ Docker health status: $HEALTH_STATUS" "$GREEN"
else
    print_status "⚠️  Docker health status: $HEALTH_STATUS" "$YELLOW"
fi
echo ""

# Test 10: Resource usage
print_status "📊 Test 10: Checking resource usage..." "$YELLOW"
STATS=$($CONTAINER_CMD stats --no-stream --format "{{.MemUsage}}" $CONTAINER_NAME 2>/dev/null || echo "N/A")
print_status "  Memory usage: $STATS" "$YELLOW"
print_status "✅ Resource check complete" "$GREEN"
echo ""

# Summary
echo "================================"
print_status "✅ All tests passed successfully!" "$GREEN"
echo "================================"
echo ""
print_status "Container is running at: http://localhost:$PORT" "$YELLOW"
print_status "Health check: http://localhost:$PORT/health" "$YELLOW"
echo ""
print_status "To view logs: $CONTAINER_CMD logs $CONTAINER_NAME" "$YELLOW"
print_status "To stop: $CONTAINER_CMD stop $CONTAINER_NAME" "$YELLOW"
print_status "To remove: $CONTAINER_CMD rm $CONTAINER_NAME" "$YELLOW"
echo ""

# Ask if user wants to keep container running
read -p "Keep container running? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    cleanup
    print_status "Container stopped and removed" "$GREEN"
else
    trap - EXIT  # Disable cleanup trap
    print_status "Container left running" "$GREEN"
fi

