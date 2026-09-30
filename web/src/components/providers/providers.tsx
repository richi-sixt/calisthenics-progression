
"use client";

import { useEffect } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { LanguageProvider } from "@/i18n";
import { QueryProvider } from "./query-provider";

function ThemeWatcher() {
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function onMediaChange() {
      const systemTheme = media.matches ? "dark" : "light";
      if (resolvedTheme === systemTheme) {
        setTheme("system");
      }
    }

    onMediaChange();
    media.addEventListener("change", onMediaChange);

    return () => {
      media.removeEventListener("change", onMediaChange);
    };
  }, [resolvedTheme, setTheme]);

  return null;
}

// next-themes renders an inline <script> that applies the theme before first
// paint. It only needs to run from the server HTML; whenever React creates it
// in the browser instead (e.g. a client-side re-render of the root), React 19
// warns "Encountered a script tag while rendering React component". Marking
// the client-side copy as a data block avoids that warning; the script's
// suppressHydrationWarning (set by next-themes) covers the `type` difference.
const themeScriptProps = typeof window === "undefined" ? undefined : { type: "application/json" };

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ThemeProvider attribute="class" disableTransitionOnChange scriptProps={themeScriptProps}>
        <ThemeWatcher />
        <QueryProvider>{children}</QueryProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
