#!/bin/sh
# Swap in a freshly built sign library (signs/v2) and clear every cached joined video.
set -e
cd "$(dirname "$0")/../signs"
[ -f v2/library.json ] || { echo "no signs/v2/library.json"; exit 1; }
stamp=$(date +%Y%m%d-%H%M%S)
mkdir -p "old-$stamp"
[ -d clips ] && mv clips "old-$stamp/"
[ -f library.json ] && mv library.json "old-$stamp/"
mv v2/clips clips && mv v2/library.json library.json && rmdir v2 2>/dev/null || true
rm -rf .out .cache.json
echo "swapped; old library kept in signs/old-$stamp"
