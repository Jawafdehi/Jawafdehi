// SPDX-License-Identifier: Hippocratic-3.0
// The in-page probe, as a string so it can be handed to page.evaluate() from
// several drivers. Kept separate from the driver so the false-positive rules
// live in one place.
//
// Design rules learned the hard way on the first pass:
//   * An element wider than the viewport is NOT a defect if any ancestor clips
//     (overflow-x: hidden/clip) or scrolls it. Only report offenders that
//     actually make the document horizontally scrollable.
//   * A 1x1 or clip-path-hidden element is a visually-hidden skip link, not a
//     tap target.
//   * WCAG 2.2 SC 2.5.8 (AA) is 24x24 CSS px WITH a spacing exception and an
//     inline-in-sentence exception. Report the exception status, not a bare
//     size, or the finding list fills with links that actually conform.
export const PROBE = (requestedWidth) => {
  // ⚠️ `window.innerWidth` is NOT the width you asked for. With Chromium's
  // mobile emulation (isMobile: true), content wider than the layout viewport
  // makes the browser SHRINK THE PAGE TO FIT and report the inflated width —
  // real Android Chrome does the same. So `scrollWidth > innerWidth` reads 0
  // overflow on a page that is, in fact, overflowing and being zoomed out.
  // Measured on jawafdehi.org: /report at a requested 360 reports innerWidth
  // 425, /donate at 320 reports 414 (a ~29% zoom-out), and both looked clean.
  // Always compare against the REQUESTED width, and treat any innerWidth >
  // requested as the overflow signal in its own right.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const want = requestedWidth || vw;
  const docSW = document.documentElement.scrollWidth;
  const shrinkToFit = Math.max(0, vw - want);
  const out = {
    viewport: { w: vw, h: vh },
    requestedWidth: want,
    shrinkToFitPx: shrinkToFit,
    zoomedOutPct: want ? Math.round((shrinkToFit / want) * 100) : 0,
    scrollWidth: docSW,
    // overflow against the width the device actually has
    overflowPx: Math.max(0, docSW - want),
    innerWidthOverflowPx: Math.max(0, docSW - vw),
    horizontallyScrollable: docSW > vw + 1,
    overflow: [],
    clippedButOversize: 0,
    tapTargets: [],
    zoomInputs: [],
    tinyText: [],
    vhTraps: [],
    fixed: [],
    stickyHeaderPx: 0,
    foldWaste: null,
    stats: {},
  };

  const sel = (el) => {
    const parts = [];
    let n = el;
    for (let d = 0; n && n.nodeType === 1 && d < 4; d++, n = n.parentElement) {
      let s = n.tagName.toLowerCase();
      if (n.id && !/^:r/.test(n.id)) { parts.unshift(`${s}#${n.id}`); break; }
      const cls = (n.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean).slice(0, 5).join(".");
      if (cls) s += "." + cls;
      parts.unshift(s);
    }
    return parts.join(" > ");
  };
  const txt = (el) => (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 90);
  const vis = (el, r) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse") return false;
    if (parseFloat(cs.opacity) === 0) return false;
    return r.width > 0 && r.height > 0;
  };
  // sr-only / visually-hidden: 1px box, inset clip-path, or legacy clip rect.
  const srOnly = (el, r) => {
    const cs = getComputedStyle(el);
    if (r.width <= 1 || r.height <= 1) return true;
    if (cs.clipPath && cs.clipPath !== "none" && /inset\(\s*50%/.test(cs.clipPath)) return true;
    if (cs.clip && /rect\(0/.test(cs.clip)) return true;
    return false;
  };
  // nearest ancestor that clips or scrolls horizontally
  const clipper = (el) => {
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === "hidden" || ox === "clip" || ox === "auto" || ox === "scroll") return { el: n, overflowX: ox };
    }
    return null;
  };

  const all = Array.from(document.querySelectorAll("*"));
  out.stats.elements = all.length;

  // --- 1. horizontal overflow, attributed only to unclipped offenders --------
  const marked = new WeakSet();
  for (const el of all) {
    if (el === document.body || el === document.documentElement) continue;
    const r = el.getBoundingClientRect();
    if (!vis(el, r)) continue;
    const over = Math.round(r.right - want);
    if (over <= 1) continue;
    const c = clipper(el);
    if (c) { out.clippedButOversize++; continue; }          // harmless: clipped/scrolled
    let ancestorMarked = false;
    for (let n = el.parentElement; n; n = n.parentElement) if (marked.has(n)) { ancestorMarked = true; break; }
    if (ancestorMarked) continue;
    marked.add(el);
    const cs = getComputedStyle(el);
    out.overflow.push({
      sel: sel(el), text: txt(el), tag: el.tagName.toLowerCase(),
      rect: { x: Math.round(r.x), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) },
      overRightPx: over,
      minContentPx: (() => { const prev = el.style.width; el.style.width = "min-content"; const w = Math.round(el.getBoundingClientRect().width); el.style.width = prev; return w; })(),
      cs: { position: cs.position, display: cs.display, width: cs.width, minWidth: cs.minWidth, whiteSpace: cs.whiteSpace, wordBreak: cs.wordBreak, overflowWrap: cs.overflowWrap, marginLeft: cs.marginLeft, marginRight: cs.marginRight, flexShrink: cs.flexShrink },
    });
  }
  out.overflow.sort((a, b) => b.overRightPx - a.overRightPx);
  out.overflow = out.overflow.slice(0, 20);

  // --- 2. tap targets, with the real 2.5.8 exceptions ------------------------
  const INTERACTIVE = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=tab], [role=checkbox], [role=switch], [role=menuitem], [role=option], [tabindex]:not([tabindex="-1"])';
  const cands = [];
  for (const el of document.querySelectorAll(INTERACTIVE)) {
    const r = el.getBoundingClientRect();
    if (!vis(el, r)) continue;
    if (srOnly(el, r)) continue;
    if (el.closest("[aria-hidden=true]")) continue;
    cands.push({ el, r, cs: getComputedStyle(el) });
  }
  out.stats.interactive = cands.length;

  // inline-in-sentence exception: an <a> laid out inline whose parent block
  // carries meaningfully more text than the link itself.
  const inlineInSentence = (c) => {
    if (c.el.tagName !== "A") return false;
    if (!/^inline/.test(c.cs.display)) return false;
    const p = c.el.parentElement;
    if (!p) return false;
    const pt = (p.innerText || "").trim().length, lt = (c.el.innerText || "").trim().length;
    return pt > lt + 15;
  };
  // spacing exception: a 24px circle centred on the target must not intersect
  // the 24px circle of any other target.
  const spacingOk = (c) => {
    const cx = c.r.left + c.r.width / 2, cy = c.r.top + c.r.height / 2;
    for (const o of cands) {
      if (o === c) continue;
      if (o.el.contains(c.el) || c.el.contains(o.el)) continue;
      const ox = o.r.left + o.r.width / 2, oy = o.r.top + o.r.height / 2;
      if (Math.hypot(cx - ox, cy - oy) < 24) return false;
    }
    return true;
  };

  for (const c of cands) {
    const min = Math.min(c.r.width, c.r.height);
    if (min >= 44) continue;
    const inline = inlineInSentence(c);
    const spaced = min < 24 ? spacingOk(c) : true;
    let verdict;
    if (min < 24 && !inline && !spaced) verdict = "FAIL_wcag258_AA";
    else if (min < 24 && (inline || spaced)) verdict = "pass_wcag258_via_exception";
    else verdict = "below_44_advisory";
    out.tapTargets.push({
      sel: sel(c.el), text: txt(c.el), tag: c.el.tagName.toLowerCase(),
      role: c.el.getAttribute("role") || null,
      aria: c.el.getAttribute("aria-label") || null,
      w: Math.round(c.r.width), h: Math.round(c.r.height), min: Math.round(min),
      display: c.cs.display,
      y: Math.round(c.r.top + window.scrollY),
      inlineExempt: inline, spacingExempt: spaced, verdict,
    });
  }
  const order = { FAIL_wcag258_AA: 0, below_44_advisory: 1, pass_wcag258_via_exception: 2 };
  out.tapTargets.sort((a, b) => order[a.verdict] - order[b.verdict] || a.min - b.min);
  out.tapCounts = out.tapTargets.reduce((m, t) => ((m[t.verdict] = (m[t.verdict] || 0) + 1), m), {});
  out.tapTargets = out.tapTargets.slice(0, 60);

  // --- 3. iOS focus-zoom: any form field under 16px --------------------------
  for (const el of document.querySelectorAll("input:not([type=hidden]), select, textarea")) {
    const r = el.getBoundingClientRect();
    if (!vis(el, r) || srOnly(el, r)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 16) out.zoomInputs.push({ sel: sel(el), tag: el.tagName.toLowerCase(), type: el.getAttribute("type"), fontSize: fs, placeholder: (el.getAttribute("placeholder") || "").slice(0, 60) || null });
  }

  // --- 4. tiny text ---------------------------------------------------------
  const agg = new Map();
  for (const el of all) {
    let direct = "";
    for (const n of el.childNodes) if (n.nodeType === 3) direct += n.nodeValue;
    direct = direct.trim();
    if (direct.length < 3) continue;
    const r = el.getBoundingClientRect();
    if (!vis(el, r) || srOnly(el, r)) continue;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    if (fs >= 12) continue;
    // Devanagari at <12px is materially worse than Latin: conjuncts and matras
    // collapse. Flag the script so the report can separate the two.
    const dev = /[ऀ-ॿ]/.test(direct);
    const key = `${fs}|${sel(el)}|${dev}`;
    if (!agg.has(key)) agg.set(key, { sel: sel(el), fontSize: fs, devanagari: dev, sample: direct.slice(0, 60), count: 0 });
    agg.get(key).count++;
  }
  out.tinyText = Array.from(agg.values()).sort((a, b) => a.fontSize - b.fontSize).slice(0, 25);

  // --- 5. viewport-unit height traps ---------------------------------------
  for (const el of all) {
    const cls = el.getAttribute("class") || "";
    const style = el.getAttribute("style") || "";
    if (!/\b(h|min-h|max-h)-screen\b/.test(cls) && !/\d+vh\b/.test(style) && !/\[\d+vh\]/.test(cls)) continue;
    const r = el.getBoundingClientRect();
    if (!vis(el, r)) continue;
    const h = parseFloat(getComputedStyle(el).height);
    // `min-h-screen` on a container whose content is far taller is inert — the
    // minimum never binds. Only report when the vh value is what sets the size,
    // because that is the case iOS's collapsing toolbar actually breaks.
    const binding = Math.abs(h - vh) < 4 || /\b(h|max-h)-screen\b/.test(cls) || /\bheight:\s*\d+vh/.test(style);
    if (!binding) continue;
    out.vhTraps.push({ sel: sel(el), cls: cls.slice(0, 140), computedHeight: h, viewportH: vh, usesDvh: /dvh/.test(cls + style) });
  }
  out.vhTraps = out.vhTraps.slice(0, 15);

  // --- 6. fixed/sticky chrome + how much of the first screen it eats --------
  let stickyTop = 0;
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed" && cs.position !== "sticky") continue;
    const r = el.getBoundingClientRect();
    if (!vis(el, r) || (r.width < 40 && r.height < 40)) continue;
    const rec = { sel: sel(el), position: cs.position, zIndex: cs.zIndex, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, viewportPct: Math.round((r.width * r.height) / (vw * vh) * 100) };
    out.fixed.push(rec);
    if (r.top <= 1 && r.height > stickyTop && r.width > vw * 0.6) stickyTop = r.height;
  }
  out.stickyHeaderPx = Math.round(stickyTop);
  out.fixed = out.fixed.slice(0, 15);
  if (stickyTop) out.foldWaste = { stickyHeaderPx: Math.round(stickyTop), pctOfFirstScreen: Math.round((stickyTop / vh) * 100) };

  // --- 7. anchor targets vs the sticky header (jump links hide their heading)
  const anchored = [];
  for (const a of document.querySelectorAll('a[href^="#"]')) {
    const id = a.getAttribute("href").slice(1);
    if (!id) continue;
    const t = document.getElementById(id);
    if (!t) continue;
    const sm = parseFloat(getComputedStyle(t).scrollMarginTop) || 0;
    anchored.push({ href: "#" + id, targetSel: sel(t), scrollMarginTop: sm, obscuredBy: Math.max(0, Math.round(stickyTop - sm)) });
  }
  out.anchorTargets = anchored.filter((a) => a.obscuredBy > 4).slice(0, 15);

  return out;
};
