#!/usr/bin/env python3
# SPDX-License-Identifier: Hippocratic-3.0
"""Prove a generated WOFF2 renders the same text as the TTF it came from.

A broken font subset is invisible in review and often invisible in a smoke test:
every page still loads, the CSS still matches, and the damage is a missing glyph
or an unshaped conjunct somewhere in Nepali content that comes from the API. So
the check is not "does it load" but "does it draw the same pixels".

Two layers, because they fail differently:

  * table-level  -- codepoints, glyph count, GSUB feature tags, GPOS presence.
    Catches an over-narrow --unicodes and a dropped --layout-features, which is
    the failure that keeps every codepoint but stops Devanagari shaping.
  * pixel-level  -- render Nepali samples with both fonts at every weight the app
    uses and diff the bitmaps. Catches everything the tables cannot express.

Prerequisites:  pip install 'fonttools[woff]' brotli pillow
Usage:          python3 scripts/fonts/verify-webfonts.py
Exit code:      0 if every pair matches, 1 otherwise.
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
NOTO = ROOT / "public/font/Noto_Sans_Devanagari"
VESPER = ROOT / "public/font/Vesper_Libre"

# (generated woff2, upstream ttf, weights to render, axes to pin on the TTF)
PAIRS = [
    (
        NOTO / "NotoSansDevanagari-wght.woff2",
        NOTO / "NotoSansDevanagari-VariableFont_wdth,wght.ttf",
        (400, 500, 600, 700, 900),
    ),
    (VESPER / "VesperLibre-Regular.woff2", VESPER / "VesperLibre-Regular.ttf", (400,)),
    (VESPER / "VesperLibre-Medium.woff2", VESPER / "VesperLibre-Medium.ttf", (500,)),
    (VESPER / "VesperLibre-Bold.woff2", VESPER / "VesperLibre-Bold.ttf", (700,)),
    (VESPER / "VesperLibre-Black.woff2", VESPER / "VesperLibre-Black.ttf", (900,)),
]

# Chosen to exercise what actually breaks: stacked conjuncts, every matra class,
# repha and rakar, nukta, both digit sets, the danda, and Latin alongside them.
SAMPLES = [
    "जवाफदेही — भ्रष्टाचारको स्थायी अभिलेख",
    "अख्तियार दुरुपयोग अनुसन्धान आयोग (CIAA)",
    "क्ष त्र ज्ञ श्र द्व ट्ट ङ्ग हृ र्क क्र्य",
    "कि की कु कू कृ के कै को कौ कं कँ कः ।॥",
    "0123456789 ०१२३४५६७८९ ₹ Rs. ABC xyz",
]


def as_ttf(path: Path, tmp: Path) -> Path:
    """FreeType cannot read WOFF2, so round-trip it back to a TTF to render."""
    if path.suffix != ".woff2":
        return path
    font = TTFont(path)
    font.flavor = None
    out = tmp / (path.stem + ".render.ttf")
    font.save(out)
    return out


def tables_match(new: Path, old: Path) -> bool:
    a, b = TTFont(old), TTFont(new)
    ca, cb = set(a.getBestCmap()), set(b.getBestCmap())
    fa = {r.FeatureTag for r in a["GSUB"].table.FeatureList.FeatureRecord} if "GSUB" in a else set()
    fb = {r.FeatureTag for r in b["GSUB"].table.FeatureList.FeatureRecord} if "GSUB" in b else set()
    lost_cp, lost_feat = ca - cb, fa - fb
    ok = not lost_cp and not lost_feat and ("GPOS" in b) == ("GPOS" in a)
    print(f"    codepoints {len(ca)} -> {len(cb)}   features {len(fa)} -> {len(fb)}   GPOS={'GPOS' in b}")
    if lost_cp:
        shown = sorted(f"U+{c:04X}" for c in lost_cp)
        print(f"    ✗ {len(lost_cp)} codepoints lost: {', '.join(shown[:12])}"
              f"{' …' if len(shown) > 12 else ''}")
    if lost_feat:
        indic = lost_feat & {"akhn", "rphf", "blwf", "half", "nukt", "pres", "psts", "rkrf", "ccmp"}
        note = " — these are the ones Devanagari shaping needs" if indic else ""
        print(f"    ✗ layout features lost: {sorted(lost_feat)}{note}")
    return ok


def pixels_match(new: Path, old: Path, weights: tuple[int, ...], tmp: Path) -> bool:
    new_ttf = as_ttf(new, tmp)
    variable = "fvar" in TTFont(old)
    ok = True
    for wght in weights:
        for sample in SAMPLES:
            frames = []
            for path, axes in ((old, 2), (new_ttf, 1)):
                face = ImageFont.truetype(str(path), 40)
                if variable:
                    # The upstream Noto has [wght, wdth]; the generated one only
                    # has [wght], so the axis vectors are different lengths.
                    face.set_variation_by_axes([wght, 100.0][:axes])
                im = Image.new("L", (1400, 70), 255)
                ImageDraw.Draw(im).text((5, 5), sample, font=face, fill=0)
                frames.append(list(im.getdata()))
            diff = sum(1 for p, q in zip(*frames) if p != q)
            if diff:
                ok = False
                print(f"    ✗ wght={wght} differs by {diff}px: {sample[:36]}")
    return ok


def main() -> int:
    failures = 0
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        for new, old, weights in PAIRS:
            print(f"  {new.name}  <-  {old.name}")
            if not new.exists():
                print("    ✗ missing — run scripts/fonts/build-webfonts.sh")
                failures += 1
                continue
            good = tables_match(new, old) and pixels_match(new, old, weights, tmp)
            saved = old.stat().st_size - new.stat().st_size
            print(f"    {'OK' if good else 'FAILED'}  {new.stat().st_size} bytes "
                  f"({saved} smaller than the TTF on disk)")
            failures += 0 if good else 1
    print(f"\n{len(PAIRS) - failures} of {len(PAIRS)} font pairs verified")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
