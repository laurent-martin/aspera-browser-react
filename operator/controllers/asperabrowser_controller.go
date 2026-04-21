package controllers

import (
	"context"
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/intstr"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"

	browserv1alpha1 "github.com/aspera/aspera-browser-operator/api/v1alpha1"
)

// AsperaBrowserReconciler reconciles a AsperaBrowser object
type AsperaBrowserReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

//+kubebuilder:rbac:groups=browser.aspera.io,resources=asperabrowsers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=browser.aspera.io,resources=asperabrowsers/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=browser.aspera.io,resources=asperabrowsers/finalizers,verbs=update
//+kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=services,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=configmaps,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=networking.k8s.io,resources=ingresses,verbs=get;list;watch;create;update;patch;delete

// Reconcile is part of the main kubernetes reconciliation loop
func (r *AsperaBrowserReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	log := log.FromContext(ctx)

	// Fetch the AsperaBrowser instance
	asperaBrowser := &browserv1alpha1.AsperaBrowser{}
	err := r.Get(ctx, req.NamespacedName, asperaBrowser)
	if err != nil {
		if errors.IsNotFound(err) {
			log.Info("AsperaBrowser resource not found. Ignoring since object must be deleted")
			return ctrl.Result{}, nil
		}
		log.Error(err, "Failed to get AsperaBrowser")
		return ctrl.Result{}, err
	}

	// Create or update ConfigMap
	configMap := r.configMapForAsperaBrowser(asperaBrowser)
	if err := controllerutil.SetControllerReference(asperaBrowser, configMap, r.Scheme); err != nil {
		return ctrl.Result{}, err
	}
	foundConfigMap := &corev1.ConfigMap{}
	err = r.Get(ctx, types.NamespacedName{Name: configMap.Name, Namespace: configMap.Namespace}, foundConfigMap)
	if err != nil && errors.IsNotFound(err) {
		log.Info("Creating a new ConfigMap", "ConfigMap.Namespace", configMap.Namespace, "ConfigMap.Name", configMap.Name)
		err = r.Create(ctx, configMap)
		if err != nil {
			log.Error(err, "Failed to create new ConfigMap", "ConfigMap.Namespace", configMap.Namespace, "ConfigMap.Name", configMap.Name)
			return ctrl.Result{}, err
		}
	} else if err != nil {
		log.Error(err, "Failed to get ConfigMap")
		return ctrl.Result{}, err
	}

	// Create or update Deployment
	deployment := r.deploymentForAsperaBrowser(asperaBrowser)
	if err := controllerutil.SetControllerReference(asperaBrowser, deployment, r.Scheme); err != nil {
		return ctrl.Result{}, err
	}
	foundDeployment := &appsv1.Deployment{}
	err = r.Get(ctx, types.NamespacedName{Name: deployment.Name, Namespace: deployment.Namespace}, foundDeployment)
	if err != nil && errors.IsNotFound(err) {
		log.Info("Creating a new Deployment", "Deployment.Namespace", deployment.Namespace, "Deployment.Name", deployment.Name)
		err = r.Create(ctx, deployment)
		if err != nil {
			log.Error(err, "Failed to create new Deployment", "Deployment.Namespace", deployment.Namespace, "Deployment.Name", deployment.Name)
			return ctrl.Result{}, err
		}
		return ctrl.Result{Requeue: true}, nil
	} else if err != nil {
		log.Error(err, "Failed to get Deployment")
		return ctrl.Result{}, err
	}

	// Update Deployment if spec has changed
	if foundDeployment.Spec.Replicas == nil || *foundDeployment.Spec.Replicas != asperaBrowser.Spec.Replicas {
		foundDeployment.Spec.Replicas = &asperaBrowser.Spec.Replicas
		err = r.Update(ctx, foundDeployment)
		if err != nil {
			log.Error(err, "Failed to update Deployment", "Deployment.Namespace", foundDeployment.Namespace, "Deployment.Name", foundDeployment.Name)
			return ctrl.Result{}, err
		}
		return ctrl.Result{Requeue: true}, nil
	}

	// Create or update Service
	service := r.serviceForAsperaBrowser(asperaBrowser)
	if err := controllerutil.SetControllerReference(asperaBrowser, service, r.Scheme); err != nil {
		return ctrl.Result{}, err
	}
	foundService := &corev1.Service{}
	err = r.Get(ctx, types.NamespacedName{Name: service.Name, Namespace: service.Namespace}, foundService)
	if err != nil && errors.IsNotFound(err) {
		log.Info("Creating a new Service", "Service.Namespace", service.Namespace, "Service.Name", service.Name)
		err = r.Create(ctx, service)
		if err != nil {
			log.Error(err, "Failed to create new Service", "Service.Namespace", service.Namespace, "Service.Name", service.Name)
			return ctrl.Result{}, err
		}
	} else if err != nil {
		log.Error(err, "Failed to get Service")
		return ctrl.Result{}, err
	}

	// Create or update Ingress if enabled
	if asperaBrowser.Spec.IngressEnabled {
		ingress := r.ingressForAsperaBrowser(asperaBrowser)
		if err := controllerutil.SetControllerReference(asperaBrowser, ingress, r.Scheme); err != nil {
			return ctrl.Result{}, err
		}
		foundIngress := &networkingv1.Ingress{}
		err = r.Get(ctx, types.NamespacedName{Name: ingress.Name, Namespace: ingress.Namespace}, foundIngress)
		if err != nil && errors.IsNotFound(err) {
			log.Info("Creating a new Ingress", "Ingress.Namespace", ingress.Namespace, "Ingress.Name", ingress.Name)
			err = r.Create(ctx, ingress)
			if err != nil {
				log.Error(err, "Failed to create new Ingress", "Ingress.Namespace", ingress.Namespace, "Ingress.Name", ingress.Name)
				return ctrl.Result{}, err
			}
		} else if err != nil {
			log.Error(err, "Failed to get Ingress")
			return ctrl.Result{}, err
		}
	}

	// Update status
	asperaBrowser.Status.AvailableReplicas = foundDeployment.Status.AvailableReplicas
	asperaBrowser.Status.ReadyReplicas = foundDeployment.Status.ReadyReplicas

	if foundDeployment.Status.AvailableReplicas == asperaBrowser.Spec.Replicas {
		asperaBrowser.Status.Phase = "Running"
		if asperaBrowser.Spec.IngressEnabled && asperaBrowser.Spec.IngressHost != "" {
			protocol := "http"
			if asperaBrowser.Spec.TLSEnabled {
				protocol = "https"
			}
			asperaBrowser.Status.URL = fmt.Sprintf("%s://%s", protocol, asperaBrowser.Spec.IngressHost)
		}
	} else {
		asperaBrowser.Status.Phase = "Pending"
	}

	err = r.Status().Update(ctx, asperaBrowser)
	if err != nil {
		log.Error(err, "Failed to update AsperaBrowser status")
		return ctrl.Result{}, err
	}

	return ctrl.Result{}, nil
}

