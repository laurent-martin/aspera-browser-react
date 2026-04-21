#!/bin/bash
set -e

# Deployment script for Aspera Browser on Kubernetes
# Usage: ./scripts/deploy.sh [environment]

ENVIRONMENT=${1:-development}
NAMESPACE="aspera-browser"

echo "🚀 Deploying Aspera Browser to $ENVIRONMENT environment"

# Colors for logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check that kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install it first."
    exit 1
fi

# Check cluster connection
echo -e "${BLUE}🔍 Checking cluster connection...${NC}"
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Unable to connect to Kubernetes cluster"
    exit 1
fi

CURRENT_CONTEXT=$(kubectl config current-context)
echo -e "${GREEN}✅ Connected to cluster: $CURRENT_CONTEXT${NC}"

# Create namespace if it doesn't exist
echo -e "${BLUE}📦 Creating namespace $NAMESPACE...${NC}"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Deploy with Kustomize
echo -e "${BLUE}🔧 Deploying Kubernetes resources...${NC}"
cd k8s
kubectl apply -k . -n "$NAMESPACE"
cd ..

# Wait for deployment to be ready
echo -e "${BLUE}⏳ Waiting for deployment...${NC}"
kubectl rollout status deployment/aspera-browser -n "$NAMESPACE" --timeout=5m

# Display status
echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Resource status:${NC}"
kubectl get all -n "$NAMESPACE"

# Display access URL
echo ""
echo -e "${BLUE}🌐 Application access:${NC}"
INGRESS_HOST=$(kubectl get ingress aspera-browser -n "$NAMESPACE" -o jsonpath='{.spec.rules[0].host}' 2>/dev/null || echo "")
if [ -n "$INGRESS_HOST" ]; then
    echo -e "${GREEN}   URL: https://$INGRESS_HOST${NC}"
else
    echo -e "${YELLOW}   Ingress not configured. Use port-forward:${NC}"
    echo "   kubectl port-forward -n $NAMESPACE svc/aspera-browser 8080:80"
    echo "   Then access http://localhost:8080"
fi

echo ""
echo -e "${BLUE}📝 Useful commands:${NC}"
echo "  View logs:            kubectl logs -n $NAMESPACE -l app=aspera-browser -f"
echo "  View pods:            kubectl get pods -n $NAMESPACE"
echo "  Restart:              kubectl rollout restart deployment/aspera-browser -n $NAMESPACE"
echo "  Delete:               kubectl delete namespace $NAMESPACE"

