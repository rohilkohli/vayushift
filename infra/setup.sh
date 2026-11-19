#!/usr/bin/env bash
# One-time Google Cloud setup for VayuShift on Cloud Run + Firestore. Run it in Cloud Shell (or any shell with
# `gcloud` logged in as a project owner). It is safe to re-run: each step checks before it creates.
#
#   PROJECT_ID=my-project GITHUB_REPO=owner/repo ./infra/setup.sh
#
# Optional: REGION (default asia-south1, Mumbai: closest to Delhi-NCR), SERVICE (default vayushift).
# Secret VALUES are never read from files or committed: paste them when prompted, or pass GEMINI_API_KEY /
# GOOGLE_MAPS_API_KEY in the environment for this one run.
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID}"
: "${GITHUB_REPO:?Set GITHUB_REPO, e.g. rohilkohli/vayushift}"
REGION="${REGION:-asia-south1}"
SERVICE="${SERVICE:-vayushift}"
RUNTIME_SA="${SERVICE}-run"
DEPLOY_SA="${SERVICE}-deploy"
POOL="github"
PROVIDER="github-oidc"

gcloud config set project "$PROJECT_ID" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"

echo "==> Enabling APIs"
gcloud services enable \
  run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  firestore.googleapis.com secretmanager.googleapis.com iamcredentials.googleapis.com \
  airquality.googleapis.com generativelanguage.googleapis.com

echo "==> Firestore (Native mode, in $REGION)"
if ! gcloud firestore databases describe --database='(default)' >/dev/null 2>&1; then
  gcloud firestore databases create --database='(default)' --location="$REGION" --type=firestore-native
fi

echo "==> Firestore TTL policies (expired cache entries and receipt links delete themselves)"
for group in cache receipts; do
  gcloud firestore fields ttls update expiresAt --collection-group="$group" --enable-ttl --async || true
done

echo "==> Runtime service account (least privilege: Firestore data access only)"
gcloud iam service-accounts describe "${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1 \
  || gcloud iam service-accounts create "$RUNTIME_SA" --display-name="VayuShift runtime"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/datastore.user" --condition=None >/dev/null

echo "==> Secrets (the runtime account may read exactly these two)"
for name in gemini-api-key maps-api-key; do
  gcloud secrets describe "$name" >/dev/null 2>&1 || gcloud secrets create "$name" --replication-policy=automatic
  gcloud secrets add-iam-policy-binding "$name" \
    --member="serviceAccount:${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
done
add_secret_version() {
  local name="$1" value="$2"
  if [ -z "$value" ]; then
    read -r -s -p "Paste the value for $name (leave empty to skip): " value; echo
  fi
  if [ -n "$value" ]; then printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=-; fi
}
add_secret_version gemini-api-key "${GEMINI_API_KEY:-}"
add_secret_version maps-api-key "${GOOGLE_MAPS_API_KEY:-}"
echo "    Restrict both keys in the console: Gemini to the Generative Language API, Maps to the Air Quality API."

echo "==> Deploy service account for GitHub Actions"
gcloud iam service-accounts describe "${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1 \
  || gcloud iam service-accounts create "$DEPLOY_SA" --display-name="VayuShift deploy (GitHub Actions)"
for role in roles/run.admin roles/cloudbuild.builds.editor roles/artifactregistry.writer roles/storage.admin roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com" --role="$role" --condition=None >/dev/null
done
# The deployer may attach the runtime account to the service, and nothing else.
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --member="serviceAccount:${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com" --role="roles/iam.serviceAccountUser" >/dev/null

echo "==> Workload Identity Federation: only workflows from $GITHUB_REPO can deploy"
gcloud iam workload-identity-pools describe "$POOL" --location=global >/dev/null 2>&1 \
  || gcloud iam workload-identity-pools create "$POOL" --location=global --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers describe "$PROVIDER" --location=global --workload-identity-pool="$POOL" >/dev/null 2>&1 \
  || gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
       --location=global --workload-identity-pool="$POOL" \
       --issuer-uri="https://token.actions.githubusercontent.com" \
       --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
       --attribute-condition="assertion.repository=='${GITHUB_REPO}'"
gcloud iam service-accounts add-iam-policy-binding "${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${GITHUB_REPO}" >/dev/null

cat <<EOF

Done. Add these as repository VARIABLES (Settings > Secrets and variables > Actions > Variables):

  GCP_PROJECT_ID                  $PROJECT_ID
  GCP_REGION                      $REGION
  GCP_WORKLOAD_IDENTITY_PROVIDER  projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}
  GCP_DEPLOY_SERVICE_ACCOUNT      ${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com
  GCP_RUNTIME_SERVICE_ACCOUNT     ${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com
  PUBLIC_ORIGIN                   https://<your service URL or custom domain>

Then run the "Deploy to Cloud Run" workflow (or push a tag such as v1.0.0).
Also recommended: a Cloud Billing budget alert, and an uptime check on /api/readyz.
EOF
