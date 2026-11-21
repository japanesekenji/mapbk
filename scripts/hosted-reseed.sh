#!/bin/sh
# Refresh demo data on the hosted Supabase project (docs/DEMO-SCRIPT.md, section 6).
#   sh scripts/hosted-reseed.sh            reseed, set HOSTED_DEMO_PASSWORD, clear rate limits
#   sh scripts/hosted-reseed.sh limits     only clear rate limits (after a rehearsal)
#   DRY_RUN=1 sh scripts/hosted-reseed.sh  check settings and connection, change nothing
# Reads .env.hosted (SUPABASE_DB_URL, HOSTED_DEMO_PASSWORD). Needs psql.
set -eu
cd "$(dirname "$0")/.."
[ -f .env.hosted ] || { echo "Missing .env.hosted (see docs/DEMO-SCRIPT.md)"; exit 1; }
set -a; . ./.env.hosted; set +a
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL missing in .env.hosted}"
: "${HOSTED_DEMO_PASSWORD:?HOSTED_DEMO_PASSWORD missing in .env.hosted}"

if [ "${DRY_RUN:-}" = "1" ]; then
  psql "$SUPABASE_DB_URL" -At -c "select 'connected; incidents=' || count(*) from public.incidents"
  echo "Dry run: nothing changed."
  exit 0
fi

if [ "${1:-}" != "limits" ]; then
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q -f supabase/seed.sql
  # The seed sets the public README password; replace it with the private one.
  echo "update auth.users set encrypted_password = extensions.crypt(:'pw', extensions.gen_salt('bf')) where email like '%@bakunawa.test';" \
    | psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q -v pw="$HOSTED_DEMO_PASSWORD"
  echo "Demo data reseeded; demo accounts use HOSTED_DEMO_PASSWORD."
fi
psql "$SUPABASE_DB_URL" -q -c "delete from public.rate_limit_events;"
echo "Rate limits cleared."
