#!/bin/bash
set -e

# Configuration
REGISTRY="registry.im-si.org"
IMAGE_NAME="claude-code-cloud"
VERSION="${1:-latest}"

echo "=========================================="
echo "Claude Code Cloud - Build & Deploy"
echo "=========================================="
echo ""

# Build
echo "[1/2] Building Docker image..."
./scripts/docker-build.sh "${VERSION}"

# Push
echo ""
echo "[2/2] Pushing to registry..."
./scripts/docker-push.sh "${VERSION}"

echo ""
echo "=========================================="
echo "Deployment ready!"
echo "=========================================="
echo ""
echo "On your Synology NAS, run:"
echo ""
echo "  # First time setup:"
echo "  mkdir -p /volume1/docker/claude-code-cloud/.anthropic"
echo "  mkdir -p /volume1/docker/claude-code-cloud/.claude"
echo "  # Copy your Anthropic API key to .anthropic/"
echo ""
echo "  # Deploy/Update:"
echo "  cd /volume1/docker/claude-code-cloud"
echo "  docker-compose pull"
echo "  docker-compose up -d"
echo ""
