#!/bin/bash
#
# Milonexa Health Check Verification Script
# Phase 0: Validates all services have proper health endpoints
#
# Usage: ./scripts/verify-health-checks.sh
# Or set API_GATEWAY_URL: API_GATEWAY_URL=http://your-api.com ./scripts/verify-health-checks.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_GATEWAY_URL="${API_GATEWAY_URL:-http://localhost:8000}"
TIMEOUT="${TIMEOUT:-5}"

# Track results
PASSED=0
FAILED=0
WARNING=0

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Milonexa Health Check Verification${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "API Gateway: ${BLUE}${API_GATEWAY_URL}${NC}\n"

# Function to check endpoint
check_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_status=${3:-200}
    
    echo -n "Checking ${name}... "
    
    response=$(curl -s -w "\n%{http_code}" \
        --connect-timeout "$TIMEOUT" \
        --max-time "$TIMEOUT" \
        "${API_GATEWAY_URL}${endpoint}" 2>/dev/null || echo "connection_error")
    
    status=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status" = "connection_error" ] || [ -z "$status" ]; then
        echo -e "${RED}✗ FAILED${NC} (connection error)"
        FAILED=$((FAILED + 1))
        return 1
    fi
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $status)"
        PASSED=$((PASSED + 1))
        
        # Display response body if available (truncated)
        if [ -n "$body" ]; then
            echo "  Response: $(echo "$body" | head -c 80)..."
        fi
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $status, expected $expected_status)"
        FAILED=$((FAILED + 1))
        if [ -n "$body" ]; then
            echo "  Response: $(echo "$body" | head -c 80)..."
        fi
        return 1
    fi
}

echo -e "${YELLOW}Core Health Endpoints:${NC}"
check_endpoint "API Gateway /health" "/health" 200
check_endpoint "API Gateway /health/ready" "/health/ready" 200

echo -e "\n${YELLOW}Service Health Endpoints (via API Gateway):${NC}"
check_endpoint "User Service" "/api/user/health" 200
check_endpoint "User Service Ready" "/api/user/health/ready" 200

check_endpoint "Content Service" "/api/content/health" 200
check_endpoint "Messaging Service" "/api/messaging/health" 200
check_endpoint "Media Service" "/api/media/health" 200
check_endpoint "Collaboration Service" "/api/collaboration/health" 200
check_endpoint "Shop Service" "/api/shop/health" 200
check_endpoint "Streaming Service" "/api/streaming/health" 200
check_endpoint "AI Service" "/api/ai/health" 200

echo -e "\n${YELLOW}Gateway Features:${NC}"
check_endpoint "Swagger Documentation" "/api-docs" 200 || true
check_endpoint "Health Status" "/health-status" 200 || true

# Summary
echo -e "\n${BLUE}================================${NC}"
echo -e "${BLUE}Summary:${NC}"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: ${FAILED}${NC}"
else
    echo -e "${YELLOW}Failed: ${FAILED}${NC}"
fi
echo -e "${BLUE}================================${NC}\n"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All health checks passed!${NC}\n"
    exit 0
else
    echo -e "${RED}✗ Some health checks failed. Please investigate.${NC}\n"
    exit 1
fi
