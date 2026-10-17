#!/bin/sh
# Update stats profile.svg + push. Jalankan manual atau dijadwalkan (cron / Task Scheduler).
cd "$(dirname "$0")/.." || exit 1
node scripts/update-profile.mjs || exit 1
git add assets/profile.svg README.md
git diff --cached --quiet || git commit -m "chore: update profile stats $(date +%F)"
git push
