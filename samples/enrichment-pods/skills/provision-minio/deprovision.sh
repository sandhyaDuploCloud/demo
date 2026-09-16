#!/usr/bin/env bash
set -euo pipefail

# Deprovisions a MinIO resource: deletes the Kubernetes objects this skill provisioned (the MinIO
# Deployment + ClusterIP Service) from the selected scope's namespace, then reports terminal status.
# The platform reuses THIS resource's provisioning ticket for deprovision — it force-sends
# "Deprovision this resource. Tear down all infrastructure managed by this resource." — so the same
# kubeconfig (./.kube/config, KUBECONFIG exported) and spec file are available here as on provision.
#
# Idempotent: --ignore-not-found means a retry (or an already-torn-down resource) still succeeds, so
# DeprovisionAsync can be called again safely without leaving the row stuck. We do NOT delete the
# namespace — it may pre-exist or be shared by other resources.

SPEC_FILE="shared/minio.json"

WORKSPACE_ID=$(jq -r '.ownerWorkspaceId' "$SPEC_FILE")
ID=$(jq -r '.id' "$SPEC_FILE")
NS=$(jq -r '.spec.namespace // "default"' "$SPEC_FILE")

BASE="${DUPLO_BASE:-$DUPLO_HOST}"
RES="$BASE/v1/aiservicedesk/user/data/workspaces/$WORKSPACE_ID/environment/extensions/minios/$ID"
auth=(-H "Authorization: Bearer $DUPLO_TOKEN" -H "Content-Type: application/json")

fail() { curl -fsS -X POST "$RES/status" "${auth[@]}" -d "$(jq -nc --arg m "$1" '{status:"Failed",faults:[$m]}')" || true; echo "FAILED: $1" >&2; exit 1; }

# Single attached cluster → current-context is it.
CTX=$(kubectl config current-context 2>/dev/null) || fail "no kubernetes context (attach a kubernetes scope)"
[ -n "$CTX" ] || fail "empty kubernetes context"

curl -fsS -X POST "$RES/status" "${auth[@]}" -d '{"status":"DeProvisioning","subStatus":"Deleting MinIO Service + Deployment"}'

# Delete in reverse dependency order (Service, then Deployment). --ignore-not-found keeps this idempotent.
kubectl --context "$CTX" -n "$NS" delete service    minio --ignore-not-found || fail "kubectl delete service failed"
kubectl --context "$CTX" -n "$NS" delete deployment minio --ignore-not-found || fail "kubectl delete deployment failed"

curl -fsS -X POST "$RES/status" "${auth[@]}" -d '{"status":"DeProvisioned","subStatus":"MinIO torn down"}'
echo "Done: MinIO deleted from $NS (context $CTX)"
