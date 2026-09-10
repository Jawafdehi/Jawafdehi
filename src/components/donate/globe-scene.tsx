// WebGL donate globe — diaspora support flowing home to Kathmandu.
//
// LAZY-LOADED ONLY. This module (and through it all of three.js) must never be
// statically imported: the initial-payload budget (scripts/bundle-budget.mjs)
// has no room for it. `community.tsx` mounts it through GlobeGate — a
// client-only, idle-time gate that also checks WebGL support,
// prefers-reduced-motion, and connection affordability.
//
// The scene samples the existing `/assets/world-map.svg` dot grid (the same
// calibrated 612×344 artwork the static fallback shows) onto a sphere, draws
// country outlines from `/assets/globe-borders.json` over it (Nepal's own border
// in amber), then animates arcs from 15 cities with large Nepali communities
// into a labeled काठमाडौँ · Nepal beacon. Slow auto-spin, drag to rotate, pauses
// offscreen. Kathmandu is always labeled so the geography is never ambiguous.
import { useEffect, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Group,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  QuadraticBezierCurve3,
  Scene,
  Sprite,
  SpriteMaterial,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from "three";

const KTM = { np: "काठमाडौँ", lat: 27.7172, lon: 85.324 };

// Centre of Nepal's bounding box (roughly 80.05–88.20°E, 26.35–30.45°N), used
// to place the amber glow that backs the country outline. Not Kathmandu: the
// capital sits well east of centre, so anchoring the glow there would light the
// wrong half of the country.
const NEPAL_CENTER = { lat: 28.4, lon: 84.1 };

// Cities with large Nepali diaspora communities — the arcs' origins.
const CITIES = [
  { name: "Doha", lat: 25.2854, lon: 51.531 },
  { name: "Dubai", lat: 25.2048, lon: 55.2708 },
  { name: "Riyadh", lat: 24.7136, lon: 46.6753 },
  { name: "Kuwait City", lat: 29.3759, lon: 47.9774 },
  { name: "Kuala Lumpur", lat: 3.139, lon: 101.6869 },
  { name: "Seoul", lat: 37.5665, lon: 126.978 },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
  { name: "Sydney", lat: -33.8688, lon: 151.2093 },
  { name: "London", lat: 51.5074, lon: -0.1278 },
  { name: "Lisbon", lat: 38.7223, lon: -9.1393 },
  { name: "New York", lat: 40.7128, lon: -74.006 },
  { name: "Dallas", lat: 32.7767, lon: -96.797 },
  { name: "Toronto", lat: 43.6532, lon: -79.3832 },
  { name: "São Paulo", lat: -23.5505, lon: -46.6333 },
  { name: "Johannesburg", lat: -26.2041, lon: 28.0473 },
] as const;

// Scene-local palette, lit for the dark stage but tuned to read as Earth:
// deep ocean blue core, soft green land dots, blue atmosphere. The amber
// arcs/cities and the crimson beacon are stage lighting, not brand tokens —
// same as the hero scene's DARK_POINT (tests/brand/tokens.test.ts pins the
// real tokens).
const OCEAN_BLUE = 0x0d2f55;
const LAND_GREEN = "#8FCF9B";
// Country outlines: a cool light blue that reads as a border at low opacity
// without competing with the amber arcs for attention. Nepal's own outline is
// drawn in amber instead, so the country the page is about is unmistakable.
const BORDER_BLUE = 0x8ab4e8;
const AMBER = "#F2A93B";
const AMBER_HEX = 0xf2a93b;
const BEACON = "#F04C54";

function latLonToVec3(lat: number, lon: number, r: number): Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

/* ---------- canvas textures ---------- */
function discTexture(inner: string): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.4, inner);
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

function glowTexture(rgb: string): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${rgb},0.55)`);
  grad.addColorStop(0.5, `rgba(${rgb},0.12)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

function labelSprite(text: string, accent = false): Sprite {
  const fontSize = 30;
  const pad = 18;
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  const font = `600 ${fontSize}px Inter, 'Noto Sans Devanagari', sans-serif`;
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + pad * 2;
  const h = fontSize + pad * 1.4;
  c.width = w * 2;
  c.height = h * 2;
  g.scale(2, 2);
  g.font = font;
  g.beginPath();
  if (typeof g.roundRect === "function") {
    g.roundRect(1, 1, w - 2, h - 2, h / 2);
  } else {
    g.rect(1, 1, w - 2, h - 2);
  }
  g.fillStyle = "rgba(6,13,26,0.78)";
  g.fill();
  g.strokeStyle = accent ? "rgba(242,169,59,0.55)" : "rgba(255,255,255,0.18)";
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = accent ? AMBER : "rgba(255,255,255,0.92)";
  g.textBaseline = "middle";
  g.fillText(text, pad, h / 2 + 1);
  const tex = new CanvasTexture(c);
  tex.anisotropy = 4;
  const sprite = new Sprite(
    new SpriteMaterial({ map: tex, transparent: true, depthTest: true }),
  );
  const worldH = 0.085;
  sprite.scale.set(worldH * (w / h), worldH, 1);
  return sprite;
}

