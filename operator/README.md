# Aspera Browser Kubernetes Operator

Kubernetes operator to manage the deployment of the Aspera Browser application.

## 📋 Prerequisites

- Go 1.21+
- Kubernetes cluster 1.25+
- kubectl configured
- Operator SDK 1.32+

## 🏗️ Structure

```text
operator/
├── api/
│   └── v1alpha1/
│       └── asperabrowser_types.go    # CRD definition
├── controllers/
│   └── asperabrowser_controller.go   # Controller logic
├── config/
│   ├── crd/                          # CRD manifests
│   ├── rbac/                         # RBAC permissions
│   ├── manager/                      # Operator deployment
│   └── samples/                      # CR examples
├── Dockerfile                        # Operator image
├── Makefile                          # Build commands
└── go.mod                            # Go dependencies
```

## 🚀 Project Initialization

To create the complete operator with Operator SDK:

```bash
# Create the operator directory
mkdir -p operator
cd operator

# Initialize the project with Operator SDK
operator-sdk init --domain aspera.io --repo github.com/your-org/aspera-browser-operator

# Create the API and controller
operator-sdk create api --group browser --version v1alpha1 --kind AsperaBrowser --resource --controller

# Generate manifests
make manifests

# Generate code
make generate
```

## 📝 Custom Resource Definition (CRD)

The operator manages a custom `AsperaBrowser` resource:

```yaml
apiVersion: browser.aspera.io/v1alpha1
kind: AsperaBrowser
metadata:
  name: aspera-browser-sample
spec:
  replicas: 2
  image: aspera-browser:latest
  asperaNodeUrl: https://demo.asperasoft.com:9092
  ingressEnabled: true
  ingressHost: aspera-browser.example.com
  tlsEnabled: true
  resources:
    requests:
      cpu: "100m"
      memory: "128Mi"
    limits:
      cpu: "200m"
      memory: "256Mi"
```

## 🔧 Operator Features

The operator automatically manages:

- ✅ Application deployment with specified replica count
- ✅ Kubernetes service to expose the application
- ✅ Ingress with optional TLS
- ✅ ConfigMap for configuration
- ✅ Health checks and readiness probes
- ✅ Automatic updates on spec changes
- ✅ Complete lifecycle management
- ✅ Status reporting with conditions

## 🛠️ Development

### Local Build and Test

```bash
# Install dependencies
make install

# Generate manifests and code
make manifests generate

# Run tests
make test

# Build the operator
make build

# Run locally (outside cluster)
make run
```

### Deployment in Cluster

```bash
# Build and push the Docker image
make docker-build docker-push IMG=your-registry/aspera-browser-operator:tag

# Deploy CRDs
make install

# Deploy the operator
make deploy IMG=your-registry/aspera-browser-operator:tag

# Create an instance
kubectl apply -f config/samples/browser_v1alpha1_asperabrowser.yaml
```

## 📊 Monitoring

Check the operator status:

```bash
# View operator logs
kubectl logs -n aspera-browser-operator-system deployment/aspera-browser-operator-controller-manager

# Check CRs
kubectl get asperabrowser -A

# View CR details
kubectl describe asperabrowser aspera-browser-sample

# Check status
kubectl get asperabrowser aspera-browser-sample -o jsonpath='{.status}'
```

## 🔄 Updating

To update an instance:

```bash
# Modify replica count
kubectl patch asperabrowser aspera-browser-sample --type merge -p '{"spec":{"replicas":3}}'

# Change image
kubectl patch asperabrowser aspera-browser-sample --type merge -p '{"spec":{"image":"aspera-browser:v2.0.0"}}'
```

## 🗑️ Cleanup

```bash
# Delete an instance
kubectl delete asperabrowser aspera-browser-sample

# Uninstall the operator
make undeploy

# Remove CRDs
make uninstall
```

## 📚 Resources

- [Operator SDK Documentation](https://sdk.operatorframework.io/)
- [Kubernetes Operator Pattern](https://kubernetes.io/docs/concepts/extend-kubernetes/operator/)
- [Kubebuilder Book](https://book.kubebuilder.io/)

## 🤝 Contributing

Contributions are welcome! To develop the operator:

1. Modify `api/v1alpha1/asperabrowser_types.go` for CRD changes
2. Modify `controllers/asperabrowser_controller.go` for logic
3. Run `make manifests generate` to regenerate code
4. Test with `make test`
5. Submit a PR

## 📄 License

Apache-2.0
