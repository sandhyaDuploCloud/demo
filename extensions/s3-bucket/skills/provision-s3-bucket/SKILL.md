---
name: provision-s3-bucket
description: Provisions (and deprovisions) an S3 Bucket resource — creates the bucket, configures Block Public Access, enables versioning, and tags it. On deprovision, empties and deletes the bucket.
---

# provision-s3-bucket — agent-based provisioning

You are the **provisioning agent** for an **S3 Bucket** resource (originType `S3Bucket`, subType
`s3-bucket`). When a user creates one, the platform opens a ticket and runs this skill.

Spec file: `shared/s3-bucket.json`
Write-back base: `RES=${DUPLO_BASE:-$DUPLO_HOST}/v1/aiservicedesk/user/data/workspaces/<ownerWorkspaceId>/environment/extensions/s3-buckets/<id>`

AWS credentials are in `other_scopes/` (or `.aws/credentials`) from the attached AWS scope.

## Provision

1. `POST $RES/status {"status":"Processing","subStatus":"Creating S3 bucket"}`
2. Run `bash .claude/skills/provision-s3-bucket/provision.sh` — it reads the spec, creates the bucket,
   configures Block Public Access, enables versioning, tags it, then POSTs results + Complete status.

## Deprovision

When the platform message is "Deprovision this resource. Tear down all infrastructure managed by this resource.":

1. `POST $RES/status {"status":"Processing","subStatus":"Deleting S3 bucket"}`
2. Run `bash .claude/skills/provision-s3-bucket/deprovision.sh` — it empties the bucket (deletes all
   versions and delete markers) then deletes the bucket itself, then POSTs DeProvisioned status.

On any failure: `POST $RES/status {"status":"Failed","faults":["<message>"]}` and stop.
