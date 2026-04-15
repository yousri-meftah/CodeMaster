# Kubernetes Apply Order

Use this order after creating real secret files from the examples.

```powershell
kubectl apply -f Kubernetes/00-namespace
kubectl apply -f Kubernetes/secrets/postgres-secret.yaml
kubectl apply -f Kubernetes/secrets/backend-secret.yaml
kubectl apply -f Kubernetes/config
kubectl apply -f Kubernetes/storage
kubectl apply -f Kubernetes/services
kubectl apply -f Kubernetes/statefulsets
kubectl apply -f Kubernetes/deployments/piston-deployment.yaml
kubectl apply -f Kubernetes/jobs/backend-migration-job.yaml
kubectl apply -f Kubernetes/deployments/backend-deployment.yaml
kubectl apply -f Kubernetes/deployments/web-deployment.yaml
kubectl apply -f Kubernetes/networking
```

Do not commit the real files `Kubernetes/secrets/postgres-secret.yaml` or `Kubernetes/secrets/backend-secret.yaml`.
