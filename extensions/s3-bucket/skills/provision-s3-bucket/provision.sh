#!/usr/bin/env bash
set -euo pipefail

SPEC_FILE="shared/s3-bucket.json"

WORKSPACE_ID=$(jq -r '.ownerWorkspaceId' "$SPEC_FILE")
ID=$(jq -r '.id' "$SPEC_FILE")
BUCKET_NAME=$(jq -r '.spec.bucketName' "$SPEC_FILE")
REGION=$(jq -r '.spec.region // "us-east-1"' "$SPEC_FILE")
PUBLIC_ACCESS=$(jq -r '.spec.publicAccess // false' "$SPEC_FILE")
CREATOR=$(jq -r '.createdBy // "unknown"' "$SPEC_FILE")
WORKSPACE_NAME=$(jq -r '.ownerWorkspaceId' "$SPEC_FILE")

BASE="${DUPLO_BASE:-$DUPLO_HOST}"
RES="$BASE/v1/aiservicedesk/user/data/workspaces/$WORKSPACE_ID/environment/extensions/s3-buckets/$ID"
auth=(-H "Authorization: Bearer $DUPLO_TOKEN" -H "Content-Type: application/json")

curl -fsS -X POST "$RES/status" "${auth[@]}" \
  -d '{"status":"Processing","subStatus":"Creating S3 bucket"}'

# Create bucket (us-east-1 does not accept LocationConstraint)
if [ "$REGION" = "us-east-1" ]; then
  aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION"
else
  aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION"
fi

curl -fsS -X POST "$RES/status" "${auth[@]}" \
  -d '{"status":"Processing","subStatus":"Configuring Block Public Access"}'

# Block Public Access (inverted: publicAccess=true means disable blocking)
if [ "$PUBLIC_ACCESS" = "true" ]; then
  aws s3api put-public-access-block --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
      BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false
  PUBLIC_ACCESS_STATUS="Enabled"
else
  aws s3api put-public-access-block --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
      BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  PUBLIC_ACCESS_STATUS="Blocked"
fi

curl -fsS -X POST "$RES/status" "${auth[@]}" \
  -d '{"status":"Processing","subStatus":"Enabling versioning"}'

aws s3api put-bucket-versioning --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled

curl -fsS -X POST "$RES/status" "${auth[@]}" \
  -d '{"status":"Processing","subStatus":"Tagging bucket"}'

aws s3api put-bucket-tagging --bucket "$BUCKET_NAME" \
  --tagging "TagSet=[{Key=workspace,Value=$WORKSPACE_NAME},{Key=creator,Value=$CREATOR}]"

BUCKET_ARN="arn:aws:s3:::$BUCKET_NAME"
DATE_CREATED=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

curl -fsS -X POST "$RES/results" "${auth[@]}" \
  -d "$(jq -nc \
    --arg bn "$BUCKET_NAME" \
    --arg arn "$BUCKET_ARN" \
    --arg region "$REGION" \
    --arg pa "$PUBLIC_ACCESS_STATUS" \
    --arg dc "$DATE_CREATED" \
    '{bucketName:$bn,bucketArn:$arn,region:$region,publicAccess:$pa,dateCreated:$dc}')"

curl -fsS -X POST "$RES/status" "${auth[@]}" \
  -d '{"status":"Complete","subStatus":"S3 bucket provisioned"}'

echo "Done: $BUCKET_NAME ($REGION)"
