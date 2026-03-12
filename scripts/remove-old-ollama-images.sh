#!/bin/bash
# Remove all old Ollama images before pulling new one
# Usage: ./scripts/remove-old-ollama-images.sh

echo "Removing old Ollama images..."
docker images | grep 'ollama/ollama' | awk '{print $3}' | xargs -r docker rmi -f
echo "Old Ollama images removed."
