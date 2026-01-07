#!/bin/bash
set -e

# Configuration
REGISTRY="registry.im-si.org"
IMAGE_NAME="claude-code-cloud"
VERSION="${1:-latest}"

# Build-time env
NEXT_PUBLIC_GA_ID="${NEXT_PUBLIC_GA_ID:-}"

# Full image name
FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${VERSION}"

echo "=========================================="
echo "Building Docker image: ${FULL_IMAGE}"
echo "=========================================="

# Build the image
docker build \
    --platform linux/amd64 \
    --build-arg "NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID" \
    -t "${FULL_IMAGE}" \
    -t "${REGISTRY}/${IMAGE_NAME}:latest" \
    .

echo ""
echo "=========================================="
echo "Build complete!"
echo "=========================================="
echo ""
echo "To push to registry:"
echo "  docker push ${FULL_IMAGE}"
echo "  docker push ${REGISTRY}/${IMAGE_NAME}:latest"
echo ""
echo "Or run: ./scripts/docker-push.sh ${VERSION}"
