#!/usr/bin/env bash
# Set the real Google OAuth client secret on both new Supabase projects.
#
# IMPORTANT: Do NOT copy `external_google_secret` from the Management API GET
# response — that value is an encrypted fingerprint (64 hex chars), not the
# GOCSPX-… secret. Paste the secret from Google Cloud Console.
#
# Usage:
#   SUPABASE_ACCESS_TOKEN=… ./scripts/set-google-oauth-secret.sh 'GOCSPX-…'
set -euo pipefail

SECRET="${1:-}"
if [[ -z "${SECRET}" ]]; then
  echo "Usage: $0 'GOCSPX-your-client-secret'"
  exit 1
fi
if [[ "${#SECRET}" -lt 20 || "${SECRET}" =~ ^[0-9a-f]{64}$ ]]; then
  echo "That does not look like a Google client secret (expect GOCSPX-…)."
  echo "Open: https://console.cloud.google.com/auth/clients/338511843225-nnou225u4nepjldeueahvmfof9frlqq5.apps.googleusercontent.com"
  exit 1
fi
if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Set SUPABASE_ACCESS_TOKEN (Supabase CLI token)."
  exit 1
fi

CLIENT_ID="338511843225-nnou225u4nepjldeueahvmfof9frlqq5.apps.googleusercontent.com"
UA="supabase-cli/2.0"

patch() {
  local ref="$1"
  local label="$2"
  local body
  body=$(python3 -c "import json; print(json.dumps({
    'external_google_enabled': True,
    'external_google_client_id': '''${CLIENT_ID}''',
    'external_google_secret': '''${SECRET}''',
  }))")
  local out
  out=$(curl -sS -X PATCH \
    "https://api.supabase.com/v1/projects/${ref}/config/auth" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "User-Agent: ${UA}" \
    -H "Content-Type: application/json" \
    --data-binary "${body}")
  python3 -c "
import json,sys
d=json.loads(sys.argv[1])
if 'site_url' not in d:
    print('FAIL ${label}', d); sys.exit(1)
print('OK ${label}', '${ref}', 'google=', d.get('external_google_enabled'), 'client_set=', bool(d.get('external_google_client_id')))
" "${out}"
}

patch "awqvyohcdxamkacwlsnq" "dev"
patch "bpxszivjvexmqznnshlx" "prod"
echo
echo "Also confirm Authorized redirect URIs include:"
echo "  https://awqvyohcdxamkacwlsnq.supabase.co/auth/v1/callback"
echo "  https://bpxszivjvexmqznnshlx.supabase.co/auth/v1/callback"
echo
echo "Then retry Google sign-in on https://mind.logitslab.com/account"
