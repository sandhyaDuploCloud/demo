#!/usr/bin/env bash
set -euo pipefail

SPEC_FILE="shared/s3-bucket.json"

WORKSPACE_ID=$(jq -r '.ownerWorkspaceId' "$SPEC_FILE")
ID=$(jq -r '.id' "$SPEC_FILE")
BUCKET_NAME=$(jq -r '.spec.bucketName' "$SPEC_FILE")

BASE="${DUPLO_BASE:-$DUPLO_HOST}"
RES="$BASE/v1/aiservicedesk/user/data/workspaces/$WORKSPACE_ID/environment/extensions/s3-buckets/$ID"
auth=(-H "Authorization: Bearer $DUPLO_TOKEN" -H "Content-Type: application/json")

curl -fsS -X POST "$RES/status" "${auth[@]}" \
  -d '{"status":"Processing","subStatus":"Emptying S3 bucket"}'

# Delete all object versions and delete markers (required before bucket deletion when versioning is enabled)
VERSIONS=$(aws s3api list-object-versions --bucket "$BUCKET_NAME" \
  --query '{Objects:Versions[].{Key:Key,VersionId:VersionId}}' --output json 2>/dev/null || echo '{"Objects":[]}')
OBJECT_COUNT=$(echo "$VERSIONS" | jq '.Objects | length')
if [ "$OBJECT_COUNT" -gt 0 ]; then
  aws s3api delete-objects --bucket "$BUCKET_NAME" --delete "$VERSIONS"
fi

DELETE_MARKERS=$(aws s3api list-object-versions --bucket "$BUCKET_NAME" \
  --query '{Objects:DeleteMarkers[].{Key:Key,VersionId:VersionId}}' --output json 2>/dev/null || echo '{"Objects":[]}')
MARKER_COUNT=$(echo "$DELETE_MARKERS" | jq '.Objects | length')
if [ "$MARKER_COUNT" -gt 0 ]; then
  aws s3api delete-objects --bucket "$BUCKET_NAME" --delete "$DELETE_MARKERS"
fi

curl -fsS -X POST "$RES/status" "${auth[@]}" \
  -d '{"status":"Processing","subStatus":"Deleting S3 bucket"}'

aws s3api delete-bucket --bucket "$BUCKET_NAME"

curl -fsS -X POST "$RES/status" "${auth[@]}" \
  -d '{"status":"DeProvisioned","subStatus":"S3 bucket deleted"}'

echo "Deleted: $BUCKET_NAME"
