# Deployment Guide - Aspera Browser

This guide explains how to deploy the Aspera Browser application using Docker and Kubernetes.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Docker Deployment](#docker-deployment)
- [Docker Compose Deployment](#docker-compose-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Kubernetes Operator](#kubernetes-operator)
- [Configuration](#configuration)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### For Docker

- Docker 20.10+
- Docker Compose 2.0+ (optional)

### For Kubernetes

- Kubernetes cluster 1.25+
- kubectl configured
- Kustomize 4.0+ (included in kubectl 1.14+)
- Helm 3.0+ (optional)

### For the Operator

- Operator SDK 1.32+
- Go 1.21+

## 🐳 Docker Deployment

### Building the Image

```bash
# Build with the provided script
cd aspera-browser-react
./scripts/build.sh v1.0.0

# Or manually
docker build -t aspera-browser:v1.0.0 .
```

### Running the Container

```bash
# Run on port 8080
docker run -d \
  --name aspera-browser \
  -p 8080:80 \
  --restart unless-stopped \
  aspera-browser:v1.0.0

# Access the application
open http://localhost:8080
```

### Checking Status

```bash
# View logs
docker logs -f aspera-browser

# Check health check
docker inspect aspera-browser | grep -A 10 Health

# Stop the container
docker stop aspera-browser

# Remove the container
docker rm aspera-browser
```

## 🐙 Docker Compose Deployment

### Important: Podman Rootless Configuration

If using **Podman** as a non-root user, enable `linger` to prevent containers from stopping when you log out of SSH:

```bash
# Enable linger for your user
sudo loginctl enable-linger $USER

# Verify it's enabled
loginctl show-user $USER | grep Linger
# Should show: Linger=yes
```

Without linger enabled, Podman rootless containers will stop when your user session ends (SSH logout).

### Starting the Application

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Checking Container Status

```bash
# View running containers
docker ps

# View logs (real-time)
docker logs -f aspera-browser

# View logs (last 100 lines)
docker logs --tail=100 aspera-browser

# Check if container persists after logout
# Log out and back in, then check:
docker ps -a --filter "name=aspera-browser"
```

## ☸️ Kubernetes Deployment

### File Structure

```
k8s/
├── deployment.yaml      # Application deployment
├── service.yaml         # ClusterIP service
├── ingress.yaml         # Ingress with TLS
├── configmap.yaml       # Configuration
└── kustomization.yaml   # Kustomize config
```

### Quick Deployment

```bash
# Use the deployment script
cd aspera-browser-react
./scripts/deploy.sh production

# Or manually with kubectl
kubectl create namespace aspera-browser
kubectl apply -k k8s/ -n aspera-browser
```

### Manual Step-by-Step Deployment

```bash
# 1. Create the namespace
kubectl create namespace aspera-browser

# 2. Apply the ConfigMap
kubectl apply -f k8s/configmap.yaml -n aspera-browser

# 3. Deploy the application
kubectl apply -f k8s/deployment.yaml -n aspera-browser

# 4. Create the service
kubectl apply -f k8s/service.yaml -n aspera-browser

# 5. Configure the Ingress (modify the hostname first)
kubectl apply -f k8s/ingress.yaml -n aspera-browser
```

### Verifying the Deployment

```bash
# View all objects
kubectl get all -n aspera-browser

# View pods
kubectl get pods -n aspera-browser

# View logs
kubectl logs -n aspera-browser -l app=aspera-browser -f

# Check deployment status
kubectl rollout status deployment/aspera-browser -n aspera-browser

# Describe the pod
kubectl describe pod -n aspera-browser -l app=aspera-browser
```

### Accessing the Application

#### Via Ingress (production)

```bash
# Check the Ingress
kubectl get ingress -n aspera-browser

# Access via the configured hostname
# https://aspera-browser.example.com
```

#### Via Port Forward (development)

```bash
# Forward local port to the service
kubectl port-forward -n aspera-browser svc/aspera-browser 8080:80

# Access the application
open http://localhost:8080
```

### Updating

```bash
# Update the image
kubectl set image deployment/aspera-browser \
  aspera-browser=aspera-browser:v2.0.0 \
  -n aspera-browser

# Or edit the deployment
kubectl edit deployment aspera-browser -n aspera-browser

# Restart the deployment
kubectl rollout restart deployment/aspera-browser -n aspera-browser

# View rollout history
kubectl rollout history deployment/aspera-browser -n aspera-browser

# Rollback if necessary
kubectl rollout undo deployment/aspera-browser -n aspera-browser
```

### Scaling

```bash
# Scale manually
kubectl scale deployment/aspera-browser --replicas=5 -n aspera-browser

# Autoscaling (HPA)
kubectl autoscale deployment aspera-browser \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n aspera-browser
```

## 🤖 Kubernetes Operator

The Kubernetes operator simplifies the application lifecycle management.

### Installing the Operator

```bash
cd operator

# Initialize the project (first time only)
operator-sdk init --domain aspera.io --repo github.com/your-org/aspera-browser-operator

# Create the API
operator-sdk create api --group browser --version v1alpha1 --kind AsperaBrowser --resource --controller

# Generate manifests
make manifests generate

# Install CRDs
make install

# Deploy the operator
make deploy IMG=your-registry/aspera-browser-operator:v1.0.0
```

### Using the Operator

```bash
# Create an AsperaBrowser instance
kubectl apply -f operator/config/samples/browser_v1alpha1_asperabrowser.yaml

# View instances
kubectl get asperabrowser -A

# View details
kubectl describe asperabrowser aspera-browser-sample

# Edit an instance
kubectl edit asperabrowser aspera-browser-sample

# Delete an instance
kubectl delete asperabrowser aspera-browser-sample
```

### Custom Resource Example

```yaml
apiVersion: browser.aspera.io/v1alpha1
kind: AsperaBrowser
metadata:
  name: my-aspera-browser
spec:
  replicas: 3
  image: aspera-browser:v1.0.0
  asperaNodeUrl: https://demo.asperasoft.com:9092
  ingressEnabled: true
  ingressHost: aspera.mycompany.com
  tlsEnabled: true
  resources:
    requests:
      cpu: "100m"
      memory: "128Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"
```

## ⚙️ Configuration

### Environment Variables

Variables can be configured via the ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aspera-browser-config
data:
  ASPERA_NODE_URL: "https://your-aspera-server.com:9092"
  LOG_LEVEL: "info"
```

### Customizing the Ingress

Modify [`k8s/ingress.yaml`](../k8s/ingress.yaml:1):

```yaml
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: your-tls-secret
  rules:
  - host: your-domain.com
```

### CPU/Memory Resources

Adjust in [`k8s/deployment.yaml`](../k8s/deployment.yaml:1):

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "200m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

## 📊 Monitoring

### Health Checks

The application exposes a `/health` endpoint:

```bash
# Test the health check
curl http://localhost:8080/health

# In Kubernetes
kubectl exec -n aspera-browser deployment/aspera-browser -- wget -qO- http://localhost/health
```

### Metrics

```bash
# View resource usage
kubectl top pods -n aspera-browser

# View events
kubectl get events -n aspera-browser --sort-by='.lastTimestamp'
```

### Logs

```bash
# Real-time logs
kubectl logs -n aspera-browser -l app=aspera-browser -f

# Last 100 lines
kubectl logs -n aspera-browser -l app=aspera-browser --tail=100

# Logs from a specific pod
kubectl logs -n aspera-browser <pod-name>
```

## 🔍 Troubleshooting

### Pod Won't Start

```bash
# View pod events
kubectl describe pod -n aspera-browser <pod-name>

# Check logs
kubectl logs -n aspera-browser <pod-name>

# Check the image
kubectl get pod -n aspera-browser <pod-name> -o jsonpath='{.spec.containers[0].image}'
```

### Network Issues

```bash
# Test connectivity from a pod
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
wget -O- http://aspera-browser.aspera-browser.svc.cluster.local

# Check the service
kubectl get svc -n aspera-browser
kubectl describe svc aspera-browser -n aspera-browser
```

### Ingress Issues

```bash
# Check the Ingress
kubectl describe ingress aspera-browser -n aspera-browser

# Check the Ingress controller
kubectl get pods -n ingress-nginx

# View controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller
```

### Complete Restart

```bash
# Delete and recreate
kubectl delete namespace aspera-browser
./scripts/deploy.sh production
```

## 🧹 Cleanup

### Docker

```bash
# Stop and remove the container
docker stop aspera-browser
docker rm aspera-browser

# Remove the image
docker rmi aspera-browser:v1.0.0
```

### Kubernetes

```bash
# Delete the application
kubectl delete -k k8s/ -n aspera-browser

# Delete the namespace
kubectl delete namespace aspera-browser
```

### Operator

```bash
# Delete all instances
kubectl delete asperabrowser --all -A

# Uninstall the operator
cd operator
make undeploy

# Remove CRDs
make uninstall
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Operator SDK](https://sdk.operatorframework.io/)
- [Kustomize](https://kustomize.io/)

## 🆘 Support

For any questions or issues:

1. Check the logs: `kubectl logs -n aspera-browser -l app=aspera-browser`
2. Review events: `kubectl get events -n aspera-browser`
3. Open an issue on GitHub
