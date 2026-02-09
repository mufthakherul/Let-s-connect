#!/bin/bash

# Phase 4: Redis Cache Monitor
# Real-time monitoring of Redis cache performance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
REFRESH_INTERVAL=2  # seconds

# Function to clear screen
clear_screen() {
  clear
}

# Function to get Redis info
get_redis_info() {
  docker exec redis redis-cli INFO "$1" 2>/dev/null || echo "ERROR"
}

# Function to get specific stat
get_stat() {
  local info=$1
  local key=$2
  echo "$info" | grep "^$key:" | cut -d: -f2 | tr -d '\r'
}

# Function to format bytes
format_bytes() {
  local bytes=$1
  if [ -z "$bytes" ] || [ "$bytes" = "0" ]; then
    echo "0B"
    return
  fi
  
  if [ "$bytes" -gt 1073741824 ]; then
    echo "$(echo "scale=2; $bytes / 1073741824" | bc)GB"
  elif [ "$bytes" -gt 1048576 ]; then
    echo "$(echo "scale=2; $bytes / 1048576" | bc)MB"
  elif [ "$bytes" -gt 1024 ]; then
    echo "$(echo "scale=2; $bytes / 1024" | bc)KB"
  else
    echo "${bytes}B"
  fi
}

# Function to display header
display_header() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║         ${CYAN}Phase 4: Redis Cache Monitor${BLUE}                        ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# Function to display stats
display_stats() {
  local server_info=$(get_redis_info "server")
  local stats_info=$(get_redis_info "stats")
  local memory_info=$(get_redis_info "memory")
  local keyspace_info=$(get_redis_info "keyspace")
  
  # Server info
  local version=$(get_stat "$server_info" "redis_version")
  local uptime=$(get_stat "$server_info" "uptime_in_seconds")
  local uptime_days=$(echo "scale=1; $uptime / 86400" | bc)
  
  # Stats
  local total_connections=$(get_stat "$stats_info" "total_connections_received")
  local total_commands=$(get_stat "$stats_info" "total_commands_processed")
  local ops_per_sec=$(get_stat "$stats_info" "instantaneous_ops_per_sec")
  local hits=$(get_stat "$stats_info" "keyspace_hits")
  local misses=$(get_stat "$stats_info" "keyspace_misses")
  local evicted=$(get_stat "$stats_info" "evicted_keys")
  local expired=$(get_stat "$stats_info" "expired_keys")
  
  # Memory
  local used_memory=$(get_stat "$memory_info" "used_memory")
  local used_memory_human=$(get_stat "$memory_info" "used_memory_human")
  local used_memory_peak=$(get_stat "$memory_info" "used_memory_peak_human")
  local mem_fragmentation=$(get_stat "$memory_info" "mem_fragmentation_ratio")
  
  # Keyspace
  local db0=$(echo "$keyspace_info" | grep "^db0:" | cut -d: -f2 | tr -d '\r')
  local keys=0
  if [ -n "$db0" ]; then
    keys=$(echo "$db0" | grep -oP 'keys=\K\d+')
  fi
  
  # Calculate hit rate
  local total_requests=$((hits + misses))
  local hit_rate=0
  if [ $total_requests -gt 0 ]; then
    hit_rate=$(echo "scale=2; ($hits / $total_requests) * 100" | bc)
  fi
  
  # Display
  echo -e "${YELLOW}Server Information:${NC}"
  echo -e "  Redis Version:     ${GREEN}$version${NC}"
  echo -e "  Uptime:           ${CYAN}${uptime_days} days${NC}"
  echo ""
  
  echo -e "${YELLOW}Connection & Activity:${NC}"
  echo -e "  Total Connections: ${GREEN}$total_connections${NC}"
  echo -e "  Total Commands:    ${GREEN}$total_commands${NC}"
  echo -e "  Ops/sec:          ${CYAN}$ops_per_sec${NC}"
  echo ""
  
  echo -e "${YELLOW}Cache Performance:${NC}"
  echo -e "  Cache Hits:       ${GREEN}$hits${NC}"
  echo -e "  Cache Misses:     ${YELLOW}$misses${NC}"
  echo -e "  Total Requests:   ${CYAN}$total_requests${NC}"
  
  # Color hit rate based on performance
  if (( $(echo "$hit_rate >= 80" | bc -l) )); then
    hit_rate_color=$GREEN
  elif (( $(echo "$hit_rate >= 60" | bc -l) )); then
    hit_rate_color=$YELLOW
  else
    hit_rate_color=$RED
  fi
  echo -e "  Hit Rate:         ${hit_rate_color}${hit_rate}%${NC}"
  echo ""
  
  echo -e "${YELLOW}Key Management:${NC}"
  echo -e "  Total Keys:       ${GREEN}$keys${NC}"
  echo -e "  Evicted Keys:     ${YELLOW}$evicted${NC}"
  echo -e "  Expired Keys:     ${CYAN}$expired${NC}"
  echo ""
  
  echo -e "${YELLOW}Memory Usage:${NC}"
  echo -e "  Used Memory:      ${GREEN}$used_memory_human${NC}"
  echo -e "  Peak Memory:      ${BLUE}$used_memory_peak${NC}"
  echo -e "  Fragmentation:    ${CYAN}${mem_fragmentation}${NC}"
  echo ""
}