// configMapForAsperaBrowser returns a ConfigMap object
func (r *AsperaBrowserReconciler) configMapForAsperaBrowser(ab *browserv1alpha1.AsperaBrowser) *corev1.ConfigMap {
	labels := labelsForAsperaBrowser(ab.Name)

	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ab.Name + "-config",
			Namespace: ab.Namespace,
			Labels:    labels,
		},
		Data: map[string]string{
			"ASPERA_NODE_URL": ab.Spec.AsperaNodeURL,
		},
	}
	return configMap
}

// deploymentForAsperaBrowser returns a Deployment object
func (r *AsperaBrowserReconciler) deploymentForAsperaBrowser(ab *browserv1alpha1.AsperaBrowser) *appsv1.Deployment {
	labels := labelsForAsperaBrowser(ab.Name)
	replicas := ab.Spec.Replicas

	// Parse resources
	requests := corev1.ResourceList{}
	limits := corev1.ResourceList{}

	if ab.Spec.Resources.Requests.CPU != "" {
		requests[corev1.ResourceCPU] = resource.MustParse(ab.Spec.Resources.Requests.CPU)
	}
	if ab.Spec.Resources.Requests.Memory != "" {
		requests[corev1.ResourceMemory] = resource.MustParse(ab.Spec.Resources.Requests.Memory)
	}
	if ab.Spec.Resources.Limits.CPU != "" {
		limits[corev1.ResourceCPU] = resource.MustParse(ab.Spec.Resources.Limits.CPU)
	}
	if ab.Spec.Resources.Limits.Memory != "" {
		limits[corev1.ResourceMemory] = resource.MustParse(ab.Spec.Resources.Limits.Memory)
	}

	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ab.Name,
			Namespace: ab.Namespace,
			Labels:    labels,
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: labels,
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: labels,
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{{
						Image: ab.Spec.Image,
						Name:  "aspera-browser",
						Ports: []corev1.ContainerPort{{
							ContainerPort: 80,
							Name:          "http",
						}},
						EnvFrom: []corev1.EnvFromSource{{
							ConfigMapRef: &corev1.ConfigMapEnvSource{
								LocalObjectReference: corev1.LocalObjectReference{
									Name: ab.Name + "-config",
								},
							},
						}},
						Resources: corev1.ResourceRequirements{
							Requests: requests,
							Limits:   limits,
						},
						LivenessProbe: &corev1.Probe{
							ProbeHandler: corev1.ProbeHandler{
								HTTPGet: &corev1.HTTPGetAction{
									Path: "/",
									Port: intstr.FromInt(80),
								},
							},
							InitialDelaySeconds: 30,
							PeriodSeconds:       10,
						},
						ReadinessProbe: &corev1.Probe{
							ProbeHandler: corev1.ProbeHandler{
								HTTPGet: &corev1.HTTPGetAction{
									Path: "/",
									Port: intstr.FromInt(80),
								},
							},
							InitialDelaySeconds: 5,
							PeriodSeconds:       5,
						},
					}},
				},
			},
		},
	}
	return deployment
}

