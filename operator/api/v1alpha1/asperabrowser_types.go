package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// AsperaBrowserSpec defines the desired state of AsperaBrowser
type AsperaBrowserSpec struct {
	// Replicas is the number of pods to deploy
	// +kubebuilder:default=2
	// +kubebuilder:validation:Minimum=1
	// +kubebuilder:validation:Maximum=10
	Replicas int32 `json:"replicas,omitempty"`

	// Image is the Docker image to use
	// +kubebuilder:default="aspera-browser:latest"
	Image string `json:"image,omitempty"`

	// AsperaNodeURL is the URL of the Aspera Node API server
	// +kubebuilder:default="https://demo.asperasoft.com:9092"
	AsperaNodeURL string `json:"asperaNodeUrl,omitempty"`

	// IngressEnabled enables or disables the Ingress
	// +kubebuilder:default=true
	IngressEnabled bool `json:"ingressEnabled,omitempty"`

	// IngressHost is the hostname for the Ingress
	IngressHost string `json:"ingressHost,omitempty"`

	// TLSEnabled enables or disables TLS for the Ingress
	// +kubebuilder:default=true
	TLSEnabled bool `json:"tlsEnabled,omitempty"`

	// Resources defines the CPU/Memory resources
	Resources ResourceRequirements `json:"resources,omitempty"`
}

// ResourceRequirements defines the resource limits
type ResourceRequirements struct {
	// Requests defines the requested resources
	Requests ResourceList `json:"requests,omitempty"`
	// Limits defines the resource limits
	Limits ResourceList `json:"limits,omitempty"`
}

// ResourceList defines CPU and Memory
type ResourceList struct {
	// CPU in millicores (e.g., "100m")
	// +kubebuilder:default="100m"
	CPU string `json:"cpu,omitempty"`
	// Memory in bytes (e.g., "128Mi")
	// +kubebuilder:default="128Mi"
	Memory string `json:"memory,omitempty"`
}

// AsperaBrowserStatus defines the observed state of AsperaBrowser
type AsperaBrowserStatus struct {
	// Conditions represents the current conditions
	Conditions []metav1.Condition `json:"conditions,omitempty"`

	// AvailableReplicas is the number of available pods
	AvailableReplicas int32 `json:"availableReplicas,omitempty"`

	// ReadyReplicas is the number of ready pods
	ReadyReplicas int32 `json:"readyReplicas,omitempty"`

	// Phase represents the current phase (Pending, Running, Failed)
	Phase string `json:"phase,omitempty"`

	// URL is the application access URL
	URL string `json:"url,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:shortName=ab
// +kubebuilder:printcolumn:name="Replicas",type=integer,JSONPath=`.spec.replicas`
// +kubebuilder:printcolumn:name="Available",type=integer,JSONPath=`.status.availableReplicas`
// +kubebuilder:printcolumn:name="Phase",type=string,JSONPath=`.status.phase`
// +kubebuilder:printcolumn:name="URL",type=string,JSONPath=`.status.url`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`

// AsperaBrowser is the schema for the asperabrowsers API
type AsperaBrowser struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AsperaBrowserSpec   `json:"spec,omitempty"`
	Status AsperaBrowserStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// AsperaBrowserList contains a list of AsperaBrowser
type AsperaBrowserList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AsperaBrowser `json:"items"`
}

func init() {
	SchemeBuilder.Register(&AsperaBrowser{}, &AsperaBrowserList{})
}
