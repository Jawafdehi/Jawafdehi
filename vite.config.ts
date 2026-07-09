import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "node:fs";
import { componentTagger } from "lovable-tagger";
import type { PluginOption } from "vite";

// Bundle-treemap plugin, loaded ONLY when ANALYZE=true. Kept as an optional
// dynamic import (not a top-level import) so the dependency need not be present
// in the production lockfile — a normal `bun install && vite build` must not
// hard-fail if rollup-plugin-visualizer isn't installed.
async function analyzePlugin(): Promise<PluginOption | null> {
  if (process.env.ANALYZE !== "true") return null;
  try {
    const { visualizer } = await import("rollup-plugin-visualizer");
    return visualizer({
      filename: "dist/stats.html",
      template: "treemap",
      gzipSize: true,
      brotliSize: true,
    }) as PluginOption;
  } catch {
    console.warn(
      "[vite] ANALYZE=true but rollup-plugin-visualizer is not installed; " +
        "run `bun add -d rollup-plugin-visualizer` first.",
    );
    return null;
  }
}

function serveGeneratedSearchIndex() {
  return {
    name: "serve-generated-search-index",
    configureServer(server) {
      server.middlewares.use("/search-index.json", (_req, res, next) => {
        const candidates = [
          path.resolve(__dirname, "dist/search-index.json"),
          path.resolve(__dirname, "dist/client/search-index.json"),
        ];
        const searchIndexPath = candidates.find((candidate) => fs.existsSync(candidate));

        if (!searchIndexPath) {
          next();
          return;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(fs.readFileSync(searchIndexPath));
      });
    },
  };
}

const DOCUMENT_PREVIEW_ALLOWED_HOSTS = new Set([
  "ngm-store.jawafdehi.org",
  "s3.jawafdehi.org",
]);

function getPreviewFilename(targetUrl: URL): string {
  const lastSegment = targetUrl.pathname.split("/").filter(Boolean).pop();
  return lastSegment ? decodeURIComponent(lastSegment).replace(/["\\]/g, "") : "document";
}

function serveDocumentPreview() {
  return {
    name: "serve-document-preview",
    configureServer(server) {
      server.middlewares.use("/document-preview", async (req, res) => {
        try {
          const requestUrl = new URL(req.url || "", "http://localhost");
          const target = requestUrl.searchParams.get("url");

          if (!target) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "Missing document URL" }));
            return;
          }

          const targetUrl = new URL(target);

          if (targetUrl.protocol !== "https:" || !DOCUMENT_PREVIEW_ALLOWED_HOSTS.has(targetUrl.hostname)) {
            res.statusCode = 403;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "Document host is not allowed" }));
            return;
          }

          const upstream = await fetch(targetUrl, {
            headers: {
              Accept: "application/pdf,text/markdown,text/plain,*/*",
            },
          });

          res.statusCode = upstream.status;
          res.setHeader("Content-Type", upstream.headers.get("Content-Type") || "application/octet-stream");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Cache-Control", upstream.ok ? "public, max-age=3600" : "no-store");

          const contentLength = upstream.headers.get("Content-Length");
          if (contentLength) res.setHeader("Content-Length", contentLength);

          if (requestUrl.searchParams.get("download") === "1") {
            res.setHeader("Content-Disposition", `attachment; filename="${getPreviewFilename(targetUrl)}"`);
          }

          const body = upstream.body;
          if (!body) {
            res.end();
            return;
          }

          const reader = body.getReader();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }

          res.end();
        } catch {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: "Failed to fetch document" }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(async ({ mode, isSsrBuild }) => {
  const isSSR = isSsrBuild || process.env.SSR === 'true';
  // Only meaningful for the client build; ANALYZE writes dist/stats.html.
  const analyze = !isSSR ? await analyzePlugin() : null;

  return {
    server: {
      // Loopback by default (reached via SSH port-forward of this single port).
      // In compose, set VITE_DEV_HOST=0.0.0.0 so the port is reachable from the
      // host across the container boundary.
      host: process.env.VITE_DEV_HOST || "127.0.0.1",
      port: 40114,
      strictPort: true,
      // Same-origin /api, /static, /media -> the Think-Big monolith (the
      // consolidated backend that serves unified search AND the per-app APIs like
      // /api/cases/ used to hydrate result cards). One target, env-overridable so
      // the same config works on the host (default :48000) and inside compose
      // (VITE_API_PROXY_TARGET=http://platform:8080).
      //
      // NOTE: /admin is intentionally NOT proxied — the React admin panel (this
      // SPA) owns /admin/*. Django's own admin lives at /django-admin/ (see the
      // monolith's config/urls.py) and is proxied below. The admin panel talks to
      // the backend only via /api (NES at /api/nes, NGM at /api/ngm).
      proxy: (() => {
        const apiTarget =
          process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:48000";
        const proxyOpts = { target: apiTarget, changeOrigin: true };
        return {
          "/api": proxyOpts,
          // Legacy host-root NES/NGM prefixes (pre-renamespace); harmless to keep
          // proxied for any client still resolving an old /nes or /ngm base.
          "/nes": proxyOpts,
          "/ngm": proxyOpts,
          // Django's built-in admin (relocated off /admin so the SPA can own it).
          "/django-admin": proxyOpts,
          // Django/WhiteNoise static (admin CSS etc.) lives under /static.
          "/static": proxyOpts,
          // Wagtail-managed media (uploaded images/renditions, documents).
          "/media": proxyOpts,
        };
      })(),
    },
    plugins: [
      react(),
      mode === "development" && serveDocumentPreview(),
      mode === "development" && serveGeneratedSearchIndex(),
      mode === "development" && componentTagger(),
      // Bundle treemap for the client build (opt-in via ANALYZE=true). See
      // analyzePlugin above — dynamically imported so it need not be in the
      // production lockfile.
      analyze,
      // Google Analytics is loaded at runtime only after the visitor opts in
      // via the cookie consent banner (see src/lib/ga.ts). Do not inject a GA
      // tag here — doing so would load analytics before consent.
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: isSSR
      ? {
          outDir: "dist/server",
          ssr: true,
          rollupOptions: {
            input: "src/entry-server.tsx",
          },
        }
      : {
          outDir: "dist/client",
          rollupOptions: {
            input: "index.html",
            output: {
              // Split large, stable vendor deps into their own long-cached
              // chunks so an app-code change doesn't bust the whole vendor
              // cache, and so the entry chunk shrinks. Grouped by
              // change-cadence: the React runtime rarely moves; Radix/UI and
              // data/i18n libs move independently of app code.
              manualChunks: {
                "react-vendor": ["react", "react-dom", "react-router-dom"],
                query: ["@tanstack/react-query", "axios"],
                i18n: [
                  "i18next",
                  "react-i18next",
                  "i18next-browser-languagedetector",
                ],
                // The markdown rendering stack (react-markdown + remark/rehype +
                // the micromark/mdast/hast transitive tree — ~250 modules) is
                // only used to render case descriptions on CaseDetail. That page
                // is pre-rendered, so it must stay an eager import (a lazy()
                // boundary would pre-render as the Suspense fallback and ship
                // empty HTML). Isolating the stack here keeps it in its own
                // long-cached chunk instead of bloating the shared entry chunk.
                markdown: [
                  "react-markdown",
                  "remark-gfm",
                  "rehype-raw",
                ],
              },
            },
          },
        },
  };
});
