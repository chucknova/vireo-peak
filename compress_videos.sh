#!/usr/bin/env bash
set -euo pipefail

RAW_DIR="./raw"
WEB_DIR="./web"

mkdir -p "$WEB_DIR"

shopt -s nullglob nocaseglob
files=("$RAW_DIR"/*.mp4)
shopt -u nullglob nocaseglob

if [ ${#files[@]} -eq 0 ]; then
  echo "No .mp4 files found in $RAW_DIR" >&2
  exit 1
fi

for src in "${files[@]}"; do
  base="$(basename "$src" .mp4)"
  mp4_out="$WEB_DIR/$base.mp4"
  webm_out="$WEB_DIR/$base.webm"
  poster_out="$WEB_DIR/$base.jpg"

  echo "Processing $base..."

  ffmpeg -y -i "$src" \
    -an -c:v libx264 -crf 24 -preset slow -movflags +faststart \
    "$mp4_out"

  ffmpeg -y -i "$src" \
    -an -c:v libvpx-vp9 -crf 34 -b:v 0 \
    "$webm_out"

  ffmpeg -y -i "$src" \
    -vframes 1 -q:v 2 \
    "$poster_out"
done

echo
echo "Done. File sizes in $WEB_DIR:"
ls -lh "$WEB_DIR"/*.mp4 "$WEB_DIR"/*.webm "$WEB_DIR"/*.jpg 2>/dev/null | awk '{printf "%-40s %s\n", $NF, $5}'
