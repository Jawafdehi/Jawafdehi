// WebGL hero scene — the Nepal map rendered as a living particle field.
//
// LAZY-LOADED ONLY. This module (and through it all of three.js and
// @react-three/fiber) must never be statically imported: the initial-payload
// budget (scripts/bundle-budget.mjs) has no room for it.
// `hero.tsx` mounts it via React.lazy inside a client-only, idle-time gate
// that also checks WebGL support and prefers-reduced-motion.
//
// The scene samples the existing `/assets/map*.svg` backdrop into ~2.5K
// particle positions, then animates them from a loose scatter into the map
// silhouette — scattered fragments assembling into a documented archive.
// Colors come from the brand tokens only: navy #0E1F3B dominant with sparse
// crimson #B5242C accents (a lighter slate stands in for navy on the dark
// theme, where near-black points would vanish).
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Group,
  NormalBlending,
  PerspectiveCamera,
  ShaderMaterial,
} from "three";

const DARK_POINT = "#8FA6CB"; // brand navy raised for dark backgrounds

/** Resolve a CSS brand token (an `H S% L%` triplet) into a three.js Color.
 * The hex values are documented once, in src/index.css — reading the token at
 * runtime is what keeps this module from hardcoding a duplicate
 * (tests/brand/tokens.test.ts enforces exactly that). */
function tokenColor(token: string, fallbackHsl: string): Color {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const m = /^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/.exec(raw);
  const [h, s, l] = m ? [m[1], m[2], m[3]] : fallbackHsl.split(" ");
  return new Color(`hsl(${h}, ${s}%, ${l}%)`);
}

const navyColor = () => tokenColor("--primary", "217 62 14");
const crimsonColor = () => tokenColor("--accent", "357 67 43");

const ACCENT_RATIO = 0.045; // sparse crimson — reserved, draws the eye
const WORLD_WIDTH = 48;
const INTRO_SECONDS = 2.4;

type HeroSceneProps = {
  /** Map asset to sample for particle positions. */
  mapSrc: string;
  /** Dark theme active — swaps the base point color. */
  dark: boolean;
  /** Full-bleed "stage" pose (homepage Option A): the field is tilted back
   * like a floor beneath the centered content, and scroll scrubs extra tilt,
   * sink, and fade so leaving the hero feels like a camera move. */
  stage?: boolean;
  /** Scroll progress 0..1 written by the hero's scroll listener. A mutable
   * ref, not state, read once per frame — scrolling never re-renders R3F. */
  scrollRef?: { current: number };
  /** Fired once particle positions are sampled and the field is visible. */
  onReady?: () => void;
};

type SampledField = {
  positions: Float32Array;
  scatter: Float32Array;
  seeds: Float32Array;
  accents: Float32Array;
  count: number;
  /** Height of the sampled silhouette in world units (width is WORLD_WIDTH). */
  worldHeight: number;
};

/** Rasterize the map SVG offscreen and sample opaque pixels as world-space
 * particle targets. Returns null when the asset yields no usable pixels. */
function sampleMap(img: HTMLImageElement, maxPoints: number): SampledField | null {
  const W = 240;
  const aspect = img.naturalHeight / img.naturalWidth || 0.6;
  const H = Math.max(1, Math.round(W * aspect));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);

  const cells: number[] = [];
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (data[(y * W + x) * 4 + 3] > 40) cells.push(y * W + x);
    }
  }
  if (cells.length === 0) return null;

  // Fisher–Yates so a truncated take is a uniform sample of the silhouette.
  for (let i = cells.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  const count = Math.min(maxPoints, cells.length);
  const worldH = (H / W) * WORLD_WIDTH;
  const positions = new Float32Array(count * 3);
  const scatter = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const accents = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const cell = cells[i];
    const px = cell % W;
    const py = Math.floor(cell / W);
    const jitter = () => (Math.random() - 0.5) * (WORLD_WIDTH / W);
    positions[i * 3] = (px / W - 0.5) * WORLD_WIDTH + jitter();
    positions[i * 3 + 1] = (0.5 - py / H) * worldH + jitter();
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1.6;

    // Intro origin: a wide, shallow cloud around the map.
    scatter[i * 3] = positions[i * 3] * (1.8 + Math.random() * 1.4);
    scatter[i * 3 + 1] = positions[i * 3 + 1] * (1.8 + Math.random() * 1.4) + (Math.random() - 0.5) * 10;
    scatter[i * 3 + 2] = (Math.random() - 0.5) * 26;

    seeds[i] = Math.random();
    accents[i] = Math.random() < ACCENT_RATIO ? 1 : 0;
  }

  return { positions, scatter, seeds, accents, count, worldHeight: worldH };
}

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uFade;
  uniform vec2 uParallax;
  uniform float uPixelRatio;
  attribute vec3 aScatter;
  attribute float aSeed;
  attribute float aAccent;
  varying float vAccent;
  varying float vAlpha;

  void main() {
    // Per-point stagger keeps the assembly organic instead of a lockstep tween.
    float local = clamp(uProgress * (1.15 + aSeed * 0.5) - aSeed * 0.3, 0.0, 1.0);
    float eased = 1.0 - pow(1.0 - local, 3.0);
    vec3 pos = mix(aScatter, position, eased);

    pos.x += sin(uTime * 0.32 + aSeed * 31.0) * 0.34;
    pos.y += cos(uTime * 0.27 + aSeed * 47.0) * 0.30;
    pos.xy += uParallax * (0.6 + aSeed * 0.9);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float size = (1.5 + aSeed * 2.1) * (aAccent > 0.5 ? 2.1 : 1.0);
    gl_PointSize = size * uPixelRatio * (120.0 / -mv.z);

    float twinkle = 0.7 + 0.3 * sin(uTime * (0.5 + aSeed * 1.3) + aSeed * 40.0);
    vAccent = aAccent;
    vAlpha = mix(0.12, twinkle, eased) * uFade;
  }
