#!/bin/sh
# Copies the prepared files for the 30-minute variant from a reference clone ($REF)
# into the current folder. Leaves 6 page files for Gemini.
set -e
REF="${REF:?set REF to the reference clone, e.g. REF=~/mapbk}"
for p in \
  package.json package-lock.json tsconfig.json eslint.config.mjs .gitignore \
  next.config.ts vercel.json .env.example \
  public/brand scripts/copy-maplibre-worker.mjs \
  supabase/config.toml supabase/seed.sql supabase/migrations \
  src/proxy.ts src/styles src/lib src/components src/app/api \
  src/app/layout.tsx src/app/globals.css \
  "src/app/(public)/layout.tsx" \
  "src/app/(public)/report" "src/app/(public)/sos" \
  "src/app/(public)/respond" "src/app/(public)/profile" \
  specs .specify/memory/constitution.md docs
do
  mkdir -p "$(dirname "$p")"
  rm -rf "./$p"
  cp -R "$REF/$p" "$(dirname "$p")/"
done
echo "Copied. Gemini writes: (public)/page.tsx, incidents/page.tsx, incidents/[id]/page.tsx, facilities/page.tsx, moderate/page.tsx, admin/page.tsx (optional)."
