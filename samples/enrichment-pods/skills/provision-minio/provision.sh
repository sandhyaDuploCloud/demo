#!/usr/bin/env bash
set -euo pipefail

# Provisions a MinIO resource by applying a Deployment + ClusterIP Service (NO ingress) into the
# selected kubernetes scope's namespace, then writing the result back via the resource's OWN REST route.
# The platform materialized the k8s scope as a kubeconfig (./.kube/config, KUBECONFIG exported); the
# single attached cluster is the current-context. Status and results are two separate APIs.

SPEC_FILE="shared/minio.json"

WORKSPACE_ID=$(jq -r '.ownerWorkspaceId' "$SPEC_FILE")
ID=$(jq -r '.id' "$SPEC_FILE")
NS=$(jq -r '.spec.namespace // "default"' "$SPEC_FILE")
IMAGE=$(jq -r '.spec.image // "quay.io/minio/minio:RELEASE.2025-04-22T22-12-26Z"' "$SPEC_FILE")
ROOT_USER=$(jq -r '.spec.rootUser // "minioadmin"' "$SPEC_FILE")
ROOT_PASSWORD=$(jq -r '.spec.rootPassword // "minioadmin123"' "$SPEC_FILE")
REPLICAS=$(jq -r '.spec.replicas // 1' "$SPEC_FILE")

BASE="${DUPLO_BASE:-$DUPLO_HOST}"
RES="$BASE/v1/aiservicedesk/user/data/workspaces/$WORKSPACE_ID/environment/extensions/minios/$ID"
auth=(-H "Authorization: Bearer $DUPLO_TOKEN" -H "Content-Type: application/json")

fail() { curl -fsS -X POST "$RES/status" "${auth[@]}" -d "$(jq -nc --arg m "$1" '{status:"Failed",faults:[$m]}')" || true; echo "FAILED: $1" >&2; exit 1; }

# Single attached cluster → current-context is it.
CTX=$(kubectl config current-context 2>/dev/null) || fail "no kubernetes context (attach a kubernetes scope)"
[ -n "$CTX" ] || fail "empty kubernetes context"

curl -fsS -X POST "$RES/status" "${auth[@]}" -d '{"status":"Processing","subStatus":"Applying MinIO Deployment + Service"}'

# Ensure the target namespace exists (idempotent — a fresh tenant namespace may not exist yet).
kubectl --context "$CTX" get namespace "$NS" >/dev/null 2>&1 || kubectl --context "$CTX" create namespace "$NS" || fail "could not create namespace $NS"

# Deployment + ClusterIP Service (no ingress). label app=minio so enrichment can list the pods.
kubectl --context "$CTX" -n "$NS" apply -f - <<EOF || fail "kubectl apply failed"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
  namespace: $NS
  labels: { app: minio }
spec:
  replicas: $REPLICAS
  selector: { matchLabels: { app: minio } }
  template:
    metadata:
      labels: { app: minio }
    spec:
      containers:
        - name: minio
          image: $IMAGE
          args: ["server", "/data", "--console-address", ":9001"]
          env:
            - { name: MINIO_ROOT_USER, value: "$ROOT_USER" }
            - { name: MINIO_ROOT_PASSWORD, value: "$ROOT_PASSWORD" }
          ports:
            - { name: api, containerPort: 9000 }
            - { name: console, containerPort: 9001 }
          volumeMounts:
            - { name: data, mountPath: /data }
          readinessProbe:
            httpGet: { path: /minio/health/ready, port: 9000 }
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet: { path: /minio/health/live, port: 9000 }
            initialDelaySeconds: 10
            periodSeconds: 20
          resources:
            requests: { cpu: 100m, memory: 128Mi }
            limits:   { cpu: 500m, memory: 512Mi }
      volumes:
        - name: data
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: minio
  namespace: $NS
  labels: { app: minio }
spec:
  type: ClusterIP
  selector: { app: minio }
  ports:
    - { name: api, port: 9000, targetPort: 9000 }
    - { name: console, port: 9001, targetPort: 9001 }
EOF

API_EP="minio.$NS.svc.cluster.local:9000"
CONSOLE_EP="minio.$NS.svc.cluster.local:9001"

curl -fsS -X POST "$RES/results" "${auth[@]}" \
  -d "$(jq -nc --arg d minio --arg s minio --arg a "$API_EP" --arg c "$CONSOLE_EP" \
        '{deploymentName:$d, serviceName:$s, apiEndpoint:$a, consoleEndpoint:$c}')"

curl -fsS -X POST "$RES/status" "${auth[@]}" -d '{"status":"Complete","subStatus":"MinIO deployed"}'
echo "Done: MinIO applied to $NS (context $CTX)"