`;

const FRAGMENT = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform vec3 uAccentColor;
  varying float vAccent;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.14, d) * vAlpha;
    if (a < 0.01) discard;
    vec3 c = mix(uColor, uAccentColor, vAccent);
    gl_FragColor = vec4(c, a);
  }
`;

/** Back the camera off until the entire silhouette fits the canvas — with
 * margin for drift and parallax. The scene used to live in a full-bleed
 * backdrop wider than the map; inside the hero's navy panel the container can
 * be any aspect, so a fixed camera distance would crop the map (the exact
 * complaint the redesign fixes). Re-runs on resize. */
function CameraFit({ worldHeight, margin = 1.14 }: Readonly<{ worldHeight: number; margin?: number }>) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const aspect = size.width / Math.max(1, size.height);
    const halfTan = Math.tan((camera.fov * Math.PI) / 360);
    // Default 1.14: headroom for drift (±0.34) and parallax (±1.5). The
    // full-bleed stage passes a tighter margin — the tilt already pulls the
    // silhouette's projected height in, and a slight overfill is the point.
    const zForWidth = (WORLD_WIDTH * margin) / 2 / (halfTan * aspect);
    const zForHeight = (worldHeight * margin) / 2 / halfTan;
    camera.position.z = Math.max(zForWidth, zForHeight);
    camera.updateProjectionMatrix();
  }, [camera, size, worldHeight, margin]);

  return null;
}

function ParticleField({ mapSrc, dark, stage = false, scrollRef, onReady }: Readonly<HeroSceneProps>) {
  const [field, setField] = useState<SampledField | null>(null);
  const groupRef = useRef<Group>(null);
  const readyFired = useRef(false);
  const progress = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const parallax = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (!alive) return;
      const maxPoints = window.innerWidth < 768 ? 1400 : 2600;
      setField(sampleMap(img, maxPoints));
    };
    img.src = mapSrc;
    return () => {
      alive = false;
    };
  }, [mapSrc]);

  // The canvas is pointer-events-none (it is decoration under the readability
  // wash), so parallax input comes from the window, not from R3F events.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: NormalBlending,
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uFade: { value: 1 },
          uParallax: { value: [0, 0] },
          uPixelRatio: { value: 1 },
          uColor: { value: navyColor() },
          uAccentColor: { value: crimsonColor() },
        },
      }),
    [],
  );

  useEffect(() => {
    material.uniforms.uColor.value = dark ? new Color(DARK_POINT) : navyColor();
    material.blending = dark ? AdditiveBlending : NormalBlending;
    material.needsUpdate = true;
  }, [dark, material]);

  useEffect(() => () => material.dispose(), [material]);

  const geometry = useMemo(() => {
    if (!field) return null;
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(field.positions, 3));
    geo.setAttribute("aScatter", new BufferAttribute(field.scatter, 3));
    geo.setAttribute("aSeed", new BufferAttribute(field.seeds, 1));
    geo.setAttribute("aAccent", new BufferAttribute(field.accents, 1));
    return geo;
  }, [field]);

  useEffect(() => () => geometry?.dispose(), [geometry]);

  useEffect(() => {
    if (field && onReady && !readyFired.current) {
      readyFired.current = true;
      onReady();
    }
  }, [field, onReady]);

  useFrame((state, delta) => {
    const clamped = Math.min(delta, 0.05); // tab-restore spikes must not teleport
    material.uniforms.uTime.value += clamped;
    progress.current = Math.min(1, progress.current + clamped / INTRO_SECONDS);
    material.uniforms.uProgress.value = progress.current;
    material.uniforms.uPixelRatio.value = state.gl.getPixelRatio();

    const p = parallax.current;
    p.x += (pointer.current.x * 0.9 - p.x) * Math.min(1, clamped * 3);
    p.y += (-pointer.current.y * 0.6 - p.y) * Math.min(1, clamped * 3);
    material.uniforms.uParallax.value = [p.x, p.y];

    // The stage pose: a resting tilt reads as a floor beneath the centered
    // content; scroll (0..1 over roughly one viewport) scrubs extra tilt,
    // sink, and fade, so leaving the hero plays as one continuous camera
    // move. Reduced-motion never gets here — the gate blocks the scene.
    if (stage && groupRef.current && field) {
      const s = Math.min(1, Math.max(0, scrollRef?.current ?? 0));
      const g = groupRef.current;
      g.rotation.x = -(0.46 + s * 0.42);
      g.position.y = -field.worldHeight * (0.12 + s * 0.38);
      g.position.z = -s * 7;
      material.uniforms.uFade.value = 1 - s * 0.85;
    }
  });

  if (!geometry || !field) return null;
  return (
    <>
      <CameraFit worldHeight={field.worldHeight} margin={stage ? 1.02 : 1.14} />
      <group ref={groupRef}>
        <points geometry={geometry} material={material} />
      </group>
    </>
  );
}

export default function HeroScene({ mapSrc, dark, stage, scrollRef, onReady }: Readonly<HeroSceneProps>) {
  return (
    <Canvas
      aria-hidden="true"
      className="pointer-events-none"
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 40], fov: 42 }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <ParticleField mapSrc={mapSrc} dark={dark} stage={stage} scrollRef={scrollRef} onReady={onReady} />
    </Canvas>
  );
}
