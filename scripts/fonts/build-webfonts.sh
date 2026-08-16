#!/usr/bin/env bash
# SPDX-License-Identifier: Hippocratic-3.0
#
# Regenerate the served WOFF2 web fonts from the upstream TTFs in public/font/.
#
# This is deliberately NOT wired into `bun run build`. The WOFF2 files are
# committed assets, the TTFs are their source, and this script is how you get
# from one to the other reproducibly. Running the font pipeline on every build
# would add a Python toolchain to CI to produce bytes that never change.
#
# Prerequisites (not in package.json for the same reason):
#   pip install 'fonttools[woff]' brotli
#
# Run from the repo root:
#   bash scripts/fonts/build-webfonts.sh
#
# Then verify before committing — a font change is invisible until it is wrong:
#   bash scripts/fonts/verify-webfonts.sh
set -euo pipefail

cd "$(dirname "$0")/../.."
NOTO_DIR=public/font/Noto_Sans_Devanagari
VESPER_DIR=public/font/Vesper_Libre

command -v pyftsubset >/dev/null || { echo "pyftsubset not found: pip install 'fonttools[woff]' brotli" >&2; exit 1; }

# --- Noto Sans Devanagari: the app face, on every route's critical path --------
#
# Two axes upstream (wght 100-900, wdth 62.5-100). Nothing in src/ varies width,
# so wdth is pinned at its default (100) and the axis is dropped. That is where
# the bytes are: WOFF2 alone gives 255,468; dropping the axis as well gives
# 147,468.
#
# --unicodes='*' keeps EVERY codepoint the original had. Do not narrow this to a
# unicode-range without re-running the verify script: content comes from the API,
# not from this repo, so the codepoints in use are not knowable from source, and a
# missing glyph renders as tofu rather than falling back.
#
# --layout-features='*' keeps all 15 GSUB features. Measured on this font, the
# default set drops only `aalt` and `ordn` and does retain the Indic features that
# make Devanagari shape (akhn, rphf, blwf, half, nukt, pres, psts, rkrf) — so this
# flag is insurance, not a fix for a bug seen here. It is still the right call:
# the default list belongs to pyftsubset, not to this font, and a feature loss
# leaves every codepoint present while breaking conjuncts, which reads as a font
# bug rather than a build bug.
echo "==> Noto Sans Devanagari (pin wdth, keep all codepoints, WOFF2)"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
fonttools varLib.instancer \
  "$NOTO_DIR/NotoSansDevanagari-VariableFont_wdth,wght.ttf" wdth=100 \
  -o "$TMP/noto-pinned.ttf" >/dev/null
pyftsubset "$TMP/noto-pinned.ttf" \
  --unicodes='*' --layout-features='*' --flavor=woff2 \
  --output-file="$NOTO_DIR/NotoSansDevanagari-wght.woff2"

# --- Vesper Libre: editorial serif, not on the home page ----------------------
# Container change only: no axis to drop, no codepoints removed.
for w in Regular Medium Bold Black; do
  echo "==> Vesper Libre $w (WOFF2)"
  pyftsubset "$VESPER_DIR/VesperLibre-$w.ttf" \
    --unicodes='*' --layout-features='*' --flavor=woff2 \
    --output-file="$VESPER_DIR/VesperLibre-$w.woff2"
done

# IBM Plex Mono already ships as WOFF2 upstream and is left alone.

echo
ls -l "$NOTO_DIR"/*.woff2 "$VESPER_DIR"/*.woff2 | awk '{printf "%10d  %s\n", $5, $9}'
