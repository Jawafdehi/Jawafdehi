# feature/three-hero — task tracker

## Done
- [x] Branch `feature/three-hero` off main
- [x] Deps pinned: `three@0.185.1`, `@react-three/fiber@8.18.0` (React 18 line), `@types/three@0.185.4`. drei skipped — custom shader needs nothing from it
- [x] `src/components/home/hero-scene.tsx` — Nepal map sampled from `/assets/map-light.svg` into a ~1.4K (phone) / ~2.6K (desktop) particle field; staggered scatter→map assembly intro, ambient drift, twinkle, pointer parallax; brand colors read from CSS tokens at runtime (`--primary` navy, `--accent` crimson, ~4.5% crimson accents)
- [x] `src/components/home/hero-scene-gate.tsx` — tiny static gate: SSR-safe mount, WebGL probe, prefers-reduced-motion respect, requestIdleCallback deferral. Any gate failing leaves the static map backdrop as the rendering
- [x] `hero.tsx` wiring — canvas layer shares the map layer's exact geometry classes; static map settles to low opacity (never unmounts) once particles are live
- [x] Fixed React 18 `fetchPriority` console error on the hero map imgs (lowercase DOM attribute)
- [x] Brand-token test satisfied — no hardcoded brand hex; tokens resolved at runtime
- [x] Verified: `bun run lint` ✓, `bun run build` ✓ (SSR + prerender + sitemap), `node scripts/bundle-budget.mjs` ✓ — initial 643.1 KB gzip vs 644.5 KB limit; all three.js in deferred chunks
- [x] Playwright screenshots at 1440×900 and 390×844 — composition holds, readability wash keeps copy dominant
- [x] Full `bun run test` suite green — 683/683 after the token fix
- [x] Social sharing audited: repo already ships complete OG + Twitter Card meta via `src/utils/seo.ts` + `<Seo>` + prerender placeholder substitution + edge worker rewrite, with og:locale ne_NP / alternate en_US and `summary_large_image`. Verified present in BUILT `dist/index.html`
- [x] og-image audited: existing `public/assets/social-preview.png` is already on-brand — navy #0E1F3B field, crimson accents, bilingual जवाफदेही/JAWAFDEHI wordmark, 1200×630. No replacement needed
- [x] Hero primary CTAs — crimson "मुद्दा रिपोर्ट गर्नुहोस्" (→ /report) + outline "मुद्दाहरू ब्राउज गर्नुहोस्" (→ /search?type=case), bilingual via existing `header.*` keys; verified desktop + phone, console clean
- [x] Re-verified after CTAs: lint ✓, 683/683 ✓, build ✓, bundle 643.2 KB vs 644.5 KB limit ✓
- [x] CI regression guard: `THREE.WebGLRenderer` added to `MUST_BE_DEFERRED` in scripts/bundle-budget.mjs — a static import of the 3D stack now fails the bundle gate outright

## Next
- [ ] Push branch and open PR when checks are green (blocked: awaiting GitHub SSH key / PAT from user)

## Notes
- THREE.Clock deprecation warning comes from @react-three/fiber v8 internals — harmless, not ours to fix
- Bundle headroom is ~1.4 KB gzip; any addition to the initial payload will trip CI. Everything new must be deferred
