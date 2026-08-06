#!/usr/bin/env bash
# Opens Google Cloud Console to the OAuth client used by MindKshetra Supabase.
# Redirect URIs to add (Authorized redirect URIs):
#   https://awqvyohcdxamkacwlsnq.supabase.co/auth/v1/callback
#   https://bpxszivjvexmqznnshlx.supabase.co/auth/v1/callback
#
# Google does not expose a stable public gcloud command to edit user OAuth
# clients; after `gcloud auth login` you still paste these in the Console UI.
set -euo pipefail

CLIENT_ID="338511843225-nnou225u4nepjldeueahvmfof9frlqq5.apps.googleusercontent.com"
PROJECT_NUMBER="338511843225"

export PATH="/opt/homebrew/share/google-cloud-sdk/bin:/opt/homebrew/bin:$PATH"

if ! gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | grep -q .; then
  echo "No active gcloud account. Run: gcloud auth login"
  exit 1
fi

# Resolve project id from the numeric project number when possible.
PROJECT_ID=$(gcloud projects list --format='value(projectId)' --filter="projectNumber=${PROJECT_NUMBER}" 2>/dev/null | head -1 || true)
if [[ -z "${PROJECT_ID}" ]]; then
  PROJECT_ID=$(gcloud config get-value project 2>/dev/null || true)
fi

URL="https://console.cloud.google.com/auth/clients/${CLIENT_ID}"
if [[ -n "${PROJECT_ID}" && "${PROJECT_ID}" != "(unset)" ]]; then
  URL="${URL}?project=${PROJECT_ID}"
fi

echo "Add these Authorized redirect URIs:"
echo "  https://awqvyohcdxamkacwlsnq.supabase.co/auth/v1/callback"
echo "  https://bpxszivjvexmqznnshlx.supabase.co/auth/v1/callback"
echo
echo "Opening: ${URL}"
open "${URL}"
