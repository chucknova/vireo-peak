#!/usr/bin/env bash
#
# encode-web.sh — batch-transcode every .mp4 in ./raw into web-ready assets.
#
# For each input ./raw/<name>.mp4 it writes to ./web:
#   <name>.mp4   compressed, muted H.264 (crf 24, +faststart)
#   <name>.webm  muted VP9 fallback (crf 34)
#   <name>.jpg   a single-frame poster
#
# Requires: ffmpeg (with libx264, libvpx-vp9).

set -euo pipefail

RAW_DIR="./raw"
WEB_DIR="./web"

command -v ffmpeg >/dev/null 2>&1 || { echo "error: ffmpeg not found on PATH" >&2; exit 1; }

if [[ ! -d "$RAW_DIR" ]]; then
    echo "error: input directory '$RAW_DIR' does not exist" >&2
    exit 1
fi

mkdir -p "$WEB_DIR"

shopt -s nullglob nocaseglob
inputs=("$RAW_DIR"/*.mp4)
shopt -u nullglob nocaseglob

if [[ ${#inputs[@]} -eq 0 ]]; then
    echo "no .mp4 files found in '$RAW_DIR'"
    exit 0
fi

for src in "${inputs[@]}"; do
    base="$(basename "$src")"   # e.g. clip.mp4
    name="${base%.*}"           # e.g. clip

    mp4_out="$WEB_DIR/$name.mp4"
    webm_out="$WEB_DIR/$name.webm"
    poster_out="$WEB_DIR/$name.jpg"

    echo "==> Processing: $base"

    # Compressed, muted H.264 with faststart for progressive streaming.
    ffmpeg -y -loglevel error -i "$src" \
        -an \
        -c:v libx264 -crf 24 -preset medium -pix_fmt yuv420p \
        -movflags +faststart \
        "$mp4_out"

    # Muted VP9 WebM fallback.
    ffmpeg -y -loglevel error -i "$src" \
        -an \
        -c:v libvpx-vp9 -crf 34 -b:v 0 \
        "$webm_out"

    # Single-frame poster (first frame).
    ffmpeg -y -loglevel error -i "$src" \
        -frames:v 1 -q:v 2 \
        "$poster_out"

    echo "    done."
done

echo
echo "Output file sizes:"
# -h for human-readable; falls back cleanly if not supported.
if du -h "$WEB_DIR"/* >/dev/null 2>&1; then
    du -h "$WEB_DIR"/*.mp4 "$WEB_DIR"/*.webm "$WEB_DIR"/*.jpg 2>/dev/null | sort -k2
else
    ls -l "$WEB_DIR"
fi
