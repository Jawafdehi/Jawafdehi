"""Render one cover per /materials series: page 1 of a real document from it.

For each series: search the archive for its documents (same source/kind scope
the series page uses), take the first one whose record links a RAW PDF,
download it, render page 1 with pdftoppm, then scale to 360px wide, blur a
little (covers are decoration, not reading; raw files are unredacted;
text-dense pages get more) and
encode WebP with ffmpeg.

Usage (needs pdftoppm and ffmpeg on PATH):
    python3 scripts/make-series-covers.py public/assets/materials/covers

Add a series to SERIES when one is added to src/data/material-series.ts;
FolderCard loads /assets/materials/covers/<slug>.webp.
"""
import json, subprocess, sys, tempfile, urllib.parse, urllib.request
from pathlib import Path

API = "https://api.jawafdehi.org"
OUT = Path(sys.argv[1])
D = Path(tempfile.mkdtemp(prefix="series-covers-"))
(D / "pdf").mkdir()
(D / "png").mkdir()
SERIES = [
    ("charge-sheets", "ag", None, None),
    ("auditor-general-reports", "official_report", "report_annual-report", None),
    ("ciaa-press-releases", "ciaa_press_release", None, None),
    ("province-audit-reports", "official_report", "report_province-report", None),
    ("kanun-patrika", "kanun_patrika", None, None),
    ("audit-journal", "official_report", "publication_audit-journals", None),
    ("ciaa-annual-reports", "ciaa_annual_report", None, None),
    ("audit-bulletin", "official_report", "publication_audit-bulletin", None),
    ("oag-publications", "official_report", None,
     ["report_annual-report", "report_province-report", "publication_audit-journals", "publication_audit-bulletin"]),
]

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "jawafdehi-cover-builder"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

for slug, source, kind, exclude in SERIES:
    q = [("type", "material"), ("source", source), ("page_size", "20"), ("sort", "newest")]
    if kind: q.append(("dataset_bucket", kind))
    for e in exclude or []: q.append(("dataset_bucket_exclude", e))
    hits = json.loads(get(f"{API}/api/search/?{urllib.parse.urlencode(q)}"))["results"]
    done = False
    for hit in hits:
        tail = hit["url"].removeprefix("/material/")
        try:
            rec = json.loads(get(f"{API}/api/materials/{urllib.parse.quote(tail)}"))
        except Exception:
            continue
        pdfs = [m["contentUrl"] for m in rec.get("associatedMedia") or []
                if m.get("jawafdehi:linkRole") == "RAW" and m.get("contentUrl", "").lower().endswith(".pdf")]
        if not pdfs:
            continue
        pdf = D / "pdf" / f"{slug}.pdf"
        # Text-dense first pages (a charge sheet, a press release) get more
        # blur: the raw files are unredacted, and a cover only has to read as
        # "a page of this kind".
        sigma = 1.6 if slug in ("charge-sheets", "ciaa-press-releases") else 0.8
        try:
            pdf.write_bytes(get(urllib.parse.quote(pdfs[0], safe=":/")))
            png = D / "png" / slug
            subprocess.run(["pdftoppm", "-f", "1", "-l", "1", "-r", "72", "-png", "-singlefile", str(pdf), str(png)],
                           check=True, capture_output=True)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{png}.png",
                            "-vf", f"scale=360:-2,gblur=sigma={sigma}", "-quality", "70",
                            str(OUT / f"{slug}.webp")], check=True)
        except Exception as e:
            print(slug, "skip", hit["url"], e)
            continue
        print(slug, "<-", hit["url"])
        done = True
        break
    if not done:
        print(slug, "NO COVER")