/* ---------- world dots from the calibrated svg ---------- */
async function loadWorldDots(url: string): Promise<[number, number][]> {
  const text = await (await fetch(url)).text();
  const vb = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(text);
  const W = vb ? parseFloat(vb[1]) : 612;
  const H = vb ? parseFloat(vb[2]) : 344;
  const pts: [number, number][] = [];
  const re = /cx="([\d.]+)" cy="([\d.]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const lon = (parseFloat(m[1]) / W) * 360 - 180;
    const lat = 90 - (parseFloat(m[2]) / H) * 180;
    pts.push([lat, lon]);
  }
  return pts;
}

/* ---------- country borders ---------- */
type Borders = { world: number[][]; nepal: number[][] };

/** Country outlines, generated by scripts/build-globe-borders.mjs from public
 * domain Natural Earth data. Each ring is a flat [lon,lat,lon,lat,…] run, and
 * rings are pre-split at the antimeridian so none of them wraps the globe. */
async function loadBorders(url: string): Promise<Borders> {
  const data = (await (await fetch(url)).json()) as Partial<Borders>;
  return { world: data.world ?? [], nepal: data.nepal ?? [] };
}

/** One LineSegments geometry for a whole set of rings — a single draw call for
 * ~4,000 points, rather than one Line object per country. */
function ringsToSegments(rings: number[][], radius: number): BufferGeometry {
  const verts: number[] = [];
  for (const ring of rings) {
    for (let i = 0; i + 3 < ring.length; i += 2) {
      const a = latLonToVec3(ring[i + 1], ring[i], radius);
      const b = latLonToVec3(ring[i + 3], ring[i + 2], radius);
      verts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(verts), 3));
  return geo;
}

type Arc = {
  curve: QuadraticBezierCurve3;
  lineMat: LineBasicMaterial;
  particles: { sprite: Sprite; t: number; speed: number }[];
  label: Sprite;
  hot: number;
};

