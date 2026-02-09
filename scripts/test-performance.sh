#!/bin/bash

# Phase 4: Performance Testing Utility
# Tests API response times before and after caching implementation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_GATEWAY="http://localhost:8000"
USER_SERVICE="http://localhost:8001"
CONTENT_SERVICE="http://localhost:8002"
SHOP_SERVICE="http://localhost:8005"

# Test user credentials (update these)
TEST_USERNAME="testuser"
TEST_PASSWORD="testpass123"
AUTH_TOKEN=""

# Results
declare -A results

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Phase 4: Performance Testing${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to get auth token
get_auth_token() {
  echo -e "${YELLOW}Getting authentication token...${NC}"
  response=$(curl -s -X POST "$USER_SERVICE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\"}")
  
  AUTH_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
  
  if [ -n "$AUTH_TOKEN" ]; then
    echo -e "${GREEN}✓ Authentication successful${NC}"
    echo ""
  else
    echo -e "${RED}✗ Authentication failed${NC}"
    echo "Response: $response"
    exit 1
  fi
}

# Function to test endpoint performance
test_endpoint() {
  local name=$1
  local url=$2
  local iterations=${3:-10}
  local use_auth=${4:-true}
  
  echo -e "${BLUE}Testing: $name${NC}"
  echo -e "URL: $url"
  echo -e "Iterations: $iterations"
  
  local total_time=0
  local min_time=999999
  local max_time=0
  local success_count=0
  local cache_hits=0
  
  # First request (cold cache)
  echo -n "  Cold cache request... "
  if [ "$use_auth" = true ]; then
    response=$(curl -s -w "\n%{time_total}" -o /dev/null \
      -H "Authorization: Bearer $AUTH_TOKEN" "$url")
  else
    response=$(curl -s -w "\n%{time_total}" -o /dev/null "$url")
  fi
  
  cold_time=$(echo "$response" | tail -1)
  echo -e "${YELLOW}${cold_time}s${NC}"
  
  # Wait a bit
  sleep 1
  
  # Subsequent requests (warm cache)
  echo -n "  Warm cache requests... "
  for ((i=1; i<=iterations; i++)); do
    if [ "$use_auth" = true ]; then
      time=$(curl -s -w "%{time_total}" -o /dev/null \
        -H "Authorization: Bearer $AUTH_TOKEN" "$url")
    else
      time=$(curl -s -w "%{time_total}" -o /dev/null "$url")
    fi
    
    # Convert to milliseconds
    time_ms=$(echo "$time * 1000" | bc)
    total_time=$(echo "$total_time + $time_ms" | bc)
    
    # Track min/max
    if (( $(echo "$time_ms < $min_time" | bc -l) )); then
      min_time=$time_ms
    fi
    if (( $(echo "$time_ms > $max_time" | bc -l) )); then
      max_time=$time_ms
    fi
    
    success_count=$((success_count + 1))
    
    echo -n "."
  done
  
  echo ""
  
  # Calculate average
  avg_time=$(echo "scale=2; $total_time / $iterations" | bc)
  
  # Display results
  echo -e "  ${GREEN}✓ Completed${NC}"
  echo -e "    Cold cache:  ${YELLOW}$(echo "$cold_time * 1000" | bc | cut -d. -f1)ms${NC}"
  echo -e "    Avg (warm):  ${GREEN}${avg_time}ms${NC}"
  echo -e "    Min:         ${GREEN}${min_time}ms${NC}"
  echo -e "    Max:         ${YELLOW}${max_time}ms${NC}"
  echo -e "    Success:     ${success_count}/${iterations}"
  
  # Calculate improvement
  cold_ms=$(echo "$cold_time * 1000" | bc)
  improvement=$(echo "scale=1; (($cold_ms - $avg_time) / $cold_ms) * 100" | bc)
  echo -e "    Improvement: ${GREEN}${improvement}%${NC} (cold vs warm)"
  echo ""
  
  # Store results
  results["$name"]="$avg_time"
}

# Function to test database query performance
test_database_queries() {
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}Database Query Performance${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
  
  # Test user lookup by username (should use idx_users_username)
  echo -e "${YELLOW}Testing: User lookup by username${NC}"
  docker exec postgres psql -U postgres -d users -c "EXPLAIN ANALYZE SELECT * FROM \"Users\" WHERE username = '$TEST_USERNAME';" | grep "Execution Time"
  echo ""
  
  # Test posts by author (should use idx_posts_author_id)
  echo -e "${YELLOW}Testing: Posts by author${NC}"
  docker exec postgres psql -U postgres -d content -c "EXPLAIN ANALYZE SELECT * FROM \"Posts\" WHERE \"authorId\" IS NOT NULL LIMIT 10;" | grep "Execution Time"
  echo ""
  
  # Test comments by post (should use idx_comments_post_id)
  echo -e "${YELLOW}Testing: Comments by post${NC}"
  docker exec postgres psql -U postgres -d content -c "EXPLAIN ANALYZE SELECT * FROM \"Comments\" WHERE \"postId\" IS NOT NULL LIMIT 10;" | grep "Execution Time"
  echo ""
}

# Function to test cache hit rate
test_cache_hit_rate() {
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}Redis Cache Hit Rate${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
  
  # Get Redis stats
  stats=$(docker exec redis redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses")
  
  hits=$(echo "$stats" | grep "keyspace_hits" | cut -d: -f2 | tr -d '\r')
  misses=$(echo "$stats" | grep "keyspace_misses" | cut -d: -f2 | tr -d '\r')
  
  if [ -n "$hits" ] && [ -n "$misses" ]; then
    total=$((hits + misses))
    if [ $total -gt 0 ]; then
      hit_rate=$(echo "scale=2; ($hits / $total) * 100" | bc)
      echo -e "  Cache Hits:       ${GREEN}$hits${NC}"
      echo -e "  Cache Misses:     ${YELLOW}$misses${NC}"
      echo -e "  Total Requests:   $total"
      echo -e "  Hit Rate:         ${GREEN}${hit_rate}%${NC}"
    else
      echo -e "${YELLOW}  No cache activity yet${NC}"
    fi
  else
    echo -e "${RED}  Could not retrieve cache stats${NC}"
  fi
  
  echo ""
  
  # Show cached keys
  key_count=$(docker exec redis redis-cli DBSIZE | grep -oE '[0-9]+')
  echo -e "  Cached Keys:      ${GREEN}$key_count${NC}"
  
  # Show memory usage
  memory=$(docker exec redis redis-cli INFO memory | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
  echo -e "  Memory Used:      ${BLUE}$memory${NC}"
  
  echo ""
}

# Main test execution
main() {
  # Get authentication token
  get_auth_token
  
  # Test API endpoints
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}API Endpoint Performance${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
  
  # User Service
  test_endpoint "User Profile" "$USER_SERVICE/users/1" 10 true
  test_endpoint "User Search" "$USER_SERVICE/users?q=test" 10 true
  
  # Content Service
  test_endpoint "Post Feed" "$CONTENT_SERVICE/posts?limit=20" 10 true
  test_endpoint "Post Details" "$CONTENT_SERVICE/posts/1" 10 true
  test_endpoint "Post Comments" "$CONTENT_SERVICE/posts/1/comments" 10 true
  test_endpoint "Wiki Pages" "$CONTENT_SERVICE/pages" 10 false
  test_endpoint "Videos" "$CONTENT_SERVICE/videos" 10 false
  
  # Shop Service
  test_endpoint "Product List" "$SHOP_SERVICE/products?limit=20" 10 false
  test_endpoint "Product Details" "$SHOP_SERVICE/products/1" 10 false
  test_endpoint "Product Reviews" "$SHOP_SERVICE/products/1/reviews" 10 false
  
  # Test cache hit rate
  test_cache_hit_rate
  
  # Test database queries
  if command -v docker &> /dev/null; then
    test_database_queries
  fi
  
  # Summary
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}Performance Summary${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
  
  echo -e "Endpoint Performance (Average Response Time):"
  for endpoint in "${!results[@]}"; do
    time=${results[$endpoint]}
    if (( $(echo "$time < 100" | bc -l) )); then
      color=$GREEN
    elif (( $(echo "$time < 300" | bc -l) )); then
      color=$YELLOW
    else
      color=$RED
    fi
    printf "  %-30s ${color}%6.2fms${NC}\n" "$endpoint" "$time"
  done
  
  echo ""
  echo -e "${GREEN}✓ Performance testing complete${NC}"
  echo ""
  echo -e "${BLUE}Recommendations:${NC}"
  echo -e "  - Response times < 100ms:  ${GREEN}Excellent${NC}"
  echo -e "  - Response times 100-300ms: ${YELLOW}Good${NC}"
  echo -e "  - Response times > 300ms:  ${RED}Needs optimization${NC}"
  echo -e "  - Cache hit rate > 80%:    ${GREEN}Excellent${NC}"
  echo -e "  - Cache hit rate 60-80%:   ${YELLOW}Good${NC}"
  echo -e "  - Cache hit rate < 60%:    ${RED}Needs tuning${NC}"
  echo ""
}

# Run main function
main
