import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePluginRadar } from "vite-plugin-radar";
import { JAWAFDEHI_GA_MEASUREMENT_ID } from "./src/config/analytics-config";

// https://vitejs.dev/config/
export default defineConfig(({ mode, isSsrBuild }) => {
  const isSSR = isSsrBuild || process.env.SSR === 'true';

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      // Only enable analytics in production with a configured GA ID
      mode === "production" && JAWAFDEHI_GA_MEASUREMENT_ID && VitePluginRadar({
        analytics: {
          id: JAWAFDEHI_GA_MEASUREMENT_ID,
        },
      }),
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
          },
        },
  };
});
