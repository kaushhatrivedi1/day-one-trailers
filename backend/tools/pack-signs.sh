#!/bin/sh
# Copy the sign gloss index and motion data (not the video clips) into the Lambda code folder.
# Run before `sam build`. src/signdata is gitignored: this data is licensed and must not be committed.
set -e
here=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$here/src/signdata"
cp "$here/signs/library.json" "$here/signs/motion.json" "$here/src/signdata/"
echo "packed: $(du -sh "$here/src/signdata" | cut -f1)"
