#!/bin/bash
set -e

# Configuration
REGISTRY="registry.im-si.org"
IMAGE_NAME="claude-code-cloud"
VERSION="${1:-latest}"

# Full image name
FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${VERSION}"

echo "=========================================="
echo "Pushing Docker image: ${FULL_IMAGE}"
echo "=========================================="

# Push the image
docker push "${FULL_IMAGE}"

if [ "${VERSION}" != "latest" ]; then
    echo "Also pushing latest tag..."
    docker push "${REGISTRY}/${IMAGE_NAME}:latest"
fi

echo ""
echo "=========================================="
echo "Push complete!"
echo "=========================================="
echo ""
echo "Deploy on Synology NAS:"
echo "  1. SSH into your NAS"
echo "  2. cd /volume1/docker/claude-code-cloud"
echo "  3. docker-compose pull"
echo "  4. docker-compose up -d"