# Function to display top keys by type
display_top_keys() {
  echo -e "${YELLOW}Cache Keys by Namespace:${NC}"
  
  # Get all keys and count by namespace
  local keys=$(docker exec redis redis-cli KEYS "*" 2>/dev/null)
  
  if [ -z "$keys" ] || [ "$keys" = "(empty array)" ]; then
    echo -e "  ${YELLOW}No keys in cache${NC}"
    echo ""
    return
  fi
  
  # Count by namespace (prefix before first colon)
  declare -A namespace_counts
  while IFS= read -r key; do
    local namespace=$(echo "$key" | cut -d: -f1)
    namespace_counts[$namespace]=$((${namespace_counts[$namespace]:-0} + 1))
  done <<< "$keys"
  
  # Display sorted by count
  for namespace in "${!namespace_counts[@]}"; do
    local count=${namespace_counts[$namespace]}
    printf "  %-20s ${GREEN}%5d keys${NC}\n" "$namespace:" "$count"
  done | sort -k2 -nr | head -10
  
  echo ""
}

# Function to display recent cache operations
display_recent_operations() {
  echo -e "${YELLOW}Recent Cache Operations (last 5):${NC}"
  echo -e "  ${CYAN}Press Ctrl+C to stop monitoring${NC}"
  echo ""
}

# Main monitoring loop
main() {
  # Check if Redis is running
  if ! docker ps | grep -q redis; then
    echo -e "${RED}Error: Redis container is not running${NC}"
    echo -e "Start Redis with: ${YELLOW}docker-compose up -d redis${NC}"
    exit 1
  fi
  
  # Initial display
  clear_screen
  display_header
  display_stats
  display_top_keys
  
  echo -e "${BLUE}────────────────────────────────────────────────────────────────${NC}"
  echo -e "${CYAN}Refreshing every ${REFRESH_INTERVAL} seconds... (Ctrl+C to stop)${NC}"
  echo ""
  
  # Continuous monitoring
  while true; do
    sleep $REFRESH_INTERVAL
    clear_screen
    display_header
    display_stats
    display_top_keys
    
    echo -e "${BLUE}────────────────────────────────────────────────────────────────${NC}"
    echo -e "${CYAN}Last updated: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${CYAN}Refreshing every ${REFRESH_INTERVAL} seconds... (Ctrl+C to stop)${NC}"
    echo ""
  done
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${GREEN}Monitoring stopped${NC}"; exit 0' INT

# Show usage
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  echo "Redis Cache Monitor - Phase 4 Performance Testing"
  echo ""
  echo "Usage: $0 [interval]"
  echo ""
  echo "Options:"
  echo "  interval    Refresh interval in seconds (default: 2)"
  echo "  -h, --help  Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0          # Monitor with 2-second refresh"
  echo "  $0 5        # Monitor with 5-second refresh"
  echo ""
  exit 0
fi

# Set custom interval if provided
if [ -n "$1" ]; then
  REFRESH_INTERVAL=$1
fi

# Run main function
main