function mountGlobe(container: HTMLDivElement): () => void {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;cursor:grab;touch-action:pan-y;";
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 20);
  camera.position.set(0, 0.25, 2.85);
  camera.lookAt(0, 0, 0);

  const globe = new Group();
  scene.add(globe);

  // Atmosphere glow behind the globe.
  const glow = new Sprite(
    new SpriteMaterial({
      map: glowTexture("90,150,220"),
      transparent: true,
      depthWrite: false,
    }),
  );
  glow.scale.set(3.1, 3.1, 1);
  scene.add(glow);

  // Solid core so far-side geometry occludes.
  globe.add(
    new Mesh(
      new SphereGeometry(0.992, 48, 48),
      new MeshBasicMaterial({ color: OCEAN_BLUE }),
    ),
  );

  const ktmPos = latLonToVec3(KTM.lat, KTM.lon, 1.005);
  const dotTexAmber = discTexture(AMBER);

  // Soft amber wash behind Nepal, so the country reads as the subject of the
  // scene from across the globe rather than relying on the beacon and label
  // alone. Deliberately STATIC: the Kathmandu beacon already breathes and
  // pulses a ring, and a second animated highlight in the same few pixels
  // reads as flicker. Added before the border lines so those draw over it.
  const nepalGlow = new Sprite(
    new SpriteMaterial({
      map: glowTexture("242,169,59"),
      transparent: true,
      depthTest: true,
      depthWrite: false,
      opacity: 0.75,
    }),
  );
  nepalGlow.position.copy(
    latLonToVec3(NEPAL_CENTER.lat, NEPAL_CENTER.lon, 1.0015),
  );
  nepalGlow.scale.set(0.42, 0.42, 1);
  globe.add(nepalGlow);

  // Kathmandu — the labeled home beacon.
  const ktmDot = new Sprite(
    new SpriteMaterial({
      map: discTexture(BEACON),
      transparent: true,
      depthTest: true,
    }),
  );
  ktmDot.position.copy(ktmPos);
  ktmDot.scale.set(0.055, 0.055, 1);
  globe.add(ktmDot);

  const ktmRing = new Sprite(
    new SpriteMaterial({
      map: glowTexture("240,76,84"),
      transparent: true,
      depthTest: true,
      depthWrite: false,
    }),
  );
  ktmRing.position.copy(ktmPos);
  globe.add(ktmRing);

  const ktmLabel = labelSprite(`${KTM.np} · Nepal`, true);
  ktmLabel.position.copy(latLonToVec3(KTM.lat + 9, KTM.lon, 1.13));
  globe.add(ktmLabel);

  // City dots + arcs into Kathmandu.
  const arcs: Arc[] = [];
  for (const city of CITIES) {
    const a = latLonToVec3(city.lat, city.lon, 1.002);
    const b = ktmPos.clone();

    const cityDot = new Sprite(
      new SpriteMaterial({
        map: dotTexAmber,
        transparent: true,
        depthTest: true,
        opacity: 0.9,
      }),
    );
    cityDot.position.copy(a);
    cityDot.scale.set(0.028, 0.028, 1);
    globe.add(cityDot);

    const ang = a.angleTo(b);
    const mid = a
      .clone()
      .add(b)
      .normalize()
      .multiplyScalar(1 + 0.12 + 0.3 * (ang / Math.PI));
    const curve = new QuadraticBezierCurve3(a, mid, b);
    const lineGeo = new BufferGeometry().setFromPoints(curve.getPoints(72));
    const lineMat = new LineBasicMaterial({
      color: AMBER_HEX,
      transparent: true,
      opacity: 0.14,
    });
    globe.add(new Line(lineGeo, lineMat));

    const particles: Arc["particles"] = [];
    const count = 1 + (ang > 1.2 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const p = new Sprite(
        new SpriteMaterial({
          map: dotTexAmber,
          transparent: true,
          depthTest: true,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      );
      p.scale.set(0.045, 0.045, 1);
      globe.add(p);
      particles.push({ sprite: p, t: Math.random(), speed: 0.1 + Math.random() * 0.05 });
    }

    const label = labelSprite(city.name);
    label.position.copy(latLonToVec3(city.lat + 7, city.lon, 1.1));
    label.visible = false;
    globe.add(label);

    arcs.push({ curve, lineMat, particles, label, hot: 0 });
  }

  // Dotted continents, loaded async — everything else renders immediately.
  let dotGeo: BufferGeometry | null = null;
  let disposed = false;
  void loadWorldDots("/assets/world-map.svg").then((dots) => {
    if (disposed || dots.length === 0) return;
    const pos = new Float32Array(dots.length * 3);
    dots.forEach(([lat, lon], i) => {
      const v = latLonToVec3(lat, lon, 1);
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
    });
    dotGeo = new BufferGeometry();
    dotGeo.setAttribute("position", new BufferAttribute(pos, 3));
    globe.add(
      new Points(
        dotGeo,
        new PointsMaterial({
          size: 0.012,
          sizeAttenuation: true,
          map: discTexture(LAND_GREEN),
          color: 0x8fa6cb,
          transparent: true,
          opacity: 0.75,
          alphaTest: 0.1,
          depthWrite: false,
        }),
      ),
    );
  })
    // Same reasoning as the borders below: decorative, so a failed fetch must
    // not surface as an unhandled rejection. Pre-existing, fixed here rather
    // than guarding one of two identical loaders in the same function.
    .catch(() => {});

  // Country outlines over the dot grid, so the geography is readable rather
  // than impressionistic: coastlines double as continent edges, and Nepal's own
  // border is drawn in amber at a slightly larger radius so it sits above the
  // shared India/China frontier lines instead of z-fighting them.
  void loadBorders("/assets/globe-borders.json")
    .then((borders) => {
      if (disposed) return;
      if (borders.world.length > 0) {
        globe.add(
          new LineSegments(
            ringsToSegments(borders.world, 1.001),
            new LineBasicMaterial({
              color: BORDER_BLUE,
              transparent: true,
              opacity: 0.28,
              depthWrite: false,
            }),
          ),
        );
      }
      if (borders.nepal.length > 0) {
        globe.add(
          new LineSegments(
            ringsToSegments(borders.nepal, 1.0035),
            new LineBasicMaterial({
              color: AMBER_HEX,
              transparent: true,
              opacity: 0.95,
              depthWrite: false,
            }),
          ),
        );
      }
    })
    // Every overlay here is decorative: the ocean sphere, arcs, city dots and
    // the Kathmandu beacon are already on screen, so a missing or malformed
    // asset should cost the borders and nothing else. Without this, a 404, an
    // offline load or a truncated JSON body becomes an unhandled rejection.
    .catch(() => {});

  // Initial orientation: Kathmandu front-and-center.
  const home = latLonToVec3(KTM.lat, KTM.lon, 1);
  let rotY = Math.atan2(home.x, home.z) + 0.35;
  let rotX = 0.12;
  let targetRotY = rotY;
  let targetRotX = rotX;
  globe.rotation.set(rotX, rotY, 0);

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // Drag to rotate.
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let lastInteract = 0;
  const el = renderer.domElement;
  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    el.style.cursor = "grabbing";
    el.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    targetRotY += (e.clientX - lastX) * 0.005;
    targetRotX = Math.max(
      -0.6,
      Math.min(0.6, targetRotX + (e.clientY - lastY) * 0.003),
    );
    lastX = e.clientX;
    lastY = e.clientY;
    lastInteract = performance.now();
  };
  const endDrag = () => {
    dragging = false;
    el.style.cursor = "grab";
    lastInteract = performance.now();
  };
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", endDrag);
  el.addEventListener("pointercancel", endDrag);

  // Spotlight cycle: one arc at a time brightens and shows its city label.
  let spotIdx = -1;
  function spotlight() {
    if (spotIdx >= 0) arcs[spotIdx].label.visible = false;
    spotIdx = (spotIdx + 1) % arcs.length;
    const arc = arcs[spotIdx];
    arc.hot = 1;
    arc.label.visible = true;
    arc.particles.forEach((p, i) => {
      p.t = -0.08 * i;
    });
  }
  spotlight();
  const spotTimer = window.setInterval(spotlight, 4600);

  // Pause offscreen.
  let visible = true;
  const io = new IntersectionObserver(
    (es) => {
      visible = es[0].isIntersecting;
    },
    { threshold: 0.05 },
  );
  io.observe(container);

  function frame(dt: number, t: number) {
    if (!dragging && performance.now() - lastInteract > 2500) {
      targetRotY += 0.055 * dt; // slow spin
    }
    rotY += (targetRotY - rotY) * Math.min(1, dt * 5);
    rotX += (targetRotX - rotX) * Math.min(1, dt * 5);
    globe.rotation.y = rotY;
    globe.rotation.x = rotX;

    // Home beacon breathing.
    const breathe = 1 + 0.18 * Math.sin(t * 2.2);
    ktmDot.scale.set(0.055 * breathe, 0.055 * breathe, 1);
    const ringT = (t % 2.4) / 2.4;
    ktmRing.scale.set(0.1 + ringT * 0.45, 0.1 + ringT * 0.45, 1);
    ktmRing.material.opacity = 0.65 * (1 - ringT);

    for (const arc of arcs) {
      arc.hot = Math.max(0, arc.hot - dt * 0.35);
      arc.lineMat.opacity = 0.14 + arc.hot * 0.45;
      for (const p of arc.particles) {
        p.t += p.speed * dt * (1 + arc.hot * 0.6);
        if (p.t >= 1) p.t -= 1 + Math.random() * 0.4;
        if (p.t < 0) {
          p.sprite.material.opacity = 0;
          continue;
        }
        // easeInOutQuad along the curve.
        const e = p.t < 0.5 ? 2 * p.t * p.t : 1 - Math.pow(-2 * p.t + 2, 2) / 2;
        p.sprite.position.copy(arc.curve.getPoint(e));
        const edge = Math.min(p.t, 1 - p.t);
        p.sprite.material.opacity =
          Math.min(1, edge * 10) * (0.55 + arc.hot * 0.45);
      }
    }
    renderer.render(scene, camera);
  }

  let prev = performance.now() / 1000;
  let raf = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    const now = performance.now() / 1000;
    let dt = now - prev;
    prev = now;
    if (!visible) return;
    if (dt > 0.1) dt = 0.1;
    frame(dt, now);
  }
  loop();

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    window.clearInterval(spotTimer);
    io.disconnect();
    ro.disconnect();
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", endDrag);
    el.removeEventListener("pointercancel", endDrag);
    // Free GPU resources: every material/texture/geometry created above.
    scene.traverse((obj) => {
      if (obj instanceof Mesh || obj instanceof Points || obj instanceof Line) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (!Array.isArray(mat)) mat.dispose();
      }
      if (obj instanceof Sprite) {
        obj.material.map?.dispose();
        obj.material.dispose();
      }
    });
    dotGeo?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

export default function GlobeScene() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    return mountGlobe(container);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="absolute inset-0 animate-in fade-in duration-700"
    />
  );
}
