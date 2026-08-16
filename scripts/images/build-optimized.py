#!/usr/bin/env python3
# SPDX-License-Identifier: Hippocratic-3.0
"""Regenerate the served raster assets at the size they are actually displayed at.

Like scripts/fonts/, this is NOT wired into `bun run build`: the outputs are
committed assets and this script is how you reproduce them. Running an image
pipeline on every build would add a Python toolchain to CI to produce bytes that
do not change between builds.

The rule behind every number below is `CSS size x DPR`, with the CSS size read off
the component rather than guessed, and DPR taken as **4.5** — the device pixel
ratio of `devices["Galaxy S9+"]`, which is what the phone gates in
tests/e2e-pw/responsive.mobile.spec.ts actually run at. 3 is the number you reach
for by habit and it is too low: a 336px avatar measured a mean 1.95/255 difference
against the original when the browser stretched it to 504 device px, i.e. the
"optimisation" was quietly softening every face on /team.

  team avatars   `h-28 w-28`  in src/pages/OurTeam.tsx      -> 112px -> 504 (capped
                 at the source's own short side: 9 of 22 photographs are smaller
                 than that, so 504 is a ceiling and not a target)
  source logos   `h-14 w-auto` in src/components/data-sources.tsx -> 56px tall -> 252
  case thumbnail `h-full w-full` in a 328x208 card          -> 1476x936
  modal favicon  `h-8 w-8` in newsletter-signup-modal.tsx   -> 32px -> 180 (see below)

Going from 336 to 504 costs 126 KB across all 13 avatars and buys back every
pixel; against the 4.77 MB they weighed before, that is not a trade worth making
the other way.

`srcset` is deliberately NOT introduced. These are all FIXED-size boxes, so the
3x file is the only file any device needs; srcset earns its complexity on FLUID
images, where the rendered width depends on the viewport. The one cost is that a
DPR-1 phone downloads the full-DPR avatar, which after this change is 9-55 KB.

Prerequisites:  pip install pillow
Usage:          python3 scripts/images/build-optimized.py [--check]

--check writes nothing and fails if an output is missing, is not at its expected
pixel dimensions, is not smaller than its source, or is over its declared byte
budget. It does not byte-compare the encoders' output, because WebP encoding is
not guaranteed identical across Pillow versions — the point is to catch a 2 MB
photo landing in public/assets/teammembers/ again, not to pin the encoder.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "public"
# Originals live here, NOT in public/, because public/ is deployed: shipping a
# 1.75 MB photograph next to the 38 KB file that replaced it would push it to
# every CDN edge for nobody to fetch. They stay in the repo because they are the
# regeneration input — the only other copy is git history.
SRC = ROOT / "scripts/images/sources"


def square_cover(im: Image.Image, size: int) -> Image.Image:
    """Centre-crop to a square, then resize — exactly what `object-cover` on a
    square box does, so the pre-cropped file looks identical to the original."""
    w, h = im.size
    side = min(w, h)
    left, top = (w - side) // 2, (h - side) // 2
    return im.crop((left, top, left + side, top + side)).resize((size, size), Image.LANCZOS)


def square_cover_capped(im: Image.Image, cap: int) -> Image.Image:
    """`square_cover`, but never larger than the source actually is.

    `CSS box x DPR` is a ceiling, not a target: resizing a 188x188 avatar UP to 504
    makes the file bigger AND the picture worse, which is the opposite of the job.
    9 of the 22 team photographs are below 504 on their short side — the four GitHub
    avatars cap at 400-460 whatever `?s=` asks for, and one source is 200x188 — so
    this is the common case, not an edge case."""
    return square_cover(im, min(cap, min(im.size)))


def fit_height(im: Image.Image, height: int) -> Image.Image:
    """Scale to a target height, preserving aspect — for `h-N w-auto` logos."""
    w, h = im.size
    return im.resize((max(1, round(w * height / h)), height), Image.LANCZOS)


def fit_box(im: Image.Image, w: int, h: int) -> Image.Image:
    return im.resize((w, h), Image.LANCZOS)


# (source, output, transform, save kwargs, byte budget)
JOBS: list[tuple[str, str, object, dict, int]] = []

# Team avatars: 112 CSS px, object-cover, round. 13 files, 4.77 MB of the 5.67 MB
# /team weighed. (The audit's "20 images on /team" counts every image on the page,
# logos and icons included, not just the photographs.) Photographs, so lossy WebP.
for src in sorted((SRC / "teammembers").glob("*")):
    if src.suffix.lower() in (".png", ".jpg", ".jpeg"):
        JOBS.append((
            f"teammembers/{src.name}",
            f"assets/teammembers/{src.stem}.webp",
            ("square_cap", 504),
            {"format": "WEBP", "quality": 82, "method": 6},
            # anish.webp is 70 KB at 504px — a busy background, not a mistake. The
            # budget exists to catch a 1.7 MB original landing back here, so 80 KB
            # still does its job with room for one hard photograph.
            80_000,
        ))

# Source logos: rendered 56 px tall with object-contain, and they have alpha, so
# near-lossless WebP keeps the edges crisp on both light and dark backgrounds.
for name in ("ciaa", "cib"):
    JOBS.append((
        f"{name}.png",
        f"assets/{name}.webp",
        ("height", 252),
        {"format": "WEBP", "quality": 92, "method": 6},
        45_000,
    ))

# Case-card placeholder: a near-flat #F5F5F5 panel shipped at 1920x1080 for a
# 328x208 box.
JOBS.append((
    "placeholder.png",
    "assets/placeholder.webp",
    ("box", (1476, 936)),
    {"format": "WEBP", "quality": 88, "method": 6},
    25_000,
))

# favicon.png shipped at 1000x1000 / 205 KB for a 32 px <img> in the newsletter
# modal. It stays a PNG at its existing path: index.html declares favicon.ico and
# icon-192.png and never this file, but /favicon.png is a conventional path that
# crawlers probe, and a WebP there would be a worse answer than a small PNG.
JOBS.append((
    "favicon-1000.png",
    "favicon.png",
    ("square", 180),
    {"format": "PNG", "optimize": True},
    25_000,
))


def transform(im: Image.Image, spec) -> Image.Image:
    kind, arg = spec
    if kind == "square":
        return square_cover(im, arg)
    if kind == "square_cap":
        return square_cover_capped(im, arg)
    if kind == "height":
        return fit_height(im, arg)
    return fit_box(im, *arg)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="verify only, write nothing")
    args = ap.parse_args()

    failures, saved_total = 0, 0
    print(f"{'output':<46} {'source':>9} {'out':>8} {'saved':>8}  dims")
    for src_rel, out_rel, spec, kw, budget in JOBS:
        src, out = SRC / src_rel, PUB / out_rel
        problems: list[str] = []
        if not src.exists():
            print(f"{out_rel:<46} SOURCE MISSING")
            failures += 1
            continue

        if args.check:
            if not out.exists():
                print(f"{out_rel:<46} MISSING — run without --check")
                failures += 1
                continue
            # Re-derive the EXPECTED dimensions from the source without encoding.
            with Image.open(src) as im:
                want = transform(Image.new(im.mode, im.size), spec).size
            with Image.open(out) as got_im:
                got = got_im.size
            if got != want:
                problems.append(f"  WRONG SIZE {got[0]}x{got[1]}, want {want[0]}x{want[1]}")
            dims = got
        else:
            with Image.open(src) as im:
                im.load()
                # A palette image with alpha loses the alpha on a naive convert.
                alpha = "transparency" in im.info or im.mode in ("RGBA", "LA", "P")
                result = transform(im.convert("RGBA" if alpha else "RGB"), spec)
            out.parent.mkdir(parents=True, exist_ok=True)
            result.save(out, **kw)
            dims = result.size

        s_bytes, o_bytes = src.stat().st_size, out.stat().st_size
        saved = s_bytes - o_bytes
        saved_total += max(0, saved)
        if o_bytes > budget:
            problems.append(f"  OVER BUDGET ({o_bytes} > {budget})")
        if o_bytes >= s_bytes:
            problems.append("  NOT SMALLER THAN SOURCE")
        failures += 1 if problems else 0
        print(f"{out_rel:<46} {s_bytes:>9} {o_bytes:>8} {saved:>8}  "
              f"{dims[0]}x{dims[1]}{''.join(problems)}")

    print(f"\n{len(JOBS) - failures} of {len(JOBS)} outputs ok; {saved_total:,} bytes saved")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
