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

## Next
- [ ] Re-run full `bun run test` suite after token fix (was 682/683 with only the brand test failing pre-fix)
- [ ] Social sharing: OG + Twitter Card meta (bilingual-aware), verify tags in BUILT html
- [ ] Branded 1200×630 og-image (navy #0E1F3B / crimson #B5242C), wired through SSR/prerender
- [ ] Consider a layout test asserting the 3D chunk stays out of initial payload
- [ ] Open PR when checks are green

## Notes
- THREE.Clock deprecation warning comes from @react-three/fiber v8 internals — harmless, not ours to fix
- Bundle headroom is ~1.4 KB gzip; any addition to the initial payload will trip CI. Everything new must be deferred
