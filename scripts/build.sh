#!/bin/bash
set -e

# Build script for Aspera Browser
# Usage: ./scripts/build.sh [version]

VERSION=${1:-latest}
IMAGE_NAME="aspera-browser"
REGISTRY=${REGISTRY:-""}
CONTAINER_CMD=${CONTAINER_CMD:-podman}

echo "🔨 Building Aspera Browser version: $VERSION"

# Colors for logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check that we are in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the aspera-browser-react/ directory"
    exit 1
fi

# Build container image
echo -e "${BLUE}📦 Building container image with ${CONTAINER_CMD}...${NC}"
if [ -n "$REGISTRY" ]; then
    FULL_IMAGE_NAME="$REGISTRY/$IMAGE_NAME:$VERSION"
else
    FULL_IMAGE_NAME="$IMAGE_NAME:$VERSION"
fi

$CONTAINER_CMD build -t "$FULL_IMAGE_NAME" .

# Tag latest if not already latest
if [ "$VERSION" != "latest" ]; then
    if [ -n "$REGISTRY" ]; then
        $CONTAINER_CMD tag "$FULL_IMAGE_NAME" "$REGISTRY/$IMAGE_NAME:latest"
    else
        $CONTAINER_CMD tag "$FULL_IMAGE_NAME" "$IMAGE_NAME:latest"
    fi
fi

echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo -e "${GREEN}   Image: $FULL_IMAGE_NAME${NC}"

# Display image size
IMAGE_SIZE=$($CONTAINER_CMD images "$FULL_IMAGE_NAME" --format "{{.Size}}")
echo -e "${BLUE}📊 Image size: $IMAGE_SIZE${NC}"

# Offer to push if a registry is configured
if [ -n "$REGISTRY" ]; then
    echo ""
    read -p "Do you want to push the image to $REGISTRY? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}🚀 Pushing image to registry...${NC}"
        $CONTAINER_CMD push "$FULL_IMAGE_NAME"
        if [ "$VERSION" != "latest" ]; then
            $CONTAINER_CMD push "$REGISTRY/$IMAGE_NAME:latest"
        fi
        echo -e "${GREEN}✅ Image pushed successfully!${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Build process completed!${NC}"
echo ""
echo "To deploy on Kubernetes:"
echo "  kubectl apply -k k8s/"
echo ""
echo "To test locally:"
echo "  $CONTAINER_CMD run -p 8080:80 $FULL_IMAGE_NAME"