// serviceForAsperaBrowser returns a Service object
func (r *AsperaBrowserReconciler) serviceForAsperaBrowser(ab *browserv1alpha1.AsperaBrowser) *corev1.Service {
	labels := labelsForAsperaBrowser(ab.Name)

	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ab.Name + "-service",
			Namespace: ab.Namespace,
			Labels:    labels,
		},
		Spec: corev1.ServiceSpec{
			Selector: labels,
			Ports: []corev1.ServicePort{{
				Port:       80,
				TargetPort: intstr.FromInt(80),
				Protocol:   corev1.ProtocolTCP,
				Name:       "http",
			}},
			Type: corev1.ServiceTypeClusterIP,
		},
	}
	return service
}

// ingressForAsperaBrowser returns an Ingress object
func (r *AsperaBrowserReconciler) ingressForAsperaBrowser(ab *browserv1alpha1.AsperaBrowser) *networkingv1.Ingress {
	labels := labelsForAsperaBrowser(ab.Name)
	pathType := networkingv1.PathTypePrefix

	ingress := &networkingv1.Ingress{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ab.Name + "-ingress",
			Namespace: ab.Namespace,
			Labels:    labels,
			Annotations: map[string]string{
				"nginx.ingress.kubernetes.io/rewrite-target": "/",
			},
		},
		Spec: networkingv1.IngressSpec{
			Rules: []networkingv1.IngressRule{{
				Host: ab.Spec.IngressHost,
				IngressRuleValue: networkingv1.IngressRuleValue{
					HTTP: &networkingv1.HTTPIngressRuleValue{
						Paths: []networkingv1.HTTPIngressPath{{
							Path:     "/",
							PathType: &pathType,
							Backend: networkingv1.IngressBackend{
								Service: &networkingv1.IngressServiceBackend{
									Name: ab.Name + "-service",
									Port: networkingv1.ServiceBackendPort{
										Number: 80,
									},
								},
							},
						}},
					},
				},
			}},
		},
	}

	// Add TLS if enabled
	if ab.Spec.TLSEnabled {
		ingress.Spec.TLS = []networkingv1.IngressTLS{{
			Hosts:      []string{ab.Spec.IngressHost},
			SecretName: ab.Name + "-tls",
		}}
	}

	return ingress
}

// labelsForAsperaBrowser returns the labels for selecting the resources
func labelsForAsperaBrowser(name string) map[string]string {
	return map[string]string{
		"app":                           "aspera-browser",
		"aspera-browser.aspera.io/name": name,
	}
}

// SetupWithManager sets up the controller with the Manager
func (r *AsperaBrowserReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&browserv1alpha1.AsperaBrowser{}).
		Owns(&appsv1.Deployment{}).
		Owns(&corev1.Service{}).
		Owns(&corev1.ConfigMap{}).
		Owns(&networkingv1.Ingress{}).
		Complete(r)
}
