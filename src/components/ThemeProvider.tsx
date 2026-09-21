import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // next-themes 0.3.x renders a <script> client-side that the server pass
  // doesn't emit, breaking React hydration with "Expected server HTML to
  // contain a matching <script> in <div>". Render children plain on the
  // first pass (SSR + first client render) and only mount NextThemesProvider
  // after hydration completes — same markup on both sides, no mismatch.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      themes={["light"]}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
