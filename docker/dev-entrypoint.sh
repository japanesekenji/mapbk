#!/bin/sh
# Relays localhost:54321 (API) and :54322 (Postgres) to the host, where the local Supabase
# stack publishes them. The browser, server code, tests and Supabase CLI then share one URL.
# Skipped when nothing listens on the host (for example with a hosted Supabase project).
for port in 54321 54322; do
  socat TCP-LISTEN:$port,fork,reuseaddr,bind=127.0.0.1 TCP:host.docker.internal:$port 2>/dev/null &
done
exec "$@"
