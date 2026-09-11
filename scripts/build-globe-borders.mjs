// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Regenerates public/assets/globe-borders.json — the country outlines the
// donate page's WebGL globe draws over its dot grid.
//
// Run manually when the borders need refreshing; the output is committed, so a
// normal build never needs network access:
//
//   node scripts/build-globe-borders.mjs
//
// Source data: Natural Earth admin-0 countries (naturalearthdata.com), which is
// in the PUBLIC DOMAIN — no attribution required, though we credit it in the
// asset anyway so the provenance travels with the file. World outlines come
// from the 110m tier (enough for a 600px globe) and Nepal alone from 50m,
// because Nepal is the subject of the scene and 110m renders it as a 23-point
// smudge.
//
// The output is deliberately NOT GeoJSON: nested [lon,lat] pairs and per-feature
// boilerplate roughly triple the byte count for geometry the globe only ever
// reads as flat vertex runs. Each ring is one flat [lon,lat,lon,lat,…] array.

import { writeFileSync } from "node:fs";

const TIERS = {
  "110m":
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
  "50m":
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson",
};

const OUT = "public/assets/globe-borders.json";

// Simplification tolerances in degrees, and coordinate precision in decimals.
// 0.4° ≈ 44km, invisible on a globe this size; Nepal gets 25x the fidelity.
const WORLD_TOLERANCE = 0.4;
const WORLD_PRECISION = 2;
const NEPAL_TOLERANCE = 0.016;
const NEPAL_PRECISION = 3;

/** Perpendicular distance from p to the segment a→b, in degrees. */
function perpendicularDistance(p, a, b) {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + clamped * dx), py - (ay + clamped * dy));
}

/** Douglas–Peucker. Keeps corners that matter, drops collinear filler — which
 * is what a naive every-Nth-point decimation gets wrong on coastlines. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  let maxDist = 0;
  let idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], points[0], points.at(-1));
    if (d > maxDist) {
      maxDist = d;
      idx = i;
    }
  }
  if (maxDist <= tolerance) return [points[0], points.at(-1)];
  return [
    ...simplify(points.slice(0, idx + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(idx), tolerance),
  ];
}

/** Every closed ring in a Polygon/MultiPolygon geometry. */
function ringsOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}

/** A ring crossing the antimeridian arrives as a single run of longitudes that
 * jumps ±360 (Russia, Fiji). Drawn straight onto a sphere that jump becomes a
 * line clean across the globe, so split the ring where it wraps. */
function splitAtAntimeridian(ring) {
  const parts = [];
  let current = [ring[0]];
  for (let i = 1; i < ring.length; i++) {
    if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) {
      parts.push(current);
      current = [ring[i]];
    } else {
      current.push(ring[i]);
    }
  }
  parts.push(current);
  return parts.filter((p) => p.length > 1);
}

function encode(rings, tolerance, precision) {
  const out = [];
  for (const ring of rings) {
    for (const part of splitAtAntimeridian(ring)) {
      const simplified = simplify(part, tolerance);
      if (simplified.length < 2) continue;
      const flat = [];
      for (const [lon, lat] of simplified) {
        flat.push(
          Number(lon.toFixed(precision)),
          Number(lat.toFixed(precision)),
        );
      }
      out.push(flat);
    }
  }
  return out;
}

async function fetchTier(tier) {
  const res = await fetch(TIERS[tier]);
  if (!res.ok) throw new Error(`${tier}: HTTP ${res.status}`);
  return res.json();
}

const [world110, world50] = await Promise.all([
  fetchTier("110m"),
  fetchTier("50m"),
]);

const isNepal = (f) => f.properties?.ADMIN === "Nepal";

const worldRings = world110.features
  .filter((f) => !isNepal(f))
  .flatMap((f) => ringsOf(f.geometry));

const nepalFeature = world50.features.find(isNepal);
if (!nepalFeature) throw new Error("Nepal missing from the 50m tier");

const payload = {
  source:
    "Natural Earth (naturalearthdata.com) admin-0 countries — public domain. World: 110m, Nepal: 50m.",
  generator: "scripts/build-globe-borders.mjs",
  world: encode(worldRings, WORLD_TOLERANCE, WORLD_PRECISION),
  nepal: encode(ringsOf(nepalFeature.geometry), NEPAL_TOLERANCE, NEPAL_PRECISION),
};

writeFileSync(OUT, JSON.stringify(payload));

const vertices = (rings) => rings.reduce((n, r) => n + r.length / 2, 0);
console.log(
  `${OUT}: ${payload.world.length} world rings (${vertices(payload.world)} pts), ` +
    `${payload.nepal.length} Nepal rings (${vertices(payload.nepal)} pts), ` +
    `${(JSON.stringify(payload).length / 1024).toFixed(1)} KB`,
);
